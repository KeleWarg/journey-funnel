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

Provide comprehensive, actionable recommendations that directly improve conversion rates.

IMPORTANT: Return ONLY the JSON object. Do not include any explanatory text before or after the JSON.`;

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
      // Clean the response text and extract JSON
      let cleanedText = aiResponse.trim();
      
      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      
      // Try to find JSON object boundaries
      const jsonStart = cleanedText.indexOf('{');
      const jsonEnd = cleanedText.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanedText = cleanedText.substring(jsonStart, jsonEnd + 1);
      }
      
      result = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', parseError);
      console.log('Raw response:', aiResponse);
      
      // Try alternative parsing - look for assessments array
      try {
        const assessmentsMatch = aiResponse.match(/"assessments"\s*:\s*\[[\s\S]*?\]\s*}/);
        if (assessmentsMatch) {
          const jsonStr = `{${assessmentsMatch[0]}`;
          result = JSON.parse(jsonStr);
        } else {
          throw new Error('Could not extract valid JSON');
        }
      } catch (fallbackError) {
        throw new Error('Invalid JSON response from OpenAI');
      }
    }

    // Validate response structure
    if (!result.assessments || !Array.isArray(result.assessments)) {
      throw new Error('Invalid response structure from OpenAI');
    }

    console.log(`✅ Fogg Assessment completed for ${result.assessments.length} steps`);
    console.log('🔍 Sample assessment:', JSON.stringify(result.assessments[0], null, 2));
    
    // Mark as live (not mock)
    result.isMock = false;
    
    res.status(200).json(result);

  } catch (error) {
    console.error('Fogg step assessment error:', error);
    
    // Provide enhanced fallback with realistic mock data when API fails
    console.log('🔄 Providing enhanced fallback Fogg assessment due to error');
    
    const mockAssessments = req.body.steps.map((step: Step, index: number) => ({
      stepIndex: index,
      motivation_score: 3.8 + Math.random() * 1.2, // 3.8-5.0 range
      ability_score: 3.5 + Math.random() * 1.0,    // 3.5-4.5 range  
      trigger_score: 3.2 + Math.random() * 1.3,    // 3.2-4.5 range
      overall_score: 3.5 + Math.random() * 1.0,    // 3.5-4.5 range
      barriers: [
        "Question complexity may reduce user motivation",
        "Multiple input fields increase cognitive load"
      ],
      recommendations: [
        {
          type: 'content_rewrite' as const,
          title: 'Improve Question Clarity',
          description: 'Simplify the question wording to reduce cognitive load and increase completion rates.',
          before: step.questions[0]?.title || 'Current question',
          after: `What's your ${step.questions[0]?.title?.toLowerCase().includes('email') ? 'email address' : 'information'}? (This helps us personalize your experience)`,
          implementation: 'Update the question text and add a brief value proposition explanation.'
        },
        {
          type: 'support_content' as const,
          title: 'Add Progress Indicator',
          description: 'Show users their progress through the funnel to maintain motivation.',
          implementation: 'Add a progress bar showing "Step X of Y" above the question.'
        }
      ],
      improvement_summary: `Primary barrier: ${step.questions.length > 1 ? 'Multiple questions increase complexity' : 'Question clarity could be improved'}. Focus on simplifying language and adding progress indicators.`
    }));
    
    const fallbackResponse = {
      assessments: mockAssessments,
      isMock: true
    };
    
    res.status(200).json(fallbackResponse);
  }
} 