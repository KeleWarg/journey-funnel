export default function handler(req, res) {
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

    // 1) Compute source multiplier S from source key
    const sourceMultipliers = {
      paid_search: { default: 1.3 },
      paid_social: { default: 1.1 },
      organic_search: { default: 1.0 },
      direct_referral: { default: 1.0 },
      display_email: { default: 0.9 },
      social_organic: { default: 0.7 },
    };
    const S = (sourceMultipliers[source] || { default: 1.0 }).default;

    // 2) Compute M0 = min(5, (w_E*E + w_N*N_importance) * S)
    const rawMotivation = (w_E * E + w_N * N_importance) * S;
    let M_prev = Math.min(5, rawMotivation);

    // 3) Decide which α, β, γ_exit, k, γ_boost, ε to use
    //    If overrides provided, use them; otherwise use defaults by funnel length
    const k = k_override != null ? k_override : 0.24; // default tuned
    const gammaExit = gamma_exit_override != null ? gamma_exit_override : 1.04;
    const epsilon = epsilon_override != null ? epsilon_override : 0.10; // penalty

    // Choose α, β by funnel length
    const alphaRule = Math.min(3.0, 1 + N / 10);
    let beta;
    if (N <= 6) beta = 0.30;
    else if (N <= 12) beta = 0.40;
    else beta = 0.50;

    // γ_boost defaults by length
    let gammaBoost;
    if (N <= 6) gammaBoost = 0.20;
    else if (N <= 12) gammaBoost = 0.25;
    else gammaBoost = 0.30;

    // For each step s, we’ll compute SC_s, F_s, PS_s, Δ_s, p_exit_s, CR_s, and U_s_pred
    const results = [];
    let cumulativeConversion = 1;

    for (let s = 1; s <= N; s++) {
      const step = steps[s - 1];
      const questions = step.questions; // array of { input_type, invasiveness, difficulty }
      const boostsSoFar = step.boosts;

      // 3a) Compute SC_s = average over all questions: (weighted Q,I,D)
      let sum_SC = 0;
      questions.forEach((q) => {
        // Here for simplicity, assume Q_s = input_type score if you had mapped it to numeric
        // But your code was manually collecting invasiveness & difficulty. Let’s treat:
        //   Q_s = (complexity of input_type). We could map dropdown=2, slider=3, etc.
        //   For now, assume Q_s = 2 if dropdown, 1 if radio/check, else 3 if slider/text, etc.
        let Q_s;
        switch (q.input_type) {
          case "check_box":
          case "radio_button":
            Q_s = 1;
            break;
          case "dropdown":
          case "media_selector":
            Q_s = 2;
            break;
          case "slider":
          case "date_picker":
          case "text_input_short":
            Q_s = 3;
            break;
          case "search_input":
          case "text_input_long":
            Q_s = 4;
            break;
          default:
            Q_s = 2;
        }
        const I_s = q.invasiveness; // already 1–5
        const D_s = q.difficulty;   // already 1–5

        const numerator = c1 * Q_s + c2 * I_s + c3 * D_s;
        const denominator = c1 + c2 + c3;
        const SC_q = numerator / denominator;
        sum_SC += SC_q;
      });
      const SC_s = sum_SC / questions.length; // average over multiple questions

      // 3b) Compute progress (linear if N <= 6, sqrt if longer)
      const progress = N <= 6 ? s / N : Math.sqrt(s / N);

      // 3c) Compute burdenStreak: count how many consecutive previous SC >= 4
      let burdenStreak = 0;
      if (s > 1) {
        for (let t = s - 1; t >= 1; t--) {
          if (results[t - 1].SC_s >= 4) burdenStreak++;
          else break;
        }
      }

      // 3d) Compute fatigue F_s = clamp(1 + α*progress + β*burdenStreak − γ_boost*boostsSoFar, 1, 5)
      let rawFatigue = 1 + alphaRule * progress + beta * burdenStreak - gammaBoost * boostsSoFar;
      let F_s = Math.min(5, Math.max(1, rawFatigue));

      // 3e) Compute page burden PS_s = (w_c*SC_s + w_f*F_s) / (w_c + w_f)
      const PS_s = (w_c * SC_s + w_f * F_s) / (w_c + w_f);

      // 3f) Compute burden gap Δ_s = PS_s − M_prev
      const delta_s = PS_s - M_prev;

      // 3g) Compute exit probability p_exit_s = 1 / (1 + exp(−γ_exit * Δ_s))
      const p_exit_s = 1 / (1 + Math.exp(-gammaExit * delta_s));

      // 3h) Compute per-step conversion CR_s = 1 − p_exit_s (so surviving fraction)
      const CR_s = 1 - p_exit_s;

      // 3i) Compute U_s_pred = U_{s-1}_pred * CR_s
      const U_s_pred = s === 1 ? U0 * CR_s : results[s - 2].U_s_pred * CR_s;

      // 3j) Update motivation: M_s = max(0, M_{s-1} − k · CR_s)
      const M_s = Math.max(0, M_prev - k * CR_s);

      // 3k) Save this step’s data
      results.push({
        step: s,
        SC_s,
        F_s,
        PS_s,
        M_s,
        delta_s,
        p_exit_s,
        CR_s,
        U_s_pred,
      });

      // 3l) For next iteration, M_prev = M_s
      M_prev = M_s;
      cumulativeConversion *= CR_s;
    }

    // 4) Return JSON
    res.status(200).json({
      results,          // array of per-step metrics
      CR_total: cumulativeConversion,
    });
  } catch (err) {
    console.error("Error in /api/calculate:", err);
    res.status(500).json({ error: "Error in calculate API", details: err.message });
  }
}