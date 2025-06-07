import { NextApiRequest, NextApiResponse } from 'next';

interface BoostElement {
  id: string;
  text: string;
}

interface ClassifiedBoost {
  id: string;
  category: string;
  score: number;
}

interface AssessBoostElementsRequest {
  stepIndex: number;
  boostElements: BoostElement[];
}

interface AssessBoostElementsResponse {
  classifiedBoosts: ClassifiedBoost[];
  stepBoostTotal: number;
  cappedBoosts: number; // after applying global cap of 5
}

const BOOST_CAP_GLOBAL = 5;

// Boost categories and their typical score ranges
const BOOST_CATEGORIES = {
  'social-proof': { min: 1, max: 4, description: 'Testimonials, reviews, user counts' },
  'authority': { min: 2, max: 5, description: 'Expert endorsements, credentials, certifications' },
  'urgency': { min: 1, max: 3, description: 'Limited time offers, countdown timers' },
  'scarcity': { min: 1, max: 4, description: 'Limited quantities, exclusive access' },
  'visual': { min: 1, max: 3, description: 'Logos, badges, visual elements' },
  'security': { min: 2, max: 4, description: 'Trust badges, security certificates' },
  'progress': { min: 1, max: 3, description: 'Progress indicators, step completion' },
  'personalization': { min: 1, max: 4, description: 'Customized content, user-specific elements' }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    console.log('Invalid method:', req.method);
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    const { stepIndex, boostElements }: AssessBoostElementsRequest = req.body;

    if (typeof stepIndex !== 'number') {
      console.log('Invalid stepIndex:', stepIndex, typeof stepIndex);
      res.status(400).json({ error: 'stepIndex must be a number' });
      return;
    }

    if (!boostElements || !Array.isArray(boostElements)) {
      console.log('Invalid boostElements:', boostElements);
      res.status(400).json({ error: 'boostElements array is required' });
      return;
    }

    if (boostElements.length === 0) {
      console.log('Empty boostElements array');
      res.status(400).json({ error: 'boostElements cannot be empty' });
      return;
    }

    // Validate each boost element
    for (let i = 0; i < boostElements.length; i++) {
      const element = boostElements[i];
      if (!element.id || !element.text) {
        console.log(`Invalid element at index ${i}:`, element);
        res.status(400).json({ error: `Boost element ${i + 1} is missing required fields (id or text)` });
        return;
      }
    }

    // Initialize MCP client for LLM classification
    let classifiedBoosts: ClassifiedBoost[] = [];
    
    try {
      const { initializeMCPOnServer } = await import('../../lib/mcp-server');
      const manus = await initializeMCPOnServer();

      console.log(`🔍 Classifying ${boostElements.length} boost elements for step ${stepIndex}`);

      // Call MCP for boost element classification
      const mcpRawResponse = await manus.callFunction("assessBoostElements", {
        stepIndex,
        boostElements,
        categories: Object.keys(BOOST_CATEGORIES)
      });

      // Parse MCP response
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
        throw new Error('MCP returned unexpected response format');
      }

      if (mcpResponse && mcpResponse.classifiedBoosts && Array.isArray(mcpResponse.classifiedBoosts)) {
        classifiedBoosts = mcpResponse.classifiedBoosts;
      } else {
        throw new Error('Invalid MCP response for boost classification');
      }

    } catch (mcpError) {
      console.warn('MCP boost classification failed, falling back to rule-based classification:', mcpError);
      
      // Fallback: Simple rule-based classification
      classifiedBoosts = boostElements.map((element) => {
        const text = element.text.toLowerCase();
        
        let category = 'visual';
        let score = 1;

        if (text.includes('testimonial') || text.includes('review') || text.includes('customers')) {
          category = 'social-proof';
          score = 3;
        } else if (text.includes('secure') || text.includes('ssl') || text.includes('encrypted')) {
          category = 'security';
          score = 3;
        } else if (text.includes('limited') || text.includes('exclusive')) {
          category = 'scarcity';
          score = 2;
        } else if (text.includes('urgent') || text.includes('deadline') || text.includes('expires')) {
          category = 'urgency';
          score = 2;
        } else if (text.includes('expert') || text.includes('certified') || text.includes('award')) {
          category = 'authority';
          score = 4;
        } else if (text.includes('progress') || text.includes('step')) {
          category = 'progress';
          score = 2;
        } else if (text.includes('personalized') || text.includes('customized')) {
          category = 'personalization';
          score = 3;
        }

        return {
          id: element.id,
          category,
          score
        };
      });
    }

    // Calculate totals
    const stepBoostTotal = classifiedBoosts.reduce((total, boost) => total + boost.score, 0);
    const cappedBoosts = Math.min(stepBoostTotal, BOOST_CAP_GLOBAL);

    console.log(`✅ Boost Classification: ${classifiedBoosts.length} elements, total score: ${stepBoostTotal}, capped: ${cappedBoosts}`);

    const response: AssessBoostElementsResponse = {
      classifiedBoosts,
      stepBoostTotal,
      cappedBoosts
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Boost assessment error:', error);
    res.status(500).json({ 
      error: 'Boost assessment failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 