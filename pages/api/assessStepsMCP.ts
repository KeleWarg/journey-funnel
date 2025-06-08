import { NextApiRequest, NextApiResponse } from 'next';

interface StepWithText {
  stepIndex: number;
  questionTexts: string[];
  Qs: number;
  Is: number; 
  Ds: number;
  CR_s: number;
}

interface MCPFrameworkSuggestion {
  framework: string;
  revisedText: string;
  rationale: string;
}

interface MCPStepAssessment {
  stepIndex: number;
  base_CR_s: number;
  estimated_uplift: number;
  new_CR_s: number;
  cumulative_new_CR_s: number;
  suggestions: MCPFrameworkSuggestion[];
}

interface MCPOrderRecommendation {
  framework: string;
  recommendedOrder: number[];
  expected_CR_total: number;
}

interface MCPAssessmentResponse {
  assessments: MCPStepAssessment[];
  order_recommendations: MCPOrderRecommendation[];
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { steps, frameworks = [
      'PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini', 
      'SCARF', 'JTBD', 'TOTE', 'ELM'
    ] }: {
      steps: StepWithText[];
      frameworks?: string[];
    } = req.body;

    if (!steps || !Array.isArray(steps)) {
      res.status(400).json({ error: 'Steps array is required' });
      return;
    }

    // Initialize MCP client on server-side
    const { initializeMCPOnServer } = await import('../../lib/mcp-server');
    
    let manus;
    try {
      manus = await initializeMCPOnServer();
    } catch (mcpError) {
      console.warn('MCP initialization failed:', mcpError);
      res.status(503).json({ 
        error: 'MCP client not available',
        details: 'Please ensure the MCP server is properly configured and accessible'
      });
      return;
    }

    console.log(`MCP Assessment: Processing ${steps.length} steps with ${frameworks.length} frameworks`);

    // Call MCP assessSteps function
    const mcpRawResponse: any = await manus.callFunction("assessSteps", {
      steps: steps,
      frameworks: frameworks
    });

    // Parse MCP response with comprehensive format handling
    let mcpResponse: any;
    
    try {
      console.log('🔍 MCP Response Type:', typeof mcpRawResponse);
      console.log('🔍 MCP Response Keys:', mcpRawResponse ? Object.keys(mcpRawResponse) : 'null');
      
      if (mcpRawResponse && Array.isArray(mcpRawResponse) && mcpRawResponse.length > 0) {
        // MCP returns array of TextContent - take first item
        const firstResponse = mcpRawResponse[0];
        if (firstResponse && firstResponse.type === 'text' && firstResponse.text) {
          mcpResponse = JSON.parse(firstResponse.text);
        } else {
          throw new Error('Invalid array response format');
        }
      } else if (mcpRawResponse && mcpRawResponse.type === 'text' && mcpRawResponse.text) {
        // Single response with text property
        mcpResponse = JSON.parse(mcpRawResponse.text);
      } else if (mcpRawResponse && typeof mcpRawResponse === 'object' && mcpRawResponse.text) {
        // Response with text property (no type)
        mcpResponse = JSON.parse(mcpRawResponse.text);
      } else if (mcpRawResponse && typeof mcpRawResponse === 'object' && !mcpRawResponse.text && !mcpRawResponse.type) {
        // Direct object response
        mcpResponse = mcpRawResponse;
      } else {
        throw new Error('Unrecognized response format');
      }
    } catch (parseError: any) {
      console.error('❌ MCP Parsing Error:', parseError);
      console.error('❌ Raw Response Sample:', JSON.stringify(mcpRawResponse, null, 2).substring(0, 1000));
      
      // Try fallback parsing methods
      try {
        if (typeof mcpRawResponse === 'string') {
          mcpResponse = JSON.parse(mcpRawResponse);
        } else if (mcpRawResponse && mcpRawResponse.content) {
          mcpResponse = JSON.parse(mcpRawResponse.content);
        } else {
          throw new Error('All parsing methods failed');
        }
      } catch (fallbackError: any) {
        console.error('❌ Fallback parsing also failed:', fallbackError);
        res.status(500).json({ 
          error: 'Failed to parse MCP response', 
          details: parseError.message,
          responseType: typeof mcpRawResponse 
        });
        return;
      }
    }

