import { NextApiRequest, NextApiResponse } from 'next';
import { initializeMCPOnServer } from '../../lib/mcp-server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      steps, 
      frameworks = ['PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini', 'SCARF', 'JTBD', 'TOTE', 'ELM'],
      E, N_importance, source, c1, c2, c3, w_c, w_f, w_E, w_N, U0,
      use_backsolved_constants = false,
      best_k, best_gamma_exit
    } = req.body;

    console.log('🚀 Enhanced MCP Funnel Analysis: Processing', steps.length, 'steps with', frameworks.length, 'frameworks');

    // Calculate baseline metrics
    const baselineCR = steps.reduce((total: number, step: any) => total * step.observedCR, 1);
    console.log(`📊 Baseline CR: ${(baselineCR * 100).toFixed(2)}%`);

    // 1. Get MCP LLM assessments for all steps and frameworks
    let mcpClient: any = null;
    let llmAssessments: any[] = [];
    
    try {
      mcpClient = await initializeMCPOnServer();
      
      const mcpRawResponse = await mcpClient.callFunction('manusFunnel', {
        steps: steps.map((step: any, index: number) => ({
          stepIndex: index,
          questions: step.questions.map((q: any) => q.text || q.question || 'Unnamed question'),
          observedCR: step.observedCR,
          boosts: step.boosts || 0
        })),
        frameworks,
        baseline_CR: baselineCR
      });

      // Parse MCP response properly
      let mcpResult: any;
      if (mcpRawResponse?.text) {
        try {
          mcpResult = JSON.parse(mcpRawResponse.text);
        } catch (parseError) {
          console.error('Failed to parse MCP response text:', mcpRawResponse.text);
          mcpResult = {};
        }
      } else if (mcpRawResponse && typeof mcpRawResponse === 'object') {
        mcpResult = mcpRawResponse;
      } else {
        console.warn('Unexpected MCP response format, using empty result');
        mcpResult = {};
      }
      llmAssessments = mcpResult.variants || [];
      
      console.log(`✅ MCP Analysis completed: ${llmAssessments.length} step assessments received`);
    } catch (mcpError) {
      console.error('MCP Analysis failed:', mcpError);
      // Continue with empty assessments - optimization will still work
      llmAssessments = [];
    }

    // 2. Run optimization with LLM uplifts applied
    const optimizeResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/optimize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        steps,
        E, N_importance, source, c1, c2, c3, w_c, w_f, w_E, w_N, U0,
        use_backsolved_constants,
        best_k, best_gamma_exit,
        apply_llm_uplift: true,
        llmAssessments,
        sample_count: 5000 // Reasonable sample size for enhanced analysis
      })
    });

    const optimizeResult = await optimizeResponse.json();

    // 3. Generate variant results for each framework
    const variantResults = await Promise.all(frameworks.map(async (framework: string) => {
      // Get framework-specific assessments
      const frameworkAssessments = llmAssessments.map(assessment => {
        const frameworkData = assessment.frameworks?.[framework];
        return {
          stepIndex: assessment.stepIndex,
          frameworks: { [framework]: frameworkData }
        };
      }).filter(a => a.frameworks[framework]);

      // Run optimization with this framework's uplifts
      const variantResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          steps,
          E, N_importance, source, c1, c2, c3, w_c, w_f, w_E, w_N, U0,
          use_backsolved_constants,
          best_k, best_gamma_exit,
          apply_llm_uplift: true,
          llmAssessments: frameworkAssessments,
          sample_count: 1000 // Smaller sample for variants
        })
      });

      const variantResult = await variantResponse.json();
      
      // Extract suggestions for this framework
      const suggestions = frameworkAssessments.map(assessment => {
        const frameworkData = assessment.frameworks[framework];
        return {
          stepIndex: assessment.stepIndex,
          suggestion: frameworkData?.suggestion || '',
          reasoning: frameworkData?.reasoning || '',
          estimated_uplift_pp: frameworkData?.estimated_uplift_pp || 0
        };
      });

      return {
        framework,
        step_order: variantResult.optimalOrder || [],
        baseline_CR: baselineCR,
        model_CR: variantResult.optimalCRTotal || baselineCR,
        uplift_pp: ((variantResult.optimalCRTotal || baselineCR) - baselineCR) * 100,
        suggestions,
        algorithm: variantResult.algorithm,
        samples_evaluated: variantResult.samplesEvaluated
      };
    }));

    // 4. Sort variants by performance
    variantResults.sort((a, b) => b.model_CR - a.model_CR);

    // 5. Calculate overall ceiling analysis
    const bestVariantCR = Math.max(...variantResults.map(v => v.model_CR));
    const ceilingAnalysis = {
      baseline_CR: baselineCR,
      model_ceiling_CR: bestVariantCR,
      potential_gain_pp: (bestVariantCR - baselineCR) * 100,
      improvement_possible: (bestVariantCR - baselineCR) * 100 > 0.5,
      best_framework: variantResults[0]?.framework || 'None',
      optimization_worthwhile: (bestVariantCR - baselineCR) * 100 > 1.0 // >1pp gain
    };

    console.log(`📊 Enhanced Analysis Complete:`);
    console.log(`- Baseline CR: ${(baselineCR * 100).toFixed(2)}%`);
    console.log(`- Best Variant CR: ${(bestVariantCR * 100).toFixed(2)}% (${variantResults[0]?.framework})`);
    console.log(`- Maximum Gain: ${ceilingAnalysis.potential_gain_pp.toFixed(2)}pp`);
    console.log(`- Optimization Algorithm: ${optimizeResult.algorithm}`);

    const response = {
      success: true,
      analysis_type: 'enhanced_mcp_funnel',
      baseline_metrics: {
        steps_count: steps.length,
        frameworks_analyzed: frameworks.length,
        baseline_CR: baselineCR,
        algorithm_used: optimizeResult.algorithm || 'heuristic_sampling'
      },
      ceiling_analysis: ceilingAnalysis,
      optimization_results: optimizeResult,
      variant_results: variantResults,
      llm_assessments_applied: llmAssessments.length > 0,
      mcp_integration: {
        status: mcpClient ? 'connected' : 'mock_fallback',
        assessments_received: llmAssessments.length,
        frameworks_processed: frameworks.length
      },
      performance_metrics: {
        total_samples_evaluated: variantResults.reduce((sum, v) => sum + (v.samples_evaluated || 0), 0),
        execution_time_estimate: '< 30s', // Based on current performance
        api_calls_made: frameworks.length + 1 // One per framework + main optimization
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Enhanced MCP Funnel analysis error:', error);
    res.status(500).json({ 
      error: 'Enhanced analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      fallback_available: true
    });
  }
} 