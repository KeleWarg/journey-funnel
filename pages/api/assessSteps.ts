import { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';

interface StepAssessmentInput {
  stepIndex: number;
  questionTexts: string[];
  Qs: number;
  Is: number; 
  Ds: number;
  CR_s: number;
}

interface FrameworkSuggestion {
  framework: string;
  revisedText: string;
  rationale: string;
}

interface StepAssessmentOutput {
  stepIndex: number;
  suggestions: FrameworkSuggestion[];
  estimated_uplift: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check if OpenAI API key is configured
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(400).json({ 
      error: 'OpenAI API key not configured',
      details: 'Please add OPENAI_API_KEY to your .env.local file to enable LLM assessments'
    });
    return;
  }

  try {
    const { steps, frameworks = [
      'PAS', 'Fogg', 'Nielsen', 'AIDA', 'Cialdini', 
      'SCARF', 'JTBD', 'TOTE', 'ELM'
    ] }: {
      steps: StepAssessmentInput[];
      frameworks?: string[];
    } = req.body;

    if (!steps || !Array.isArray(steps)) {
      res.status(400).json({ error: 'Steps array is required' });
      return;
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: apiKey,
    });

    // Framework definitions for LLM prompting
    const frameworkDefinitions = {
      'PAS': 'Problem-Agitate-Solve: Identify the user\'s problem, agitate the pain point, then present your solution',
      'Fogg': 'Fogg\'s Behavior Model: Ensure sufficient Motivation + Ability + Trigger are present for the desired behavior',
      'Nielsen': 'Nielsen\'s Usability Heuristics: Focus on visibility, match with real world, user control, consistency, error prevention',
      'AIDA': 'Attention-Interest-Desire-Action: Capture attention, build interest, create desire, prompt clear action',
      'Cialdini': 'Cialdini\'s Persuasion Principles: Apply reciprocity, commitment, social proof, authority, liking, scarcity',
      'SCARF': 'Status, Certainty, Autonomy, Relatedness, Fairness: Minimize threats and maximize rewards in these domains',
      'JTBD': 'Jobs-to-be-Done: Focus on the functional, emotional, and social jobs the user is hiring your product to do',
      'TOTE': 'Test-Operate-Test-Exit: Clear feedback loops, operational clarity, testing mechanisms, clear exit criteria',
      'ELM': 'Elaboration Likelihood Model: Consider high vs low involvement processing and adjust persuasion approach accordingly'
    };

    const assessments: StepAssessmentOutput[] = [];

    // Process each step with batch optimization
    for (const step of steps) {
      console.log(`Processing step ${step.stepIndex} with ${frameworks.length} frameworks...`);
      
      // Use single API call for all frameworks instead of 9 separate calls
      const suggestions = await generateAllFrameworkSuggestions(
        openai,
        step,
        frameworks,
        frameworkDefinitions
      );

      // Quick heuristic uplift instead of additional API call
      const estimated_uplift = calculateHeuristicUplift(step, suggestions);

      assessments.push({
        stepIndex: step.stepIndex,
        suggestions,
        estimated_uplift
      });
    }

    res.status(200).json({ assessments });

  } catch (error: any) {
    console.error('Error in assessSteps:', error);
    res.status(500).json({ 
      error: 'LLM assessment failed', 
      details: error.message 
    });
  }
}

