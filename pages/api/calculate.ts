import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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
      c1,
      c2,
      c3,
      w_c,
      w_f,
      w_E,
      w_N,
      U0,
      k_override,
      gamma_exit_override,
      epsilon_override,
    } = req.body;

    const N = steps.length; // total number of pages

    // 1) Compute source multiplier S from source key (per YAML spec)
    const sourceMultipliers = {
      paid_search: { default: 1.3 },
      paid_social: { default: 1.1 },
      organic_search: { default: 1.0 },
      direct_referral: { default: 1.0 },
      display_email: { default: 0.9 },
      social_organic: { default: 0.7 },
    };
    const S = (sourceMultipliers[source as keyof typeof sourceMultipliers] || { default: 1.0 }).default;

    // 2) Compute M0 = min(5, (w_E*E + w_N*N_importance) * S) - Entry motivation per YAML
    const rawMotivation = (w_E * E + w_N * N_importance) * S;
    let M_prev = Math.min(5, rawMotivation);

    // 3) Constants per YAML specification
    const k = k_override != null ? k_override : 0.24; // motivation decay constant
    
    // Default gamma_exit by funnel length per YAML
    let defaultGammaExit;
    if (N <= 6) defaultGammaExit = 1.04;        // short
    else if (N <= 12) defaultGammaExit = 0.80;  // medium  
    else defaultGammaExit = 0.60;               // long
    const gammaExit = gamma_exit_override != null ? gamma_exit_override : defaultGammaExit;
    
    const epsilon = epsilon_override != null ? epsilon_override : 0.0; // question count penalty

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

    // Initialize burden streak tracking
    let burdenStreak = 0;
    
    // For each step s, compute per YAML equations
    const results = [];
    let cumulativeConversion = 1;

    for (let s = 1; s <= N; s++) {
      const step = steps[s - 1];
      const questions = step.questions;
      const boostsSoFar = step.boosts;

      // 3a) Compute SC_s = average over all questions using YAML Qs scale
      let sum_SC = 0;
      questions.forEach((q: any) => {
        // Map input_type to Qs per YAML interaction scale (1-5)
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
      const SC_s = sum_SC / questions.length;

      // 3b) Compute progress per YAML: Linear ≤ 6 pages; sqrt for longer funnels
      const progress = N <= 6 ? s / N : Math.sqrt(s / N);

      // 3c) Update burden streak per YAML rule
      if (SC_s >= 4) {
        burdenStreak += 1;
      } else {
        burdenStreak = 0;
      }

      // 3d) Compute fatigue per YAML: F_s = clamp(1 + α·progress + β·burden_streak − γ_boost·boosts, 1, 5)
      let rawFatigue = 1 + alpha * progress + beta * burdenStreak - gammaBoost * boostsSoFar;
      let F_s = Math.min(5, Math.max(1, rawFatigue));

      // 3e) Compute page score per YAML: PS_s = (w_c·SC_s + w_f·F_s) / (w_c + w_f)
      const PS_s = (w_c * SC_s + w_f * F_s) / (w_c + w_f);

      // 3f) **CRITICAL FIX**: Motivation decay per YAML: M_s = max(0, M_{s−1} − k·PS_s)
      // NOT k·CR_s as it was before!
      const M_s = Math.max(0, M_prev - k * PS_s);

      // 3g) Compute burden gap per YAML: Δ_s = PS_s − M_s  
      const delta_s = PS_s - M_s;

      // 3h) Compute exit probability per YAML: p_exit_s = 1 / (1 + exp(−γ_exit·Δ_s))
      const p_exit_s = 1 / (1 + Math.exp(-gammaExit * delta_s));

      // 3i) Compute per-step conversion per YAML: CR_s = 1 − p_exit_s
      const CR_s = 1 - p_exit_s;

      // 3j) Compute predicted users: U_s_pred = U_{s-1}_pred * CR_s
      const U_s_pred: number = s === 1 ? U0 * CR_s : results[s - 2].U_s_pred * CR_s;

      // 3k) Update cumulative conversion per YAML: CR_≤k = Π_{s=1..k} CRₛ
      cumulativeConversion *= CR_s;

      // 3l) Save this step's data with cumulative CR
      results.push({
        step: s,
        SC_s,
        F_s,
        PS_s,
        M_s,
        delta_s,
        p_exit_s,
        CR_s,
        cumulative_CR_s: cumulativeConversion,
        U_s_pred,
      });

      // 3m) For next iteration, M_prev = M_s
      M_prev = M_s;
    }

    // 4) Return JSON per YAML specification
    res.status(200).json({
      per_step_metrics: results,          // array of per-step metrics per YAML
      overall_predicted_CR: cumulativeConversion,  // CR_total per YAML
    });
  } catch (err: any) {
    console.error("Error in /api/calculate:", err);
    res.status(500).json({ error: "Error in calculate API", details: err.message });
  }
}