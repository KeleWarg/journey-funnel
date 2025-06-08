import { NextApiRequest, NextApiResponse } from 'next';

interface Question {
  title: string;
  input_type: string;
  invasiveness: number;
  difficulty: number;
}

interface Step {
  questions: Question[];
  observedCR: number;
}

interface FoggRecommendation {
  type: 'content_rewrite' | 'interaction_improvement' | 'support_content' | 'ux_enhancement';
  title: string;
  description: string;
  before?: string;
  after?: string;
  implementation?: string;
}

interface FoggStepAssessment {
  stepIndex: number;
  motivation_score: number;
  ability_score: number;
  trigger_score: number;
  overall_score: number;
  barriers: string[];
  recommendations: FoggRecommendation[];
  improvement_summary: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { steps, categoryTitle }: { steps: Step[]; categoryTitle?: string } = req.body;

    if (!steps || !Array.isArray(steps)) {
      res.status(400).json({ error: 'Steps array is required' });
      return;
    }

    if (!categoryTitle || !categoryTitle.trim()) {
      res.status(400).json({ error: 'Category title is required' });
      return;
    }

    // Check for OpenAI API key
    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your .env.local file.');
    }

    console.log(`🧠 Fogg Step Assessment: Analyzing ${steps.length} steps with OpenAI`);

    // Initialize OpenAI (using modern SDK)
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    // Build comprehensive prompt for Fogg assessment with content rewrites
    const stepDescriptions = steps.map((step, index) => {
      const questionsText = step.questions.map((q, qIndex) => 
        `Q${qIndex + 1}: "${q.title}" (Type: ${q.input_type}, Invasiveness: ${q.invasiveness}/5, Difficulty: ${q.difficulty}/5)`
      ).join('\n    ');
      
      return `Step ${index + 1}:
    Questions:
    ${questionsText}
    Observed CR: ${(step.observedCR * 100).toFixed(1)}%`;
    }).join('\n\n');

    const prompt = `You are an expert in the Fogg Behavior Model (B = MAT) and conversion rate optimization. Analyze each step in this funnel and provide detailed recommendations with content rewrites.

FUNNEL CATEGORY: ${categoryTitle.trim()}

FUNNEL STEPS:
${stepDescriptions}

For each step, analyze using the Fogg Behavior Model framework:
- **MOTIVATION (M)**: How motivated is the user to complete this step?
- **ABILITY (A)**: How easy is it for the user to complete this step?
- **TRIGGER (T)**: How clear and compelling is the call-to-action?

REQUIRED OUTPUT FORMAT (JSON):
{
  "assessments": [
    {
      "stepIndex": 0,
      "motivation_score": 4.2,
      "ability_score": 3.8,
      "trigger_score": 4.0,
      "overall_score": 4.0,
      "barriers": ["Specific barrier identified"],
      "recommendations": [
        {
          "type": "content_rewrite|interaction_improvement|support_content|ux_enhancement",
          "title": "Clear recommendation title",
          "description": "Detailed explanation of the recommendation",
          "before": "Current question text or approach",
          "after": "Improved question text or approach",
          "implementation": "Specific steps to implement this change"
        }
      ],
      "improvement_summary": "Primary barrier: X. Focus on Y."
    }
  ]
}

ANALYSIS GUIDELINES:
1. **Score each dimension 1-5** where 5 = optimal
2. **Consider the funnel category context** when making recommendations
3. **Identify specific barriers** for low scores
4. **Provide actionable recommendations** with types:
   - content_rewrite: Better question wording, value props
   - interaction_improvement: Simplify interactions, reduce cognitive load  
   - support_content: Help text, privacy assurance, examples
   - ux_enhancement: Better CTAs, progress indicators, flow improvements

5. **Include before/after examples** for content rewrites
6. **Focus on implementation details** - how exactly to make the change
7. **Consider question characteristics**:
   - High invasiveness → Privacy/trust issues
   - High difficulty → Need help/examples
   - Multiple questions → Progressive disclosure
   - Unclear purpose → Add value explanation

Provide comprehensive, actionable recommendations that directly improve conversion rates.`;

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert conversion rate optimization specialist with deep knowledge of the Fogg Behavior Model. Provide detailed, actionable recommendations with specific content rewrites."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const aiResponse = response.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from OpenAI');
    }

    // Parse JSON response
    let result;
    try {
      // Clean the response text
      const cleanedText = aiResponse.trim()
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '');
      result = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.log('Raw response:', aiResponse);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate response structure
    if (!result.assessments || !Array.isArray(result.assessments)) {
      throw new Error('Invalid response structure from OpenAI');
    }

    console.log(`✅ Fogg Assessment completed for ${result.assessments.length} steps`);
    
    res.status(200).json(result);

  } catch (error) {
    console.error('Fogg step assessment error:', error);
    res.status(500).json({
      error: 'Fogg step assessment failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 