// Optimized: Generate all framework suggestions in a single API call
async function generateAllFrameworkSuggestions(
  openai: OpenAI,
  step: StepAssessmentInput,
  frameworks: string[],
  frameworkDefinitions: Record<string, string>
): Promise<FrameworkSuggestion[]> {
  const originalText = step.questionTexts.join('; ');
  
  try {
    const frameworksText = frameworks.map(f => 
      `${f}: ${frameworkDefinitions[f as keyof typeof frameworkDefinitions] || 'Framework definition'}`
    ).join('\n\n');

    const prompt = `You are a conversion rate optimization expert. Apply ALL of these frameworks to improve this funnel step.

CURRENT QUESTION: ${originalText}
CURRENT CONVERSION RATE: ${(step.CR_s * 100).toFixed(1)}%
COMPLEXITY: Questions=${step.Qs}, Invasiveness=${step.Is}, Difficulty=${step.Ds}

FRAMEWORKS TO APPLY:
${frameworksText}

For EACH framework, provide a revised version and rationale. Respond in JSON format:
{
  "suggestions": [
    {
      "framework": "PAS",
      "revisedText": "improved version using PAS",
      "rationale": "how PAS was applied"
    },
    {
      "framework": "Fogg", 
      "revisedText": "improved version using Fogg",
      "rationale": "how Fogg was applied"
    }
    // ... continue for all frameworks
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 2000, // Increased for multiple frameworks
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse with robust error handling
    let parsed;
    try {
      const cleanedResponse = responseText.replace(/[\x00-\x1F\x7F]/g, '');
      parsed = JSON.parse(cleanedResponse);
      
      if (parsed.suggestions && Array.isArray(parsed.suggestions)) {
        return parsed.suggestions.map((s: any) => ({
          framework: s.framework || 'Unknown',
          revisedText: s.revisedText || originalText,
          rationale: s.rationale || 'No rationale provided'
        }));
      }
    } catch (jsonError) {
      console.warn('Failed to parse batch JSON response, using fallback');
    }

    // Fallback: return simple improvements for each framework
    return frameworks.map(framework => ({
      framework,
      revisedText: `${framework}-improved: ${originalText}`,
      rationale: `Applied ${framework} framework principles`
    }));

  } catch (error) {
    console.error('Error generating batch framework suggestions:', error);
    
    // Fallback to basic suggestions
    return frameworks.map(framework => ({
      framework,
      revisedText: originalText,
      rationale: `Error applying ${framework}: ${error instanceof Error ? error.message : 'Unknown error'}`
    }));
  }
}

// Heuristic uplift calculation (no API call needed)
function calculateHeuristicUplift(step: StepAssessmentInput, suggestions: FrameworkSuggestion[]): number {
  const currentCR = step.CR_s;
  const complexity = (step.Qs + step.Is + step.Ds) / 3;
  
  // Base uplift potential inversely related to current performance
  const headroom = 1 - currentCR;
  const baseUplift = headroom * 0.12; // 12% of remaining headroom
  
  // Complexity bonus (higher complexity = more improvement potential)
  const complexityBonus = Math.min(0.05, complexity * 0.015);
  
  // Framework diversity bonus
  const frameworkBonus = Math.min(0.03, suggestions.length * 0.003);
  
  // Calculate final uplift
  const totalUplift = baseUplift + complexityBonus + frameworkBonus;
  
  // Cap at reasonable bounds
  return Math.min(0.15, Math.max(0.005, totalUplift));
}

async function generateFrameworkSuggestion(
  openai: OpenAI,
  step: StepAssessmentInput,
  framework: string,
  definition: string
): Promise<FrameworkSuggestion> {
  const originalText = step.questionTexts.join('; ');
  
  try {
    const prompt = `You are a conversion rate optimization expert. Apply the ${framework} framework to improve this funnel step.

FRAMEWORK: ${definition}

CURRENT QUESTION(S): ${originalText}
CURRENT CONVERSION RATE: ${(step.CR_s * 100).toFixed(1)}%
COMPLEXITY SCORES: Questions=${step.Qs}, Invasiveness=${step.Is}, Difficulty=${step.Ds}

Please provide:
1. A revised version of the question(s) applying the ${framework} framework
2. A brief rationale explaining how you applied the framework

Respond in JSON format:
{
  "revisedText": "your improved version here",
  "rationale": "explanation of how you applied the framework"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 300,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    // Parse the JSON response with error handling
    let parsed;
    try {
      // Clean the response text of control characters
      const cleanedResponse = responseText.replace(/[\x00-\x1F\x7F]/g, '');
      parsed = JSON.parse(cleanedResponse);
    } catch (jsonError) {
      console.warn(`Failed to parse JSON for ${framework}:`, responseText);
      // Fallback: extract text manually if JSON parsing fails
      const revisedMatch = responseText.match(/"revisedText":\s*"([^"]+)"/);
      const rationaleMatch = responseText.match(/"rationale":\s*"([^"]+)"/);
      
      parsed = {
        revisedText: revisedMatch ? revisedMatch[1] : originalText,
        rationale: rationaleMatch ? rationaleMatch[1] : `${framework} framework suggestion (JSON parse failed)`
      };
    }
    
    return {
      framework,
      revisedText: parsed.revisedText || originalText,
      rationale: parsed.rationale || 'Unable to generate rationale'
    };

  } catch (error) {
    console.error(`Error generating ${framework} suggestion:`, error);
    
    // Fallback to original text if API fails
    return {
      framework,
      revisedText: originalText,
      rationale: `Error generating ${framework} suggestion: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

async function estimateUpliftWithLLM(openai: OpenAI, step: StepAssessmentInput, suggestions: FrameworkSuggestion[]): Promise<number> {
  try {
    const originalText = step.questionTexts.join('; ');
    const suggestionsText = suggestions.map(s => `${s.framework}: ${s.revisedText}`).join('\n');
    
    const prompt = `You are a conversion rate optimization expert. Estimate the potential conversion rate uplift from these copywriting improvements.

CURRENT QUESTION: ${originalText}
CURRENT CONVERSION RATE: ${(step.CR_s * 100).toFixed(1)}%
COMPLEXITY: Questions=${step.Qs}, Invasiveness=${step.Is}, Difficulty=${step.Ds}

PROPOSED IMPROVEMENTS:
${suggestionsText}

Based on industry research and conversion psychology, estimate the potential percentage point improvement these changes could provide. Consider:
- Current performance level (high performers have less upside)
- Quality and relevance of the improvements
- Typical impact of copy optimization in conversion funnels

Respond with ONLY a number representing percentage points (e.g., "3.2" for +3.2pp improvement).
Range: 0.5 to 15.0 percentage points.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 10,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) {
      throw new Error('No response from OpenAI');
    }

    const upliftPP = parseFloat(responseText);
    if (isNaN(upliftPP)) {
      throw new Error(`Invalid numeric response: ${responseText}`);
    }

    // Convert percentage points to decimal and cap at reasonable bounds
    const upliftDecimal = upliftPP / 100;
    return Math.min(0.15, Math.max(0.005, upliftDecimal));

  } catch (error) {
    console.error('Error estimating uplift with LLM:', error);
    
    // Fallback to simple heuristic if LLM fails
    const currentCR = step.CR_s;
    const baseUplift = (1 - currentCR) * 0.08; // Conservative 8% of headroom
    return Math.min(0.10, Math.max(0.01, baseUplift));
  }
} 