// File: pages/api/backsolve.js

export default async function handler(req, res) {
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
        U0,
        observed_CR_s   // Array of length N: actual observed continue-rates per step
      } = data;
  
      const N = steps.length;
      const lengthBucket = N <= 6 ? 'short' : N <= 12 ? 'medium' : 'long';
  
      // 2. Define your default constants (same as in calculate.js)
      const kDefaults          = { short: 0.24,  medium: 0.08,  long: 0.06  };
      const gammaExitDefaults  = { short: 0.90,  medium: 0.48,  long: 0.40  };
      const gammaBoostDefaults = { short: 0.20,  medium: 0.20,  long: 0.25  };
      const betaDefaults       = { short: 0.30,  medium: 0.40,  long: 0.50  };
      const questionCountPenaltyDefaults = { short: 0.10,  medium: 0.08,  long: 0.05 };
  
      // Traffic-source → multiplier
      const sourceMultiplier = {
        paid_search:     1.3,
        paid_social:     1.1,
        organic_search:  1.0,
        direct_referral: 1.0,
        display_email:   0.9,
        social_organic:  0.7
      };
  
      const alpha   = Math.min(3.0, 1 + N / 10);
      const beta    = betaDefaults[lengthBucket];
      const γ_boost = gammaBoostDefaults[lengthBucket];
      const S       = sourceMultiplier[source] || 1.0;
  
      // Entry‐motivation base
      const M0 = Math.min(5, (w_E * E + w_N * N_importance) * S);
  
      // Q-score lookup table
      const inputTypeScores = {
        check_box:        1,
        radio_button:     1,
        dropdown:         2,
        media_selector:   2,
        slider:           3,
        date_picker:      3,
        text_input_short: 3,
        search_input:     4,
        text_input_long:  4
      };
  
      // 3. Set up grid search ranges (use toFixed(2) instead of toFixed(02))
      const kValues       = [];
      for (let v = 0.04; v <= 0.40; v += 0.02) {
        kValues.push(parseFloat(v.toFixed(2)));
      }
  
      const gammaValues   = [];
      for (let v = 0.30; v <= 1.20; v += 0.02) {
        gammaValues.push(parseFloat(v.toFixed(2)));
      }
  
      const epsilonValues = [];
      for (let v = 0.00; v <= 0.30; v += 0.02) {
        epsilonValues.push(parseFloat(v.toFixed(2)));
      }
  
      let bestParams = null;
      let lowestMSE  = Infinity;
  
      // 4. Loop over every combination of (kTry, gammaTry, epsTry)
      for (let kTry of kValues) {
        for (let gammaTry of gammaValues) {
          for (let epsTry of epsilonValues) {
  
            // 4a. Initialize simulation variables
            let M_prev       = M0;
            let U_prev       = U0;
            let burdenStreak = 0;
            const predictedCRs = [];
  
            // 4b. Step-by-step forward simulation (same as /calculate.js)
            for (let s = 0; s < N; s++) {
              const step = steps[s];
  
              // i) Compute SC_list (question-level complexities)
              const SC_list = step.questions.map((q) => {
                const Q_si = inputTypeScores[q.input_type];
                const I_si = q.invasiveness;
                const D_si = q.difficulty;
                return (c1 * Q_si + c2 * I_si + c3 * D_si) / (c1 + c2 + c3);
              });
  
              // ii) Aggregate to SC_s: Sum + count penalty + clamp
              const avgSC   = SC_list.reduce((a, b) => a + b, 0) / SC_list.length;
              const countQs = SC_list.length;
              const rawSC   = avgSC + epsTry * (countQs - 1);
              const SC_s    = Math.max(1, Math.min(rawSC, 5));
  
              // iii) Update burden streak
              burdenStreak = SC_s >= 4.0 ? burdenStreak + 1 : 0;
  
              // iv) Compute progress
              const progress = N <= 6 ? (s + 1) / N : Math.sqrt((s + 1) / N);
  
              // v) Fatigue F_s
              const F_s = Math.max(
                1,
                Math.min(1 + alpha * progress + beta * burdenStreak - γ_boost * step.boosts, 5)
              );
  
              // vi) Page Score PS_s
              const PS_s = (w_c * SC_s + w_f * F_s) / (w_c + w_f);
  
              // vii) Motivation decay M_s
              const M_s = Math.max(0, M_prev - kTry * PS_s);
  
              // viii) Burden gap Δ_s
              const delta = PS_s - M_s;
  
              // ix) Exit probability p_exit_s
              const p_exit = 1 / (1 + Math.exp(-gammaTry * delta));
  
              // x) Continue rate CR_s
              const CR_s = 1 - p_exit;
              predictedCRs.push(CR_s);
  
              // xi) Propagate user counts
              const U_s_pred = U_prev * CR_s;
              M_prev = M_s;
              U_prev = U_s_pred;
            }
  
            // 4c. Compute MSE against observed_CR_s
            let mse = 0;
            for (let i = 0; i < N; i++) {
              const diff = predictedCRs[i] - observed_CR_s[i];
              mse += diff * diff;
            }
            mse /= N;
  
            // 4d. Update best if this is a new minimum
            if (mse < lowestMSE) {
              lowestMSE = mse;
              bestParams = { k: kTry, gamma_exit: gammaTry, epsilon: epsTry, mse };
            }
          }
        }
      }
  
      // 5. Return the best-fit trio
      res.status(200).json({ bestParams });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Back-solve failed', details: err.message });
    }
  }