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
    const { createMockMCPClient } = await import('../../lib/mock-mcp-server');
    
    let manus;
    try {
      manus = await initializeMCPOnServer();
    } catch (mcpError) {
      console.warn('MCP initialization failed, falling back to mock:', mcpError);
      // Use mock MCP client as fallback
      manus = createMockMCPClient();
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
        // Clean up common JSON issues
        let cleanedText = mcpRawResponse.text.trim();
        
        // Remove any leading/trailing non-JSON characters
        const jsonStart = cleanedText.indexOf('{');
        const jsonEnd = cleanedText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
        }
        
        // Try to fix common JSON formatting issues
        cleanedText = cleanedText
          .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":') // Quote unquoted keys
          .replace(/:\s*'([^']*)'/g, ': "$1"'); // Replace single quotes with double quotes
        
        console.log('🔍 Attempting to parse cleaned MCP response:', cleanedText.substring(0, 200) + '...');
        result = JSON.parse(cleanedText);
        console.log('✅ Successfully parsed MCP response');
      } catch (parseError: any) {
        console.error('❌ Failed to parse MCP response text after cleanup attempts:', parseError.message);
        console.error('📄 Raw response:', mcpRawResponse.text.substring(0, 500) + '...');
        throw new Error(`MCP response contains invalid JSON: ${parseError.message}`);
      }
    } else if (mcpRawResponse && typeof mcpRawResponse === 'object') {
      result = mcpRawResponse;
      console.log('✅ Using direct object MCP response');
    } else {
      console.error('❌ Invalid MCP response format:', mcpRawResponse);
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
    
    // Fallback to mock MCP when real MCP fails
    try {
      console.log('🔄 Falling back to Mock MCP for manusFunnel');
      const { createMockMCPClient } = await import('../../lib/mock-mcp-server');
      const mockClient = createMockMCPClient();
      
      const mockResult = await mockClient.callFunction("manusFunnel", {
        steps: req.body.steps,
        frameworks: req.body.frameworks || [
          'PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini', 
          'SCARF', 'JTBD', 'TOTE', 'ELM'
        ]
      });

      console.log(`✅ Mock MCP Funnel: Received baseline CR ${(mockResult.baselineCR * 100).toFixed(2)}% with ${mockResult.variants.length} variants`);

      // Enhanced response with metadata
      const enhancedResult = {
        ...mockResult,
        metadata: {
          ...mockResult.metadata,
          fallback_used: true,
          original_error: error instanceof Error ? error.message : 'Unknown error'
        }
      };

      res.status(200).json(enhancedResult);
    } catch (fallbackError) {
      console.error('Mock MCP fallback also failed:', fallbackError);
      res.status(500).json({ 
        error: 'MCP funnel orchestration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallback_error: fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error'
      });
    }
  }
} 