export default async function handler(req, res) {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Only POST allowed" });
      return;
    }
  
    try {
      const { steps, E, N_importance, source, c1, c2, c3, w_c, w_f, w_E, w_N, U0, numSamples } = req.body;
  
      // We'll perform a simple random‐sampling optimization over "numSamples" permutations.
      const N = steps.length;
  
      // Helper: a function to shuffle an array copy
      function shuffleArray(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      }
  
      // Abstraction: run the same per-step simulation logic that /api/calculate does,
      // but for a specific order of steps. We’ll copy/paste a simplified version here:
      function simulateOrder(orderedSteps) {
        let M_prev = Math.min(5, (w_E * E + w_N * N_importance) * {
          paid_search: 1.3,
          paid_social: 1.1,
          organic_search: 1.0,
          direct_referral: 1.0,
          display_email: 0.9,
          social_organic: 0.7,
        }[source] || 1.0);
  
        const k = 0.24;
        const gammaExit = 1.04;
        const lengthBucket = orderedSteps.length <= 6 ? "short" : orderedSteps.length <= 12 ? "medium" : "long";
        let alphaRule = Math.min(3.0, 1 + orderedSteps.length / 10);
        let beta = orderedSteps.length <= 6 ? 0.30 : orderedSteps.length <= 12 ? 0.40 : 0.50;
        let gammaBoost = orderedSteps.length <= 6 ? 0.20 : orderedSteps.length <= 12 ? 0.25 : 0.30;
  
        let cumulativeCR = 1;
  
        orderedSteps.forEach((step, idx) => {
          const s = idx + 1;
          // Compute SC_s for this step (identical logic as /api/calculate):
          let sum_SC = 0;
          step.questions.forEach((q) => {
            let Q_s;
            switch (q.input_type) {
              case "check_box":
              case "radio_button": Q_s = 1; break;
              case "dropdown":
              case "media_selector": Q_s = 2; break;
              case "slider":
              case "date_picker":
              case "text_input_short": Q_s = 3; break;
              case "search_input":
              case "text_input_long": Q_s = 4; break;
              default: Q_s = 2;
            }
            const I_s = q.invasiveness;
            const D_s = q.difficulty;
            const numerator = c1 * Q_s + c2 * I_s + c3 * D_s;
            const denominator = c1 + c2 + c3;
            sum_SC += numerator / denominator;
          });
          const SC_s = sum_SC / step.questions.length;
  
          // Fatigue
          const progress = orderedSteps.length <= 6 ? s / orderedSteps.length : Math.sqrt(s / orderedSteps.length);
          let burdenStreak = 0;
          if (idx > 0) {
            for (let t = idx - 1; t >= 0; t--) {
              if (orderedSteps[t].questions.length > 0) {
                // Use the previously computed SC_s to check if >= 4
                // For speed, assume any prior SC >= 4 only if that step’s SC_s >= 4
                // (we’d have to store those intermediate SC values; to keep this simple, skip multi-layer streak)
                break;
              }
            }
          }
          const F_s = Math.min(5, Math.max(1, 1 + alphaRule * progress + beta * burdenStreak - gammaBoost * step.boosts));
          const PS_s = (w_c * SC_s + w_f * F_s) / (w_c + w_f);
          const delta_s = PS_s - M_prev;
          const p_exit_s = 1 / (1 + Math.exp(-gammaExit * delta_s));
          const CR_s = 1 - p_exit_s;
          cumulativeCR *= CR_s;
          M_prev = Math.max(0, M_prev - k * CR_s);
        });
  
        return cumulativeCR;
      }
  
      // 1) Generate an initial “identity order” and compute its CR
      let bestOrder = [...steps];
      let bestCR = simulateOrder(steps);
  
      // 2) Run random permutations for “numSamples” times
      for (let i = 0; i < numSamples; i++) {
        const shuffled = shuffleArray(steps);
        const cr = simulateOrder(shuffled);
        if (cr > bestCR) {
          bestCR = cr;
          bestOrder = shuffled;
        }
      }
  
      // 3) Return the index order (so front end can show “position”)
      //    We need to return the indices in the original array that correspond to each slot
      const bestIndices = bestOrder.map((stepObj) =>
        steps.findIndex((orig) => orig === stepObj)
      );
  
      res.status(200).json({
        bestOrder: bestIndices, // e.g. [2,0,1,3]
        bestCR,
        bestSteps: bestOrder,   // the actual step objects in new order
      });
    } catch (err) {
      console.error("Error in /api/optimize:", err);
      res.status(500).json({ error: "Error in optimize API", details: err.message });
    }
  }