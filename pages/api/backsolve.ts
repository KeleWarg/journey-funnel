// File: pages/api/backsolve.js

import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const data = req.body;

    // 1. Unpack the incoming JSON
    const {
      steps,
      E,
      N_importance,
      source,
      c1, c2, c3,
      w_c, w_f,
      w_E, w_N,
      U0 = 1000,
      observed_CR_s   // Array of length N: actual observed continue-rates per step
    } = data;

    // Extract observed_CR_s from steps if not provided directly
    const observedCRs = observed_CR_s || steps.map((step: any) => step.observedCR);

    const N = steps.length;

    // 2. Constants per YAML specification
    const sourceMultipliers = {
      paid_search: { default: 1.3 },
      paid_social: { default: 1.1 },
      organic_search: { default: 1.0 },
      direct_referral: { default: 1.0 },
      display_email: { default: 0.9 },
      social_organic: { default: 0.7 },
    };
    const S = (sourceMultipliers[source as keyof typeof sourceMultipliers] || { default: 1.0 }).default;

    // α rule per YAML: α = min(3.0, 1 + N/10)
    const alpha = Math.min(3.0, 1 + N / 10);
    
    // β (hard-page penalty) by length per YAML
    let beta;
    if (N <= 6) beta = 0.30;        // short
    else if (N <= 12) beta = 0.40;  // medium
    else beta = 0.50;               // long

    // γ_boost defaults by length per YAML
    let gammaBoost;
    if (N <= 6) gammaBoost = 0.20;      // short
    else if (N <= 12) gammaBoost = 0.25; // medium
    else gammaBoost = 0.30;             // long

    // Entry motivation base per YAML
    const M0 = Math.min(5, (w_E * E + w_N * N_importance) * S);

    // 3. Set up grid search ranges per YAML back_solve_specification
    // Expanded k search space to handle sharper decay patterns (0.10 → 1.50)
    const kValues: number[] = [];
    for (let v = 0.10; v <= 1.50; v += 0.02) {
      kValues.push(parseFloat(v.toFixed(2)));
    }

    const gammaValues: number[] = [];
    for (let v = 0.40; v <= 1.40; v += 0.02) {
      gammaValues.push(parseFloat(v.toFixed(2)));
    }

    let bestParams = null;
    let lowestMSE = Infinity;
    let bestPredictedCRs: number[] = [];

    // 4. Loop over every combination of (kTry, gammaTry) - grid search
    let searchCount = 0;
    let earlyExit = false;
    
    for (let kTry of kValues) {
      if (earlyExit) break; // Exit outer loop if early exit triggered
      
      for (let gammaTry of gammaValues) {
        searchCount++;

        // 4a. Initialize simulation variables
        let M_prev = M0;
        let burdenStreak = 0;
        const predictedCRs: number[] = [];

        // 4b. Step-by-step forward simulation per YAML equations
        for (let s = 0; s < N; s++) {
          const step = steps[s];

          // i) Compute SC_s using YAML Qs scale (1-5)
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
            
            const I_s = q.invasiveness; // already 1–5
            const D_s = q.difficulty;   // already 1–5

            // YAML equation: SC_s = (c1*Qs + c2*Is + c3*Ds) / (c1 + c2 + c3)
            const numerator = c1 * Q_s + c2 * I_s + c3 * D_s;
            const denominator = c1 + c2 + c3;
            const SC_q = numerator / denominator;
            sum_SC += SC_q;
          });
          const SC_s = sum_SC / step.questions.length;

          // ii) Compute progress per YAML: Linear ≤ 6 pages; sqrt for longer funnels
          const progress = N <= 6 ? (s + 1) / N : Math.sqrt((s + 1) / N);

          // iii) Update burden streak per YAML rule
          if (SC_s >= 4) {
            burdenStreak += 1;
          } else {
            burdenStreak = 0;
          }

          // iv) Compute fatigue per YAML: F_s = clamp(1 + α·progress + β·burden_streak − γ_boost·boosts, 1, 5)
          let rawFatigue = 1 + alpha * progress + beta * burdenStreak - gammaBoost * step.boosts;
          let F_s = Math.min(5, Math.max(1, rawFatigue));

          // v) Compute page score per YAML: PS_s = (w_c·SC_s + w_f·F_s) / (w_c + w_f)
          const PS_s = (w_c * SC_s + w_f * F_s) / (w_c + w_f);

          // vi) **CRITICAL**: Motivation decay per YAML: M_s = max(0, M_{s−1} − k·PS_s)
          const M_s = Math.max(0, M_prev - kTry * PS_s);

          // vii) Compute burden gap per YAML: Δ_s = PS_s − M_s
          const delta = PS_s - M_s;

          // viii) Compute exit probability per YAML: p_exit_s = 1 / (1 + exp(−γ_exit·Δ_s))
          const p_exit = 1 / (1 + Math.exp(-gammaTry * delta));

          // ix) Compute per-step conversion per YAML: CR_s = 1 − p_exit_s
          const CR_s = 1 - p_exit;
          predictedCRs.push(CR_s);

          // x) Update for next iteration
          M_prev = M_s;
        }

        // 4c. Compute MSE against observed_CR_s
        let mse = 0;
        for (let i = 0; i < N; i++) {
          const diff = predictedCRs[i] - observedCRs[i];
          mse += diff * diff;
        }
        mse /= N;

        // 4d. Update best if this is a new minimum
        if (mse < lowestMSE) {
          lowestMSE = mse;
          bestPredictedCRs = [...predictedCRs];
          
          // Calculate overall CRs per YAML specification
          const overall_predicted_CR_best = bestPredictedCRs.reduce((product: number, cr: number) => product * cr, 1);
          const overall_observed_CR = observedCRs.reduce((product: number, cr: number) => product * cr, 1);
          
          bestParams = { 
            best_k: kTry, 
            best_gamma_exit: gammaTry, 
            best_mse: mse,
            overall_predicted_CR_best,
            overall_observed_CR
          };
          
          // **CRITICAL FIX**: Early exit if MSE < 1e-6 per YAML spec
          if (mse < 1e-6) {
            console.log(`🎯 Early exit: MSE ${mse} < 1e-6 threshold at k=${kTry}, γ_exit=${gammaTry}`);
            earlyExit = true;
            break;
          }
        }
      }
    }

    console.log(`Backsolve search completed:`);
    console.log(`- Searched ${searchCount} combinations (${kValues.length} k × ${gammaValues.length} γ_exit)`);
    console.log(`- Target observed CR: ${observedCRs}`);
    console.log(`- Minimum MSE found: ${lowestMSE}`);
    console.log(`- Best params: ${bestParams ? JSON.stringify(bestParams) : 'null'}`);

    // 5. Return the best-fit parameters per YAML specification
    res.status(200).json({ bestParams });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Back-solve failed', details: err.message });
  }
}