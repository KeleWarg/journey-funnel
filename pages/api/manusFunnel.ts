import { NextApiRequest, NextApiResponse } from 'next';

interface Step {
  questions: Array<{
    title: string;
    input_type: string;
    invasiveness: number;
    difficulty: number;
  }>;
  observedCR: number;
}

interface MCPFunnelVariant {
  framework: string;
  step_order: number[];
  CR_total: number;
  uplift_pp: number;
  suggestions: Array<{
    framework: string;
    revisedText: string;
    rationale: string;
    estimated_uplift: number;
  }>;
}

interface MCPFunnelResponse {
  baselineCR: number;
  variants: MCPFunnelVariant[];
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
      steps: Step[];
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

    console.log(`MCP Funnel Orchestrator: Processing ${steps.length} steps with ${frameworks.length} frameworks`);

    // Single MCP function call replaces multiple fetches
    const mcpRawResponse: any = await manus.callFunction("manusFunnel", {
      steps: steps,
      frameworks: frameworks
    });

    // Parse MCP response (could be direct JSON or wrapped in MCP protocol format)
    let result: MCPFunnelResponse;
    if (mcpRawResponse && mcpRawResponse.type === 'text' && mcpRawResponse.text) {
      try {
        result = JSON.parse(mcpRawResponse.text);
      } catch (parseError) {
        console.error('Failed to parse MCP response text:', mcpRawResponse.text);
        throw new Error('MCP response contains invalid JSON');
      }
    } else if (mcpRawResponse && typeof mcpRawResponse === 'object') {
      result = mcpRawResponse;
    } else {
      console.error('Invalid MCP response format:', mcpRawResponse);
      throw new Error('MCP returned unexpected response format');
    }

    console.log(`MCP Funnel: Received baseline CR ${(result.baselineCR * 100).toFixed(2)}% with ${result.variants.length} variants`);

    // Enhanced response with metadata
    const enhancedResult = {
      ...result,
      metadata: {
        totalVariants: result.variants.length,
        topPerformer: result.variants.reduce((best, current) => 
          current.CR_total > best.CR_total ? current : best, result.variants[0]
        ),
        averageUplift: result.variants.reduce((sum, variant) => sum + variant.uplift_pp, 0) / result.variants.length,
        frameworksAnalyzed: frameworks
      }
    };

    res.status(200).json(enhancedResult);

  } catch (error) {
    console.error('MCP Funnel orchestrator error:', error);
    res.status(500).json({ 
      error: 'MCP funnel orchestration failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 