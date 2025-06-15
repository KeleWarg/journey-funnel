import { NextApiRequest, NextApiResponse } from 'next';

interface Step {
  questions: Array<{
    title: string;
    input_type: string;
    invasiveness: number;
    difficulty: number;
  }>;
  observedCR: number;
  boosts?: number; // Boost elements count
  // Step complexity components
  Qs?: number;
  Is?: number; 
  Ds?: number;
}

interface FoggMetric {
  stepIndex: number;
  motivation: number;
  ability: number;
  trigger: number;
  fogg_score: number;
  complexity: number;
}

interface FoggAnalysisResult {
  framework: string;
  step_order: number[];
  CR_total: number;
  uplift_pp: number;
  fogg_metrics: FoggMetric[];
  baseline_CR_total: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { steps, constants }: {
      steps: Step[];
      constants?: any;
    } = req.body;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      res.status(400).json({ error: 'Steps array is required and must not be empty' });
      return;
    }

    console.log('🧠 Starting Fogg Behavior Model analysis...');

    // Step 1: Calculate Fogg assessments based on step characteristics
    // Uses heuristics based on question complexity, invasiveness, and observed performance
    const assessments = steps.map((step, index) => {
      // Calculate average invasiveness and difficulty for motivation
      const avgInvasiveness = step.questions.reduce((sum, q) => sum + q.invasiveness, 0) / step.questions.length;
      const avgDifficulty = step.questions.reduce((sum, q) => sum + q.difficulty, 0) / step.questions.length;
      
      // Motivation: Higher when questions are less invasive and observed CR is good
      // Scale: 1-5, where 5 = high motivation (low invasiveness, good performance)
      const motivationFromInvasiveness = Math.max(1, Math.min(5, 6 - avgInvasiveness));
      const motivationFromPerformance = Math.max(1, Math.min(5, step.observedCR * 5));
      const motivation_score = (motivationFromInvasiveness + motivationFromPerformance) / 2;
      
      // Trigger: Higher when questions are simpler and have boost elements
      // Scale: 1-5, where 5 = strong trigger (simple questions, good boosts)
      const triggerFromSimplicity = Math.max(1, Math.min(5, 6 - avgDifficulty));
      const triggerFromBoosts = Math.max(1, Math.min(5, 1 + (step.boosts || 0) * 0.8));
      const trigger_score = (triggerFromSimplicity + triggerFromBoosts) / 2;
      
      return {
        stepIndex: index,
        motivation_score,
        trigger_score,
      };
    });

    console.log('📊 Generated Fogg assessments for', steps.length, 'steps');

    // Step 2: Compute per-step Fogg components
    const foggMetrics: FoggMetric[] = steps.map((step, index) => {
      const assessment = assessments[index];
      
      // Calculate motivation and trigger from LLM assessment
      const motivation = assessment.motivation_score;
      const trigger = assessment.trigger_score;
      
      // Calculate ability = clamp(1, 6 - SC_s, 5) where SC_s is step complexity
      const qs = step.Qs || 2;
      const ins = step.Is || 2;
      const ds = step.Ds || 2;
      const sc_s = (qs + ins + ds) / 3; // Step complexity
      const ability = Math.max(1, Math.min(5, 6 - sc_s));
      
      // Calculate Fogg score = motivation * ability * trigger
      const fogg_score = motivation * ability * trigger;
      
      return {
        stepIndex: index,
        motivation,
        ability,
        trigger,
        fogg_score,
        complexity: sc_s
      };
    });

    console.log('🔢 Calculated Fogg scores:', foggMetrics.map(m => m.fogg_score.toFixed(2)));

    // Step 3: Sort descending by fogg_score
    const recommendedOrder = foggMetrics
      .sort((a, b) => b.fogg_score - a.fogg_score)
      .map(metric => metric.stepIndex);

    console.log('📋 Recommended order by Fogg score:', recommendedOrder);

    // Step 4: Simulate this ordering using the calculate API
    // First calculate baseline CR with original order
    // Ensure steps have required boosts property
    const stepsWithBoosts = steps.map(step => ({
      ...step,
      boosts: step.boosts || 0 // Default to 0 boosts if not provided
    }));

    const baselineResponse = await fetch(`${req.headers.origin || 'http://localhost:3001'}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        steps: stepsWithBoosts, 
        ...constants // Spread constants directly as individual parameters
      })
    });

    if (!baselineResponse.ok) {
      throw new Error(`Baseline calculation failed: ${baselineResponse.statusText}`);
    }

    const baselineResult = await baselineResponse.json();
    const baseline_CR_total = baselineResult.overall_predicted_CR;

    console.log('📊 Baseline CR:', (baseline_CR_total * 100).toFixed(2) + '%');

    // Reorder steps according to Fogg recommendation
    const reorderedSteps = recommendedOrder.map(index => stepsWithBoosts[index]);

    // Calculate CR with Fogg-recommended order
    const foggResponse = await fetch(`${req.headers.origin || 'http://localhost:3001'}/api/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        steps: reorderedSteps, 
        ...constants // Spread constants directly as individual parameters
      })
    });

    if (!foggResponse.ok) {
      throw new Error(`Fogg reorder calculation failed: ${foggResponse.statusText}`);
    }

    const foggResult = await foggResponse.json();
    const fogg_CR_total = foggResult.overall_predicted_CR;

    console.log('🧠 Fogg reordered CR:', (fogg_CR_total * 100).toFixed(2) + '%');

    // Step 5: Calculate uplift based on actual performance difference
    const uplift_pp = (fogg_CR_total - baseline_CR_total) * 100;

    // Use the actual calculated CR from the reordered steps
    // No artificial bonuses - let the actual simulation results speak for themselves
    const finalCR = fogg_CR_total;
    const finalUplift = uplift_pp;

    console.log('✅ Fogg analysis complete:', {
      baseline: (baseline_CR_total * 100).toFixed(2) + '%',
      reordered: (fogg_CR_total * 100).toFixed(2) + '%',
      uplift: finalUplift.toFixed(2) + 'pp'
    });

    const result: FoggAnalysisResult = {
      framework: 'Fogg-BM',
      step_order: recommendedOrder,
      CR_total: finalCR,
      uplift_pp: finalUplift,
      fogg_metrics: foggMetrics,
      baseline_CR_total
    };

    res.status(200).json(result);

  } catch (error) {
    console.error('❌ Fogg analysis error:', error);
    res.status(500).json({ 
      error: 'Fogg analysis failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 