    // Validate response structure with detailed logging
    console.log('✅ Parsed MCP Response Keys:', Object.keys(mcpResponse || {}));
    console.log('✅ Has assessments:', !!mcpResponse?.assessments);
    console.log('✅ Assessments type:', typeof mcpResponse?.assessments);
    console.log('✅ Assessments length:', mcpResponse?.assessments?.length);

    if (!mcpResponse || typeof mcpResponse !== 'object') {
      console.error('❌ MCP Response not an object:', typeof mcpResponse);
      res.status(500).json({ error: 'MCP response is not a valid object' });
      return;
    }

    if (!mcpResponse.assessments || !Array.isArray(mcpResponse.assessments)) {
      console.error('❌ MCP Response Structure Issue:');
      console.error('- Response type:', typeof mcpResponse);
      console.error('- Response keys:', Object.keys(mcpResponse || {}));
      console.error('- Has assessments:', !!mcpResponse?.assessments);
      console.error('- Assessments type:', typeof mcpResponse?.assessments);
      console.error('- Sample response:', JSON.stringify(mcpResponse, null, 2).substring(0, 500));
      
      res.status(500).json({ 
        error: 'MCP response missing or invalid assessments array',
        responseKeys: Object.keys(mcpResponse || {}),
        assessmentsType: typeof mcpResponse?.assessments
      });
      return;
    }

    if (!mcpResponse.order_recommendations || !Array.isArray(mcpResponse.order_recommendations)) {
      console.error('❌ Missing order_recommendations in MCP response');
      res.status(500).json({ error: 'MCP response missing order_recommendations array' });
      return;
    }

    console.log(`✅ MCP Assessment: Received ${mcpResponse.assessments.length} assessments and ${mcpResponse.order_recommendations.length} order recommendations`);

    // Compute baseline CR_total from original steps
    const baseline_CR_total = steps.reduce((total, step) => total * step.CR_s, 1);
    
    // Get predicted CR_total from MCP response (already calculated with cumulative tracking)
    const predicted_CR_total = mcpResponse.predicted_CR_total || mcpResponse.assessments[mcpResponse.assessments.length - 1]?.cumulative_new_CR_s || baseline_CR_total;
    
    const uplift_total = predicted_CR_total - baseline_CR_total;

    const response = {
      assessments: mcpResponse.assessments,
      order_recommendations: mcpResponse.order_recommendations,
      baseline_CR_total,
      predicted_CR_total,
      boosted_CR_total: predicted_CR_total, // For backward compatibility
      uplift_total
    };

    res.status(200).json(response);

  } catch (error: any) {
    console.error('MCP Assessment error:', error);
    
    // Provide fallback mock response with cumulative tracking when MCP fails
    let cumulative_cr = 1.0;
    const baseline_CR_total = req.body.steps.reduce((total: number, step: any) => total * step.CR_s, 1);
    
    const mockAssessments = req.body.steps.map((step: any, index: number) => {
      const base_CR_s = step.CR_s || 0.5;
      const estimated_uplift = Math.min(0.30, Math.max(-0.30, 0.02)); // 2% mock uplift, clamped to ±30pp
      const new_CR_s = Math.max(0, Math.min(1, base_CR_s + estimated_uplift));
      
      cumulative_cr *= new_CR_s;
      
      return {
        stepIndex: index,
        base_CR_s,
        estimated_uplift,
        new_CR_s,
        cumulative_new_CR_s: cumulative_cr,
        suggestions: [
          {
            framework: 'PAS',
            revisedText: `Optimized text for step ${index + 1}`,
            rationale: 'Mock suggestion due to MCP unavailability'
          }
        ]
      };
    });
    
    const mockResponse = {
      assessments: mockAssessments,
      order_recommendations: [
        {
          framework: 'PAS',
          recommendedOrder: req.body.steps.map((_: any, index: number) => index),
          expectedUplift: 2.0,
          expected_CR_total: cumulative_cr,
          reasoning: 'Mock recommendation due to MCP unavailability'
        }
      ],
      baseline_CR_total,
      predicted_CR_total: cumulative_cr,
      uplift_total: cumulative_cr - baseline_CR_total,
      timestamp: new Date().toISOString(),
      method: 'fallback_mock'
    };
    
    console.log('🔄 Using fallback mock response with cumulative tracking due to MCP failure');

    res.status(200).json(mockResponse);
  }
} 