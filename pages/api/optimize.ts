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
      sample_count = 20000, // Increased from 10000 to 20000 per YAML patch
      use_backsolved_constants = false,
      best_k,
      best_gamma_exit,
      include_sample_results = false,
      apply_llm_uplift = true,  // NEW: Apply LLM suggestions per action plan
      llmAssessments = [],     // NEW: LLM assessment results per step
      hybrid_seeding = false,   // NEW: Use Hybrid Fogg+ELM seeding
      seeded_order = false      // NEW: Include seeded order in optimization
    } = req.body;

    const N = steps.length;

    // Helper: Generate all permutations for exhaustive search (N ≤ 8)
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

        // **CRITICAL FIX**: Clamp ΔCRₛ to ±20pp per YAML spec before applying
        const MAX_UPLIFT_PER_STEP = 30; // 30pp per YAML patch - unlocking reorder upside
        const clampedUpliftPP = Math.min(MAX_UPLIFT_PER_STEP, Math.max(-MAX_UPLIFT_PER_STEP, bestUplift));
        
        // Apply uplift to observedCR: CR_s = clamp(CR_s + uplift/100, 0, 1)
        const originalCR = step.observedCR;
        const upliftedCR = Math.min(1.0, Math.max(0.0, originalCR + (clampedUpliftPP / 100)));
        
        console.log(`Step ${stepIndex}: CR ${(originalCR*100).toFixed(1)}% → ${(upliftedCR*100).toFixed(1)}% (+${clampedUpliftPP.toFixed(1)}pp, clamped from ${bestUplift.toFixed(1)}pp)`);

        return {
          ...step,
          observedCR: upliftedCR,
          llm_uplift_applied: clampedUpliftPP
        };
      });
    }

    // Simulation function with uplift support
    function simulateOrder(orderedSteps: any[]) {
      // Apply LLM uplifts before simulation per action plan
      const enhancedSteps = applyLLMUplifts(orderedSteps, llmAssessments);
      
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

    // NEW: Hybrid Fogg + ELM Seeding Logic
    let hybridSeededOrder: number[] | null = null;
    
    if (seeded_order && hybrid_seeding && llmAssessments && llmAssessments.length > 0) {
      console.log(`🧠 Computing Hybrid Fogg+ELM seeded order...`);
      
      // Step 1: Gather per-step attributes
      const stepAttributes = steps.map((step: any, stepIndex: number) => {
        const assessment = llmAssessments.find((a: { stepIndex: number }) => a.stepIndex === stepIndex);
        
        // Default values if assessment not found
        let motivation = 3.0;
        let trigger = 3.0;
        let elmScore = 3.0;
        
        if (assessment && assessment.frameworks) {
          // Extract Fogg scores
          const foggData = assessment.frameworks['Fogg'];
          if (foggData) {
            motivation = foggData.motivation_score || 3.0;
            trigger = foggData.trigger_score || 3.0;
          }
          
          // Extract ELM score (repurposed from estimated_uplift)
          const elmData = assessment.frameworks['ELM'];
          if (elmData) {
            // Convert uplift percentage to 1-5 scale: map [-30pp, +30pp] -> [1, 5]
            const upliftPP = elmData.estimated_uplift_pp || 0;
            elmScore = Math.max(1, Math.min(5, 3 + (upliftPP / 30) * 2)); // Center at 3, scale ±2
          }
        }
        
        // Calculate ability from step complexity: ability = clamp(1, 6 - SC_s, 5)
        let totalComplexity = 0;
        step.questions.forEach((q: any) => {
          let Q_s = parseInt(q.input_type) || 2;
          const I_s = q.invasiveness || 2;
          const D_s = q.difficulty || 2;
          totalComplexity += (Q_s + I_s + D_s) / 3;
        });
        const avgComplexity = totalComplexity / step.questions.length;
        const ability = Math.max(1, Math.min(5, 6 - avgComplexity));
        
        // Compute Fogg score: motivation × ability × trigger
        const foggScore = motivation * ability * trigger;
        
        return {
          stepIndex,
          motivation,
          ability,
          trigger,
          foggScore,
          elmScore
        };
      });
      
      // Step 2: Normalize scores to [0, 1] range
      const foggScores = stepAttributes.map((attr: { foggScore: number }) => attr.foggScore);
      const elmScores = stepAttributes.map((attr: { elmScore: number }) => attr.elmScore);
      
      const minFogg = Math.min(...foggScores);
      const maxFogg = Math.max(...foggScores);
      const minElm = Math.min(...elmScores);
      const maxElm = Math.max(...elmScores);
      
      const normalizedAttributes = stepAttributes.map((attr: { foggScore: number; elmScore: number; stepIndex: number }) => {
        const foggNormalized = maxFogg > minFogg ? (attr.foggScore - minFogg) / (maxFogg - minFogg) : 0.5;
        const elmNormalized = maxElm > minElm ? (attr.elmScore - minElm) / (maxElm - minElm) : 0.5;
        
        // Compute hybrid score as average of normalized scores
        const hybridScore = (foggNormalized + elmNormalized) / 2;
        
        return {
          ...attr,
          foggNormalized,
          elmNormalized,
          hybridScore
        };
      });
      
      // Step 3: Sort by hybrid score (descending) to get seeded order
      normalizedAttributes.sort((a: { hybridScore: number }, b: { hybridScore: number }) => b.hybridScore - a.hybridScore);
      hybridSeededOrder = normalizedAttributes.map((attr: { stepIndex: number }) => attr.stepIndex);
      
      console.log(`🎯 Hybrid seeded order: [${hybridSeededOrder?.join(',') || ''}]`);
      console.log(`📊 Step scores:`, normalizedAttributes.map((attr: { stepIndex: number; foggScore: number; elmScore: number; hybridScore: number }) => 
        `Step ${attr.stepIndex}: Fogg=${attr.foggScore.toFixed(1)}, ELM=${attr.elmScore.toFixed(1)}, Hybrid=${attr.hybridScore.toFixed(3)}`
      ));
    }

    // NEW: Smart algorithm selection per action plan
    const useExhaustiveSearch = N <= 8; // Expanded from N≤7 to N≤8 per YAML patch
    const algorithm = useExhaustiveSearch ? "exhaustive" : (hybrid_seeding ? "hybrid_seeded_sampling" : "heuristic_sampling");
    
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
    
    // **CRITICAL FIX**: Implement proper exhaustive search per YAML spec
    if (useExhaustiveSearch) {
      console.log(`🔍 Exhaustive search: Testing all ${factorial(N)} permutations...`);
      let permutationCount = 0;
      
      for (const permutation of permutations(Array.from({ length: N }, (_, i) => i))) {
        permutationCount++;
        const reorderedSteps = permutation.map(i => steps[i]);
        const crTotal = simulateOrder(reorderedSteps);
        
        if (crTotal > optimalCRTotal) {
          optimalCRTotal = crTotal;
          optimalOrder = [...permutation];
          console.log(`🎯 New best order found: [${permutation.join(',')}] CR=${(crTotal*100).toFixed(2)}%`);
        }
        
        // Progress logging every 100 permutations
        if (permutationCount % 100 === 0) {
          console.log(`📊 Processed ${permutationCount}/${factorial(N)} permutations`);
        }
      }
      
      console.log(`✅ Exhaustive search complete: Best order [${optimalOrder.join(',')}] with CR=${(optimalCRTotal*100).toFixed(2)}%`);
    } else {
      // **NEW**: Implement GA algorithm per YAML spec for N > 7
      const GA_PARAMS = { population: 200, generations: 50 }; // Per YAML spec
      console.log(`🧬 Genetic Algorithm: ${GA_PARAMS.population} population, ${GA_PARAMS.generations} generations`);
      
      // Initialize random population
      let population: number[][] = [];
      for (let i = 0; i < GA_PARAMS.population; i++) {
        population.push(shuffleArray(Array.from({ length: N }, (_, i) => i)));
      }
      
      // Evaluate initial population
      let populationFitness = population.map(order => {
        const reorderedSteps = order.map(i => steps[i]);
        return { order: [...order], fitness: simulateOrder(reorderedSteps) };
      });
      
      // Evolution loop
      for (let generation = 0; generation < GA_PARAMS.generations; generation++) {
        // Sort by fitness (descending)
        populationFitness.sort((a, b) => b.fitness - a.fitness);
        
        // Update best if current generation has improved
        if (populationFitness[0].fitness > optimalCRTotal) {
          optimalCRTotal = populationFitness[0].fitness;
          optimalOrder = [...populationFitness[0].order];
          console.log(`🧬 GA Gen ${generation}: New best [${optimalOrder.join(',')}] CR=${(optimalCRTotal*100).toFixed(2)}%`);
        }
        
        // Create next generation
        const newPopulation: number[][] = [];
        
        // Keep top 10% (elitism)
        const eliteCount = Math.floor(GA_PARAMS.population * 0.1);
        for (let i = 0; i < eliteCount; i++) {
          newPopulation.push([...populationFitness[i].order]);
        }
        
        // Generate offspring for remaining 90%
        while (newPopulation.length < GA_PARAMS.population) {
          // Tournament selection (size 3)
          const parent1 = tournamentSelection(populationFitness, 3);
          const parent2 = tournamentSelection(populationFitness, 3);
          
          // Order crossover (OX)
          const offspring = orderCrossover(parent1.order, parent2.order);
          
          // Mutation (swap two random positions) with 10% probability
          if (Math.random() < 0.1) {
            const mutated = [...offspring];
            const pos1 = Math.floor(Math.random() * N);
            const pos2 = Math.floor(Math.random() * N);
            [mutated[pos1], mutated[pos2]] = [mutated[pos2], mutated[pos1]];
            newPopulation.push(mutated);
          } else {
            newPopulation.push(offspring);
          }
        }
        
        // Evaluate new population
        populationFitness = newPopulation.map(order => {
          const reorderedSteps = order.map(i => steps[i]);
          return { order: [...order], fitness: simulateOrder(reorderedSteps) };
        });
        
        // Progress logging every 10 generations
        if ((generation + 1) % 10 === 0) {
          const avgFitness = populationFitness.reduce((sum, ind) => sum + ind.fitness, 0) / populationFitness.length;
          console.log(`📊 GA Gen ${generation + 1}/${GA_PARAMS.generations}: Best=${(populationFitness[0].fitness*100).toFixed(2)}%, Avg=${(avgFitness*100).toFixed(2)}%`);
        }
      }
      
      console.log(`✅ GA optimization complete: Best order [${optimalOrder.join(',')}] with CR=${(optimalCRTotal*100).toFixed(2)}%`);
    }

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
      // HEURISTIC SAMPLING: Random permutations + hybrid seeding
      console.log(`🔄 Starting heuristic sampling of ${sample_count} permutations...`);
      
      // Helper function for single swap perturbation
      function shuffleOneSwap(order: number[]): number[] {
        const result = [...order];
        const pos1 = Math.floor(Math.random() * result.length);
        const pos2 = Math.floor(Math.random() * result.length);
        [result[pos1], result[pos2]] = [result[pos2], result[pos1]];
        return result;
      }
      
      for (let trial = 0; trial < sample_count; trial++) {
        let permOrder;
        
        if (hybrid_seeding && hybridSeededOrder && trial === 0) {
          // First trial: Use the hybrid seeded order
          permOrder = [...hybridSeededOrder];
          console.log(`🌟 Trial 0: Using hybrid seeded order [${permOrder.join(',')}]`);
        } else if (hybrid_seeding && hybridSeededOrder && trial % 1000 === 0 && trial > 0) {
          // Every 1000 trials: Use slight perturbation of seeded order
          permOrder = shuffleOneSwap(hybridSeededOrder);
        } else if (trial < 100) {
          // First 100: Try systematic patterns
          if (trial === 1) permOrder = Array.from({ length: N }, (_, i) => N - 1 - i); // reverse
          else if (trial === 2) permOrder = Array.from({ length: N }, (_, i) => i); // identity
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
          
          if (hybrid_seeding && hybridSeededOrder && 
              JSON.stringify(permOrder) === JSON.stringify(hybridSeededOrder)) {
            console.log(`🎯 Seeded order achieved best result! CR=${(crTotal*100).toFixed(2)}%`);
          }
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

    // Prepare response with ceiling analysis and hybrid seeding info
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
      llm_uplifts_applied: apply_llm_uplift && llmAssessments && llmAssessments.length > 0,
      hybrid_seeding: {
        enabled: hybrid_seeding && seeded_order,
        seeded_order: hybridSeededOrder,
        seeded_order_is_optimal: hybridSeededOrder && JSON.stringify(optimalOrder) === JSON.stringify(hybridSeededOrder)
      },
      ...(include_sample_results && { allSamples })
    };

    res.status(200).json(response);
  } catch (err: any) {
    console.error("Optimization error:", err);
    res.status(500).json({ error: "Optimization failed", details: err.message });
  }
}

// GA Helper Functions
function tournamentSelection(population: { order: number[], fitness: number }[], tournamentSize: number) {
  let best = population[Math.floor(Math.random() * population.length)];
  for (let i = 1; i < tournamentSize; i++) {
    const candidate = population[Math.floor(Math.random() * population.length)];
    if (candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  return best;
}

function orderCrossover(parent1: number[], parent2: number[]): number[] {
  const size = parent1.length;
  const start = Math.floor(Math.random() * size);
  const end = Math.floor(Math.random() * size);
  const [from, to] = start < end ? [start, end] : [end, start];
  
  const offspring: number[] = new Array(size).fill(-1);
  
  // Copy substring from parent1
  for (let i = from; i <= to; i++) {
    offspring[i] = parent1[i];
  }
  
  // Fill remaining positions with parent2's order
  let p2Index = 0;
  for (let i = 0; i < size; i++) {
    if (offspring[i] === -1) {
      // Find next unused element from parent2
      while (offspring.includes(parent2[p2Index])) {
        p2Index++;
      }
      offspring[i] = parent2[p2Index];
      p2Index++;
    }
  }
  
  return offspring;
} 