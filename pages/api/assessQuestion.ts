import OpenAI from "openai";
import { NextApiRequest, NextApiResponse } from 'next';
import { cache } from '../../lib/redis';
import { metrics } from '../../lib/metrics';

// Instantiate the OpenAI client using your API key in process.env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Circuit breaker for OpenAI API
const CIRCUIT_BREAKER = {
  failures: 0,
  maxFailures: 5,
  resetTimeout: 60000, // 1 minute
  isOpen: false,
  lastFailureTime: 0,
  
  canExecute(): boolean {
    if (!this.isOpen) return true;
    
    // Check if we should reset the circuit breaker
    if (Date.now() - this.lastFailureTime > this.resetTimeout) {
      this.isOpen = false;
      this.failures = 0;
      console.log('Circuit breaker reset');
      return true;
    }
    
    return false;
  },
  
  recordSuccess(): void {
    this.failures = 0;
    this.isOpen = false;
  },
  
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.maxFailures) {
      this.isOpen = true;
      console.log(`Circuit breaker opened after ${this.failures} failures`);
    }
  }
};

// Predefined "psychological frameworks" for question assessment
const FRAMEWORK_DESCRIPTIONS = {
  cognitive_load: `Evaluate question for cognitive load. Suggest ways to simplify wording, reduce required mental effort, and make it clearer.`,
  emotional_tone: `Assess emotional framing—does the question evoke empathy, urgency, or neutral tone? Suggest rewrites to match a given emotion (e.g., increase empathy, lower anxiety).`,
  persuasion_principles: `Apply Cialdini's persuasion principles (reciprocity, scarcity, authority, consistency, liking, consensus). Suggest wording changes that could improve persuasion without being manipulative.`,
  social_identity: `Check if the question language resonates with different social identity groups (e.g., "health-focused," "budget-minded"). Suggest alternative phrasing for inclusivity.`,
  framing_effect: `Evaluate positive vs. negative framing. Suggest reframing to a more user-positive or user-negative angle depending on goal.`,
  // Add any others here (e.g. "nielsen_usability" if you choose)
} as const;

export interface AssessQuestionRequest extends NextApiRequest {
  body: {
    questions: Array<{
      questionTitle: string;
      sampleResponses: string[] | string;
    }>;
    frameworks: string[];
  };
}

export interface FrameworkAssessment {
  framework: string;
  issues: string[];
  suggestions: string[];
  rewrittenQuestion?: string;
}

export interface AssessmentResult {
  questionTitle: string;
  frameworkAssessments: FrameworkAssessment[];
}

export interface AssessQuestionResponse {
  assessments: AssessmentResult[];
  metrics?: {
    totalTime: number;
    batchSize: number;
    cacheStats: any;
    circuitBreakerStatus: any;
  };
}

// Generate cache key for a question and frameworks
function generateCacheKey(questionTitle: string, frameworks: string[]): string {
  const normalizedTitle = questionTitle.toLowerCase().trim();
  const sortedFrameworks = [...frameworks].sort().join(',');
  return `assessment:${Buffer.from(normalizedTitle + sortedFrameworks).toString('base64')}`;
}

// Get optimal batch size based on question complexity
function getOptimalBatchSize(questions: any[]): number {
  const avgLength = questions.reduce((sum, q) => sum + q.questionTitle.length, 0) / questions.length;
  
  if (avgLength > 100) return 2; // Complex questions
  if (avgLength > 50) return 3;  // Medium questions
  return 5; // Simple questions
}

