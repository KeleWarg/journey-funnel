import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Only POST allowed" });
    return;
  }

  try {
    const { 
      steps, 
      E, 
      N_importance, 
      source, 
      c1, c2, c3, 
      w_c, w_f, 
      w_E, w_N, 
      U0, 
      sample_count,
      use_backsolved_constants = false,
      best_k,
      best_gamma_exit,
      include_sample_results = false  // Optional: whether to return all sampled permutations
    } = req.body;

    // We'll perform a simple random‐sampling optimization over "numSamples" permutations.
    const N = steps.length;

    // Helper: a function to shuffle an array copy
    function shuffleArray(arr: any[]) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }

    // Abstraction: run the same per-step simulation logic as /api/calculate,
    // but for a specific order of steps. Updated to match YAML specification:
    function simulateOrder(orderedSteps: any[]) {
      // Source multiplier per YAML
      const sourceMultipliers = {
        paid_search: 1.3,
        paid_social: 1.1,
        organic_search: 1.0,
        direct_referral: 1.0,
        display_email: 0.9,
        social_organic: 0.7,
      };
      const S = sourceMultipliers[source as keyof typeof sourceMultipliers] || 1.0;
      
      // Entry motivation per YAML
      let M_prev = Math.min(5, (w_E * E + w_N * N_importance) * S);

      // Constants per YAML specification - use backsolved values if provided
      const k = (use_backsolved_constants && best_k) ? best_k : 0.24; // motivation decay constant
      
      // Default gamma_exit by funnel length per YAML - use backsolved value if provided
      let gammaExit;
      if (use_backsolved_constants && best_gamma_exit) {
        gammaExit = best_gamma_exit;
      } else {
        if (orderedSteps.length <= 6) gammaExit = 1.04;        // short
        else if (orderedSteps.length <= 12) gammaExit = 0.80;  // medium  
        else gammaExit = 0.60;                                 // long
      }

      // α rule per YAML: α = min(3.0, 1 + N/10)
      let alpha = Math.min(3.0, 1 + orderedSteps.length / 10);
      
      // β (hard-page penalty) by length per YAML
      let beta;
      if (orderedSteps.length <= 6) beta = 0.30;        // short
      else if (orderedSteps.length <= 12) beta = 0.40;  // medium
      else beta = 0.50;                                 // long

      // γ_boost defaults by length per YAML
      let gammaBoost;
      if (orderedSteps.length <= 6) gammaBoost = 0.20;      // short
      else if (orderedSteps.length <= 12) gammaBoost = 0.25; // medium
      else gammaBoost = 0.30;                              // long

      let cumulativeCR = 1;
      let burdenStreak = 0;

      orderedSteps.forEach((step: any, idx: number) => {
        const s = idx + 1;
        
        // Compute SC_s using YAML Qs scale (1-5)
        let sum_SC = 0;
        step.questions.forEach((q: any) => {
          // Map input_type to Qs per YAML interaction scale
          let Q_s;
          switch (q.input_type) {
            case '1': // Toggle/Yes-No
              Q_s = 1;
              break;
            case '2': // Single dropdown
              Q_s = 2;
              break;
            case '3': // Multi-select/slider
              Q_s = 3;
              break;
            case '4': // Calendar/upload
              Q_s = 4;
              break;
            case '5': // Open text field
              Q_s = 5;
              break;
            default:
              Q_s = 2; // fallback to dropdown
          }
          
          const I_s = q.invasiveness;
          const D_s = q.difficulty;
          // YAML equation: SC_s = (c1*Qs + c2*Is + c3*Ds) / (c1 + c2 + c3)
                  const numerator = c1 * Q_s + c2 * I_s + c3 * D_s;
        const denominator = c1 + c2 + c3;
        sum_SC += numerator / denominator;
        });
        
        // Strategy 2: Add epsilon penalty for multiple questions
        const epsilon_per_extra_question = 0.05;
        const qCount = step.questions.length;
        const extraQuestions = Math.max(0, qCount - 1);
        const epsilonPenalty = epsilon_per_extra_question * extraQuestions;
        
        const SC_s_raw = sum_SC / step.questions.length;
        const SC_s = Math.min(5, Math.max(1, SC_s_raw + epsilonPenalty));

        // Progress per YAML: Linear ≤ 6 pages; sqrt for longer funnels
        const progress = orderedSteps.length <= 6 ? s / orderedSteps.length : Math.sqrt(s / orderedSteps.length);
        
        // Update burden streak per YAML rule
        if (SC_s >= 4) {
          burdenStreak += 1;
        } else {
          burdenStreak = 0;
        }

        // Fatigue per YAML: F_s = clamp(1 + α·progress + β·burden_streak − γ_boost·boosts, 1, 5)
        const F_s = Math.min(5, Math.max(1, 1 + alpha * progress + beta * burdenStreak - gammaBoost * step.boosts));
        
        // Page score per YAML: PS_s = (w_c·SC_s + w_f·F_s) / (w_c + w_f)
        const PS_s = (w_c * SC_s + w_f * F_s) / (w_c + w_f);
        
        // **CRITICAL FIX**: Motivation decay per YAML: M_s = max(0, M_{s−1} − k·PS_s)
        const M_s = Math.max(0, M_prev - k * PS_s);
        
        // Burden gap per YAML: Δ_s = PS_s − M_s
        const delta_s = PS_s - M_s;
        
        // Exit probability per YAML: p_exit_s = 1 / (1 + exp(−γ_exit·Δ_s))
        const p_exit_s = 1 / (1 + Math.exp(-gammaExit * delta_s));
        
        // Per-step conversion per YAML: CR_s = 1 − p_exit_s
        const CR_s = 1 - p_exit_s;
        
        cumulativeCR *= CR_s;
        M_prev = M_s; // Update for next iteration
      });

      return cumulativeCR;
    }

    // 1) Generate an initial "identity order" and compute its CR
    let optimalOrder = Array.from({ length: N }, (_, i) => i); // [0, 1, 2, ...]
    let optimalCRTotal = simulateOrder(steps);
    
    // MODEL VALIDATION: Compare predicted vs observed CR for current order
    // FIXED: observedCR values are already decimals (0.85 = 85%), don't divide by 100
    const currentObservedCR = steps.reduce((total: number, step: any) => total * step.observedCR, 1);
    
    // DEBUG: Log individual step CRs to diagnose the issue
    console.log(`DEBUG - Individual step observed CRs:`, steps.map((step: any) => `${(step.observedCR * 100).toFixed(1)}%`));
    console.log(`DEBUG - Current observed CR (decimal): ${currentObservedCR}`);
    console.log(`DEBUG - Optimal CR total (decimal): ${optimalCRTotal}`);
    
    // Safeguard against division by zero or extremely small observed CR
    let modelAccuracyError = 0;
    let isModelReliable = true;
    let errorWarning = null;
    
    if (currentObservedCR < 0.0001) { // Less than 0.01%
      errorWarning = "Observed CR too low to validate model reliability";
      isModelReliable = false;
      console.log(`Model validation: Observed CR too low (${currentObservedCR}) for reliable validation`);
    } else {
      modelAccuracyError = Math.abs(optimalCRTotal - currentObservedCR) / currentObservedCR;
      isModelReliable = modelAccuracyError <= 0.15; // Allow 15% error tolerance
      
      console.log(`Model validation for current order:`);
      console.log(`- Predicted CR: ${(optimalCRTotal * 100).toFixed(2)}%`);
      console.log(`- Observed CR: ${(currentObservedCR * 100).toFixed(2)}%`);
      console.log(`- Error: ${(modelAccuracyError * 100).toFixed(1)}%`);
      console.log(`- Model reliable: ${isModelReliable}`);
    }
    
    // Track all samples if requested per YAML specification
    const sampleResults: Array<{ order: number[], CR_total: number }> = [];
    if (include_sample_results) {
      sampleResults.push({ order: [...optimalOrder], CR_total: optimalCRTotal });
    }

    // 2) Run random permutations for "sample_count" times
    for (let i = 0; i < sample_count; i++) {
      // Create a shuffled index array
      const shuffledIndices = shuffleArray(Array.from({ length: N }, (_, i) => i));
      
      // Create the corresponding shuffled steps
      const shuffledSteps = shuffledIndices.map(idx => steps[idx]);
      
      const cr = simulateOrder(shuffledSteps);
      
      // Track this sample if requested
      if (include_sample_results) {
        sampleResults.push({ order: shuffledIndices, CR_total: cr });
      }
      
      if (cr > optimalCRTotal) {
        optimalCRTotal = cr;
        optimalOrder = shuffledIndices;
      }
    }

    // 3) Prepare response per YAML specification
    const response: any = {
      optimal_step_order: optimalOrder,
      optimal_CR_total: optimalCRTotal,
      // Add model validation info
      model_validation: {
        current_predicted_CR: optimalCRTotal,
        current_observed_CR: currentObservedCR,
        accuracy_error_percent: modelAccuracyError * 100,
        is_reliable: isModelReliable,
        warning: errorWarning || (!isModelReliable ? 
          "Model predictions differ significantly from observed data. Optimization results may be unreliable." : 
          null)
      }
    };

    // Add sample_results if requested
    if (include_sample_results) {
      response.sample_results = sampleResults;
    }

    console.log(`Optimize completed: tested ${sample_count + 1} permutations, best CR: ${optimalCRTotal}`);

    res.status(200).json(response);
  } catch (err: any) {
    console.error("Error in /api/optimize:", err);
    res.status(500).json({ error: "Error in optimize API", details: err.message });
  }
}