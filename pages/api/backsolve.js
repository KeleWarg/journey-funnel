// File: pages/api/backsolve.js

export default function handler(req, res) {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Only POST allowed" });
      return;
    }
  
    try {
      // 1) Parse request body
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
        observed_CR_s,
      } = req.body;
  
      const N = steps.length;
  
      // 2) Source multiplier S
      const S = {
        paid_search: 1.3,
        paid_social: 1.1,
        organic_search: 1.0,
        direct_referral: 1.0,
        display_email: 0.9,
        social_organic: 0.7,
      }[source] || 1.0;
  
      // 3) Grid‐search ranges
      const kMin = 0.10,
        kMax = 1.00,
        kStep = 0.02;
      const gammaMin = 0.40,
        gammaMax = 1.40,
        gammaStep = 0.02;
  
      // 4) Helper to compute MSE for candidate (kCand, gammaCand)
      function computeMSE(kCand, gammaCand) {
        // a) Initial motivation
        let M_prev = Math.min(5, (w_E * E + w_N * N_importance) * S);
  
        // b) α and β rules by funnel length
        const alphaRule = Math.min(3.0, 1 + N / 10);
        const beta = N <= 6 ? 0.30 : N <= 12 ? 0.40 : 0.50;
        const gammaBoost = N <= 6 ? 0.20 : N <= 12 ? 0.25 : 0.30;
  
        const predicted_CR_s = [];
  
        // c) Loop each step
        for (let s = 1; s <= N; s++) {
          const step = steps[s - 1];
          const questions = step.questions;
  
          // 1) Compute SC_s: average of each question’s complexity
          let sum_SC = 0;
          questions.forEach((q) => {
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
            const I_s = q.invasiveness;
            const D_s = q.difficulty;
            const numerator = c1 * Q_s + c2 * I_s + c3 * D_s;
            const denominator = c1 + c2 + c3;
            sum_SC += numerator / denominator;
          });
          const SC_s = sum_SC / questions.length;
  
          // 2) Progress formula
          const progress = N <= 6 ? s / N : Math.sqrt(s / N);
  
          // 3) Compute fatigue F_s
          let burdenStreak = 0;
          if (s > 1) {
            // Look back at previous SC; you could store them, but for MSE we only need predicted_CR_s
            // We skip detailed streak logic to simplify. Zero out for now.
            burdenStreak = 0;
          }
          const F_s = Math.min(
            5,
            Math.max(1, 1 + alphaRule * progress + beta * burdenStreak - gammaBoost * step.boosts)
          );
  
          // 4) Page burden PS_s
          const PS_s = (w_c * SC_s + w_f * F_s) / (w_c + w_f);
  
          // 5) Burden gap Δ_s
          const delta_s = PS_s - M_prev;
  
          // 6) Exit probability & conversion
          const p_exit_s = 1 / (1 + Math.exp(-gammaCand * delta_s));
          const CR_s = 1 - p_exit_s;
          predicted_CR_s.push(CR_s);
  
          // 7) Update motivation for next step
          M_prev = Math.max(0, M_prev - kCand * CR_s);
        }
  
        // d) Compute MSE vs. observed array
        let mse = 0;
        for (let i = 0; i < N; i++) {
          const diff = predicted_CR_s[i] - observed_CR_s[i];
          mse += diff * diff;
        }
        return mse / N;
      }
  
      // 5) Perform grid search
      let bestParams = { k: null, gamma_exit: null, mse: Infinity };
      for (let kCand = kMin; kCand <= kMax + 1e-8; kCand += kStep) {
        for (let gCand = gammaMin; gCand <= gammaMax + 1e-8; gCand += gammaStep) {
          const mse = computeMSE(kCand, gCand);
          if (mse < bestParams.mse) {
            bestParams = { k: parseFloat(kCand.toFixed(2)), gamma_exit: parseFloat(gCand.toFixed(2)), mse };
          }
        }
      }
  
      // 6) Return best-fit constants
      res.status(200).json({
        bestParams: {
          k: bestParams.k,
          gamma_exit: bestParams.gamma_exit,
          mse: bestParams.mse,
        },
        predicted_CR_total: null,
      });
    } catch (err) {
      console.error("Error in /api/backsolve:", err);
      res.status(500).json({ error: "Error in backsolve API", details: err.message });
    }
  }