// Process a single question with caching and error handling
async function processQuestion(question: any, frameworks: string[]): Promise<AssessmentResult> {
  const { questionTitle, sampleResponses } = question;
  const cacheKey = generateCacheKey(questionTitle, frameworks);
  
  // Try to get from cache first
  const cached = await cache.get<AssessmentResult>(cacheKey, { prefix: 'question_assessment' });
  if (cached) {
    console.log(`Cache hit for question: ${questionTitle.substring(0, 50)}...`);
    return cached;
  }
  
  // Check circuit breaker
  if (!CIRCUIT_BREAKER.canExecute()) {
    throw new Error('Circuit breaker is open - OpenAI API temporarily unavailable');
  }
  
  try {
    // Validate individual question
    if (!questionTitle || typeof questionTitle !== "string") {
      throw new Error(`Invalid questionTitle for question: ${questionTitle}`);
    }

    // Reformat sampleResponses into numbered bullet list (max 20)
    let responsesText = "";
    if (Array.isArray(sampleResponses)) {
      responsesText = sampleResponses
        .slice(0, 20)
        .map((r: string, i: number) => `${i + 1}. ${r}`)
        .join("\n");
    } else if (typeof sampleResponses === "string") {
      const arr = sampleResponses
        .split(/\r?\n|,/)
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
        .slice(0, 20);
      responsesText = arr.map((r, i) => `${i + 1}. ${r}`).join("\n");
    }

    // Build the combined description of chosen frameworks
    const chosenFrameworks = frameworks
      .filter((f: string) => f in FRAMEWORK_DESCRIPTIONS)
      .map((f: string) => `• ${FRAMEWORK_DESCRIPTIONS[f as keyof typeof FRAMEWORK_DESCRIPTIONS]}`)
      .join("\n");

    // Construct the system prompt
    const systemPrompt = `
You are an expert UX psychologist and copy-editor. Your task is to evaluate a single survey/form question, given the question text and optional sample responses. You will apply the following psychological frameworks:

${chosenFrameworks}

For each framework:
  1. Identify issues or opportunities in the question's language.
  2. Provide 2–3 concrete suggestions (bullet points) to improve the question.
  3. Optionally, provide a fully rewritten version of the question if it can be made substantially clearer or more emotionally resonant.

Format your response as strictly valid JSON with this shape:
{
  "frameworkAssessments": [
    {
      "framework": "<framework_name>",
      "issues": ["…", "…"],
      "suggestions": ["…", "…"],
      "rewrittenQuestion": "<string, if applicable>"
    }
  ]
}
`.trim();

    // Construct the user prompt
    const userPrompt = `
Question Title:
"${questionTitle}"

Sample User Responses (up to 20):
${responsesText}
`.trim();

    // Call OpenAI's chat endpoint
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError: unknown) {
      throw new Error(`Failed to parse JSON from LLM: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
    }

    const result: AssessmentResult = {
      questionTitle,
      frameworkAssessments: parsed.frameworkAssessments
    };

    // Cache the result
    await cache.set(cacheKey, result, { prefix: 'question_assessment', ttl: 3600 }); // 1 hour cache
    
    // Record success
    CIRCUIT_BREAKER.recordSuccess();
    
    return result;
    
  } catch (error) {
    // Record failure for circuit breaker
    CIRCUIT_BREAKER.recordFailure();
    throw error;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const startTime = Date.now();

  try {
    const { questions, frameworks } = req.body;

    // Validate inputs
    if (!Array.isArray(questions) || questions.length === 0) {
      res.status(400).json({ error: "questions (nonempty array) is required" });
      return;
    }
    if (!Array.isArray(frameworks) || frameworks.length === 0) {
      res.status(400).json({ error: "frameworks (nonempty array) is required" });
      return;
    }

    // Process questions in optimal batches
    const batchSize = getOptimalBatchSize(questions);
    const results: AssessmentResult[] = [];

    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(q => processQuestion(q, frameworks))
      );
      results.push(...batchResults);
    }

    // Get cache statistics
    const cacheStats = cache.getStats();

    // Return all assessments with performance metrics
    metrics.track('question_assessment_complete', startTime, true);
    res.status(200).json({
      assessments: questions.map((q, i) => ({
        questionTitle: q.questionTitle,
        frameworkAssessments: results[i].frameworkAssessments
      })),
      metrics: {
        totalTime: Date.now() - startTime,
        batchSize,
        cacheStats,
        circuitBreakerStatus: {
          isOpen: CIRCUIT_BREAKER.isOpen,
          failures: CIRCUIT_BREAKER.failures,
          timeUntilReset: CIRCUIT_BREAKER.isOpen ? 
            Math.max(0, CIRCUIT_BREAKER.resetTimeout - (Date.now() - CIRCUIT_BREAKER.lastFailureTime)) : 0
        }
      }
    });
  } catch (err) {
    metrics.track('question_assessment_failed', startTime, false, err instanceof Error ? err.message : String(err));
    console.error("Error in /api/assessQuestion:", err);
    res.status(500).json({
      error: "LLM assessment failed",
      details: err instanceof Error ? err.message : String(err)
    });
  }
}