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

    // Parse MCP response (could be direct JSON or wrapped in MCP protocol format)
    let mcpResponse: any;
    if (mcpRawResponse && mcpRawResponse.type === 'text' && mcpRawResponse.text) {
      try {
        mcpResponse = JSON.parse(mcpRawResponse.text);
      } catch (parseError) {
        console.error('Failed to parse MCP response text:', mcpRawResponse.text);
        throw new Error('MCP response contains invalid JSON');
      }
    } else if (mcpRawResponse && typeof mcpRawResponse === 'object') {
      mcpResponse = mcpRawResponse;
    } else {
      console.error('Invalid MCP response format:', mcpRawResponse);
      throw new Error('MCP returned unexpected response format');
    }

    // Validate parsed response structure
    if (!mcpResponse) {
      throw new Error('MCP returned null/undefined response after parsing');
    }

    if (!mcpResponse.assessments || !Array.isArray(mcpResponse.assessments)) {
      console.error('Invalid MCP response structure:', mcpResponse);
      console.error('Response type:', typeof mcpResponse);
      console.error('Response keys:', Object.keys(mcpResponse || {}));
      console.error('Assessments type:', typeof mcpResponse?.assessments);
      console.error('Raw response was:', mcpRawResponse);
      throw new Error('MCP response missing assessments array');
    }

    if (!mcpResponse.order_recommendations || !Array.isArray(mcpResponse.order_recommendations)) {
      console.error('Invalid MCP response structure:', mcpResponse);
      throw new Error('MCP response missing order_recommendations array');
    }

    console.log(`MCP Assessment: Received ${mcpResponse.assessments.length} assessments and ${mcpResponse.order_recommendations.length} order recommendations`);

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

  } catch (error) {
    console.error('MCP Assessment error:', error);
    res.status(500).json({ 
      error: 'MCP assessment failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 