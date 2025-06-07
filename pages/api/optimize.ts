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
      sample_count = 10000,
      use_backsolved_constants = false,
      best_k,
      best_gamma_exit,
      include_sample_results = false,
      apply_llm_uplift = true,  // NEW: Apply LLM suggestions per action plan
      llm_assessments = []      // NEW: LLM assessment results per step
    } = req.body;

    const N = steps.length;

    // Helper: Generate all permutations for exhaustive search (N ≤ 7)
    function* permutations(arr: any[]): Generator<any[]> {
      if (arr.length <= 1) {
        yield arr.slice();
        return;
      }
      
      for (let i = 0; i < arr.length; i++) {
        const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
        for (const perm of permutations(rest)) {
          yield [arr[i], ...perm];
        }
      }
    }

    // Helper: Shuffle array for random sampling
    function shuffleArray(arr: any[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

    // NEW: Apply LLM uplifts to steps before simulation per action plan
    function applyLLMUplifts(stepsToModify: any[], assessments: any[]) {
      if (!apply_llm_uplift || !assessments || assessments.length === 0) {
        return stepsToModify;
      }

      return stepsToModify.map((step, stepIndex) => {
        const assessment = assessments.find(a => a.stepIndex === stepIndex);
        if (!assessment || !assessment.frameworks) {
          return step;
        }

        // Apply the best framework's uplift
        let bestUplift = 0;
        Object.values(assessment.frameworks).forEach((frameworkData: any) => {
          if (frameworkData.estimated_uplift_pp > bestUplift) {
            bestUplift = frameworkData.estimated_uplift_pp;
          }
        });

        // Apply uplift to observedCR: CR_s = clamp(CR_s + uplift/100, 0, 1)
        const originalCR = step.observedCR;
        const upliftedCR = Math.min(1.0, Math.max(0.0, originalCR + (bestUplift / 100)));
        
        console.log(`Step ${stepIndex}: CR ${(originalCR*100).toFixed(1)}% → ${(upliftedCR*100).toFixed(1)}% (+${bestUplift.toFixed(1)}pp)`);

        return {
          ...step,
          observedCR: upliftedCR,
          llm_uplift_applied: bestUplift
        };
      });
    }

    // Simulation function with uplift support
    function simulateOrder(orderedSteps: any[]) {
      // Apply LLM uplifts before simulation per action plan
      const enhancedSteps = applyLLMUplifts(orderedSteps, llm_assessments);
      
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
      const k = (use_backsolved_constants && best_k) ? best_k : 0.24;
      
      // Default gamma_exit by funnel length per YAML - use backsolved value if provided
      let gammaExit;
      if (use_backsolved_constants && best_gamma_exit) {
        gammaExit = best_gamma_exit;
      } else {
        if (enhancedSteps.length <= 6) gammaExit = 1.04;        // short
        else if (enhancedSteps.length <= 12) gammaExit = 0.80;  // medium  
        else gammaExit = 0.60;                                 // long
      }

      // α rule per YAML: α = min(3.0, 1 + N/10)
      let alpha = Math.min(3.0, 1 + enhancedSteps.length / 10);
      
      // β (hard-page penalty) by length per YAML
      let beta;
      if (enhancedSteps.length <= 6) beta = 0.30;        // short
      else if (enhancedSteps.length <= 12) beta = 0.40;  // medium
      else beta = 0.50;                                 // long

      // γ_boost defaults by length per YAML
      let gammaBoost;
      if (enhancedSteps.length <= 6) gammaBoost = 0.20;      // short
      else if (enhancedSteps.length <= 12) gammaBoost = 0.25; // medium
      else gammaBoost = 0.30;                              // long

  let cumulativeCR = 1;
      let burdenStreak = 0;

      enhancedSteps.forEach((step: any, idx: number) => {
    const s = idx + 1;
        
        // Compute SC_s using YAML Qs scale (1-5)
    let sum_SC = 0;
        step.questions.forEach((q: any) => {
          // Map input_type to Qs per YAML interaction scale
          let Q_s;
      switch (q.input_type) {
            case '1': Q_s = 1; break;  // Toggle/Yes-No
            case '2': Q_s = 2; break;  // Single dropdown
            case '3': Q_s = 3; break;  // Multi-select/slider
            case '4': Q_s = 4; break;  // Calendar/upload
            case '5': Q_s = 5; break;  // Open text field
            default: Q_s = 2;          // fallback to dropdown
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
        const progress = enhancedSteps.length <= 6 ? s / enhancedSteps.length : Math.sqrt(s / enhancedSteps.length);
        
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

    // NEW: Smart algorithm selection per action plan
    const useExhaustiveSearch = N <= 7;
    const algorithm = useExhaustiveSearch ? "exhaustive" : "heuristic_sampling";
    
    console.log(`📊 Optimization Strategy: ${algorithm} (N=${N})`);
    console.log(`🔄 ${useExhaustiveSearch ? `All ${factorial(N)} permutations` : `${sample_count} random samples`}`);

    // Calculate factorial for logging
    function factorial(n: number): number {
      if (n <= 1) return 1;
      return n * factorial(n - 1);
    }

    // 1) Generate initial "identity order" and compute its CR
    let optimalOrder = Array.from({ length: N }, (_, i) => i);
    let optimalCRTotal = simulateOrder(steps);
    
    // MODEL VALIDATION: Compare predicted vs observed CR for current order
    const currentObservedCR = steps.reduce((total: number, step: any) => total * step.observedCR, 1);
    
    // DEBUG: Log individual step CRs
    console.log(`DEBUG - Individual step observed CRs:`, steps.map((step: any) => `${(step.observedCR * 100).toFixed(1)}%`));
    console.log(`DEBUG - Current observed CR (decimal): ${currentObservedCR}`);
    console.log(`DEBUG - Optimal CR total (decimal): ${optimalCRTotal}`);
    
    // Model reliability check
    let modelAccuracyError = 0;
    let isModelReliable = true;
    let errorWarning = null;
    
    if (currentObservedCR < 0.0001) {
      errorWarning = "Observed CR too low to validate model reliability";
      isModelReliable = false;
      console.log(`Model validation: Observed CR too low (${currentObservedCR}) for reliable validation`);
    } else {
      modelAccuracyError = Math.abs(optimalCRTotal - currentObservedCR) / currentObservedCR;
      isModelReliable = modelAccuracyError <= 0.15; // 15% error tolerance
      
      console.log(`Model validation for current order:`);
      console.log(`- Predicted CR: ${(optimalCRTotal * 100).toFixed(2)}%`);
      console.log(`- Observed CR: ${(currentObservedCR * 100).toFixed(2)}%`);
      console.log(`- Error: ${(modelAccuracyError * 100).toFixed(1)}%`);
      console.log(`- Model reliable: ${isModelReliable}`);
    }
    
    // Track all samples if requested
    const allSamples: Array<{ order: number[], crTotal: number }> = [];
    
    let samplesEvaluated = 0;

    if (useExhaustiveSearch) {
      // EXHAUSTIVE SEARCH: Evaluate all permutations
      console.log(`🔄 Starting exhaustive search of all ${factorial(N)} permutations...`);
      
      for (const perm of permutations(Array.from({ length: N }, (_, i) => i))) {
        const reorderedSteps = perm.map(i => steps[i]);
        const crTotal = simulateOrder(reorderedSteps);
        
        if (include_sample_results) {
          allSamples.push({ order: perm, crTotal });
        }
        
        if (crTotal > optimalCRTotal) {
          optimalCRTotal = crTotal;
          optimalOrder = perm;
        }
        
        samplesEvaluated++;
      }
    } else {
      // HEURISTIC SAMPLING: Random permutations + some systematic patterns
      console.log(`🔄 Starting heuristic sampling of ${sample_count} permutations...`);
      
      for (let trial = 0; trial < sample_count; trial++) {
        let permOrder;
        
        // Mix random with some systematic patterns
        if (trial < 100) {
          // First 100: Try systematic patterns (reverse, middle-out, etc.)
          if (trial === 0) permOrder = Array.from({ length: N }, (_, i) => N - 1 - i); // reverse
          else if (trial === 1) permOrder = Array.from({ length: N }, (_, i) => i); // identity
          else permOrder = shuffleArray(Array.from({ length: N }, (_, i) => i));
        } else {
          // Rest: Pure random sampling
          permOrder = shuffleArray(Array.from({ length: N }, (_, i) => i));
        }
        
        const reorderedSteps = permOrder.map(i => steps[i]);
        const crTotal = simulateOrder(reorderedSteps);
        
        if (include_sample_results) {
          allSamples.push({ order: permOrder, crTotal });
        }
        
        if (crTotal > optimalCRTotal) {
          optimalCRTotal = crTotal;
          optimalOrder = permOrder;
        }
        
        samplesEvaluated++;
      }
    }

    // Calculate model ceiling vs baseline per action plan
    const baselineCR = currentObservedCR;
    const modelCeilingCR = optimalCRTotal;
    const potentialGainPP = (modelCeilingCR - baselineCR) * 100;

    console.log(`Optimize completed: tested ${samplesEvaluated} permutations, best CR: ${optimalCRTotal}`);
    console.log(`📊 Model Ceiling Analysis:`);
    console.log(`- Baseline (Observed) CR: ${(baselineCR * 100).toFixed(2)}%`);
    console.log(`- Best-Modelled CR: ${(modelCeilingCR * 100).toFixed(2)}%`);
    console.log(`- Potential Gain: ${potentialGainPP.toFixed(2)} pp`);

    // Prepare response with ceiling analysis per action plan
    const response = {
      optimalOrder,
      optimalCRTotal,
      algorithm,
      samplesEvaluated,
      model_validation: {
        current_observed_CR: currentObservedCR,
        current_predicted_CR: optimalCRTotal,
        accuracy_error: modelAccuracyError,
        is_reliable: isModelReliable,
        error_warning: errorWarning
      },
      ceiling_analysis: {
        baseline_CR: baselineCR,
        model_ceiling_CR: modelCeilingCR,
        potential_gain_pp: potentialGainPP,
        improvement_possible: potentialGainPP > 0.5 // Worth optimizing if >0.5pp gain
      },
      llm_uplifts_applied: apply_llm_uplift && llm_assessments.length > 0,
      ...(include_sample_results && { allSamples })
    };

    res.status(200).json(response);
  } catch (err: any) {
    console.error("Optimization error:", err);
    res.status(500).json({ error: "Optimization failed", details: err.message });
  }
} 