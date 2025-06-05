// Next.js API route for journey simulation
export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const data = req.body;

    const {
      steps,
      E,
      N_importance,
      source,  // e.g., 'paid_search'
      c1, c2, c3,
      w_c, w_f,
      w_E, w_N,
      U0
    } = data;

    const N = steps.length;
    const lengthBucket = N <= 6 ? 'short' : N <= 12 ? 'medium' : 'long';

    const kDefaults = { short: 0.24, medium: 0.08, long: 0.06 };
    const gammaExitDefaults = { short: 0.90, medium: 0.48, long: 0.40 };
    const gammaBoostDefaults = { short: 0.20, medium: 0.20, long: 0.25 };
    const alpha = Math.min(3.0, 1 + N / 10);
    const betaDefaults = { short: 0.30, medium: 0.40, long: 0.50 };
    const questionCountPenaltyDefaults = { short: 0.10, medium: 0.08, long: 0.05 };
    const sourceMultiplier = {
      paid_search: 1.3,
      paid_social: 1.1,
      organic_search: 1.0,
      direct_referral: 1.0,
      display_email: 0.9,
      social_organic: 0.7
    };

    const k = kDefaults[lengthBucket];
    const gammaExit = gammaExitDefaults[lengthBucket];
    const gammaBoost = gammaBoostDefaults[lengthBucket];
    const epsilon = questionCountPenaltyDefaults[lengthBucket];
    const beta = betaDefaults[lengthBucket];
    const S = sourceMultiplier[source] || 1.0;

    // Entry motivation
    const M0 = Math.min(5, (w_E * E + w_N * N_importance) * S);

    let M_prev = M0;
    let U_prev = U0;
    let burdenStreak = 0;

    const inputTypeScores = {
      check_box: 1,
      radio_button: 1,
      dropdown: 2,
      media_selector: 2,
      slider: 3,
      date_picker: 3,
      text_input_short: 3,
      search_input: 4,
      text_input_long: 4
    };

    const results = [];

    for (let s = 0; s < N; s++) {
      const step = steps[s];
      const SC_list = step.questions.map((q) => {  
        const Q_si = inputTypeScores[q.input_type];
        const I_si = q.invasiveness;
        const D_si = q.difficulty;
        return (c1 * Q_si + c2 * I_si + c3 * D_si) / (c1 + c2 + c3);
      });

      // Aggregate SC_s with Sum + Count-Penalty
      const avg_SC = SC_list.reduce((a, b) => a + b, 0) / SC_list.length;
      const countQs = SC_list.length;
      const raw_SC = avg_SC + epsilon * (countQs - 1);
      const SC_s = Math.max(1, Math.min(raw_SC, 5));

      // Update burden streak
      burdenStreak = SC_s >= 4.0 ? burdenStreak + 1 : 0;

      // Compute progress
      const progress = N <= 6 ? (s + 1) / N : Math.sqrt((s + 1) / N);

      // Fatigue F_s
      const F_s = Math.max(
        1,
        Math.min(1 + alpha * progress + beta * burdenStreak - gammaBoost * step.boosts, 5)
      );

      // Page Score PS_s
      const PS_s = (w_c * SC_s + w_f * F_s) / (w_c + w_f);

      // Motivation decay M_s
      const M_s = Math.max(0, M_prev - k * PS_s);

      // Burden gap Δ_s
      const delta = PS_s - M_s;

      // Exit probability p_exit_s
      const p_exit = 1 / (1 + Math.exp(-gammaExit * delta));

      // Continue rate CR_s
      const CR_s = 1 - p_exit;

      // Predicted users
      const U_s_pred = U_prev * CR_s;

      results.push({
        step: s + 1,
        SC_s,
        F_s,
        PS_s,
        M_s,
        delta,
        p_exit,
        CR_s,
        U_s_pred
      });

      // Update for next iteration
      M_prev = M_s;
      U_prev = U_s_pred;
    }

    // Compute CR_total
    const CR_total = results.reduce((acc, r) => acc * r.CR_s, 1);

    res.status(200).json({ results, CR_total });
  } catch (error) {
    res.status(500).json({ error: 'Invalid input or internal error', details: error.message });
  }
}
