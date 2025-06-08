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
  suggestions: MCPFrameworkSuggestion[];
  estimated_uplift: number;
  new_CR_s?: number;
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

    // Post-processing: clamp new CR values
    const processedAssessments = mcpResponse.assessments.map((assessment: MCPStepAssessment) => {
      const step = steps.find(s => s.stepIndex === assessment.stepIndex);
      if (!step) return assessment;

      // Clamp new_CR_s = min(1, CR_s + estimated_uplift)
      const new_CR_s = Math.min(1, step.CR_s + assessment.estimated_uplift);
      
      return {
        ...assessment,
        new_CR_s: new_CR_s
      };
    });

    // Compute boosted CR_total and uplift_total
    const baseline_CR_total = steps.reduce((total, step) => total * step.CR_s, 1);
    const boosted_CR_total = processedAssessments.reduce((total: number, assessment: MCPStepAssessment & { new_CR_s?: number }) => {
      return total * (assessment.new_CR_s || assessment.estimated_uplift + 
        (steps.find(s => s.stepIndex === assessment.stepIndex)?.CR_s || 0.5));
    }, 1);
    const uplift_total = boosted_CR_total - baseline_CR_total;

    const response = {
      assessments: processedAssessments,
      order_recommendations: mcpResponse.order_recommendations,
      baseline_CR_total,
      boosted_CR_total,
      uplift_total
    };

    res.status(200).json(response);

  } catch (error: any) {
    console.error('MCP Assessment error:', error);
    
    // Provide fallback mock response when MCP fails
    const mockResponse = {
      assessments: req.body.steps.map((step: any, index: number) => ({
        stepIndex: index,
        suggestions: [
          {
            framework: 'PAS',
            revisedText: `Optimized text for step ${index + 1}`,
            rationale: 'Mock suggestion due to MCP unavailability'
          }
        ],
        estimated_uplift: 0.02 // 2% mock uplift
      })),
      order_recommendations: [
        {
          framework: 'PAS',
          recommendedOrder: req.body.steps.map((_: any, index: number) => index),
          expectedUplift: 2.0,
          expected_CR_total: 0.05,
          reasoning: 'Mock recommendation due to MCP unavailability'
        }
      ],
      timestamp: new Date().toISOString(),
      method: 'fallback_mock'
    };
    
    console.log('🔄 Using fallback mock response due to MCP failure');
    
    // Post-processing: clamp new CR values
    const processedAssessments = mockResponse.assessments.map((assessment: any) => {
      const cappedUplift = Math.min(0.15, Math.max(-0.10, assessment.estimated_uplift));
      return {
        ...assessment,
        estimated_uplift: cappedUplift
      };
    });

    const response: MCPAssessmentResponse = {
      assessments: processedAssessments,
      order_recommendations: mockResponse.order_recommendations
    };

    res.status(200).json(response);
  }
} 