import OpenAI from "openai";
import { NextApiRequest, NextApiResponse } from 'next';
import { cache } from '../../lib/redis';
import { metrics } from '../../lib/metrics';

// Instantiate the OpenAI client using your API key in process.env
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Predefined "psychological frameworks" for question assessment
const FRAMEWORK_DESCRIPTIONS = {
  cognitive_load: `Evaluate question for cognitive load. Suggest ways to simplify wording, reduce required mental effort, and make it clearer.`,
  emotional_tone: `Assess emotional framing—does the question evoke empathy, urgency, or neutral tone? Suggest rewrites to match a given emotion (e.g., increase empathy, lower anxiety).`,
  persuasion_principles: `Apply Cialdini's persuasion principles (reciprocity, scarcity, authority, consistency, liking, consensus). Suggest wording changes that could improve persuasion without being manipulative.`,
  social_identity: `Check if the question language resonates with different social identity groups (e.g., "health-focused," "budget-minded"). Suggest alternative phrasing for inclusivity.`,
  framing_effect: `Evaluate positive vs. negative framing. Suggest reframing to a more user-positive or user-negative angle depending on goal.`,
  // Add any others here (e.g. "nielsen_usability" if you choose)
} as const;

// Circuit breaker configuration
const CIRCUIT_BREAKER = {
  failureThreshold: 5,
  resetTimeout: 60000, // 1 minute
  failures: 0,
  lastFailureTime: 0,
  isOpen: false
};

// Calculate optimal batch size based on question complexity
const getOptimalBatchSize = (questions: Array<{ questionTitle: string }>) => {
  const avgLength = questions.reduce((sum, q) => sum + q.questionTitle.length, 0) / questions.length;
  const complexity = questions.reduce((sum, q) => {
    const words = q.questionTitle.split(/\s+/).length;
    const hasSpecialChars = /[^a-zA-Z0-9\s]/.test(q.questionTitle);
    return sum + (words > 10 ? 2 : 1) + (hasSpecialChars ? 1 : 0);
  }, 0) / questions.length;

  // Adjust batch size based on complexity
  if (avgLength > 100 || complexity > 2) return 2;
  if (avgLength > 50 || complexity > 1.5) return 3;
  return 4;
};

interface AssessmentResult {
  frameworkAssessments: Array<{
    framework: string;
    issues: string[];
    suggestions: string[];
    rewrittenQuestion?: string;
  }>;
}

// Process a single question with retry logic and circuit breaker
const processQuestion = async (
  question: { questionTitle: string; sampleResponses: string[] | string },
  frameworks: string[],
  retries = 2
): Promise<AssessmentResult> => {
  const startTime = Date.now();

  // Check circuit breaker
  if (CIRCUIT_BREAKER.isOpen) {
    const timeSinceLastFailure = Date.now() - CIRCUIT_BREAKER.lastFailureTime;
    if (timeSinceLastFailure < CIRCUIT_BREAKER.resetTimeout) {
      throw new Error('Circuit breaker is open. Please try again later.');
    }
    // Reset circuit breaker if timeout has passed
    CIRCUIT_BREAKER.isOpen = false;
    CIRCUIT_BREAKER.failures = 0;
  }

  try {
    // Check cache first
    const cacheKey = JSON.stringify({ question, frameworks });
    const cached = await cache.get<AssessmentResult>(cacheKey, { prefix: 'question_assessment' });
    if (cached) {
      metrics.track('question_assessment_cache_hit', startTime, true);
      return cached;
    }

    // Format sample responses
    let responsesText = "";
    if (Array.isArray(question.sampleResponses)) {
      responsesText = question.sampleResponses
        .slice(0, 20)
        .map((r: string, i: number) => `${i + 1}. ${r}`)
        .join("\n");
    } else if (typeof question.sampleResponses === "string") {
      const arr = question.sampleResponses
        .split(/\r?\n|,/)
        .map((x) => x.trim())
        .filter((x) => x.length > 0)
        .slice(0, 20);
      responsesText = arr.map((r, i) => `${i + 1}. ${r}`).join("\n");
    }

    // Build prompts
    const chosenFrameworks = frameworks
      .filter((f: string) => f in FRAMEWORK_DESCRIPTIONS)
      .map((f: string) => `• ${FRAMEWORK_DESCRIPTIONS[f as keyof typeof FRAMEWORK_DESCRIPTIONS]}`)
      .join("\n");

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

    const userPrompt = `
Question Title:
"${question.questionTitle}"

Sample User Responses (up to 20):
${responsesText}
`.trim();

    // Call OpenAI with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OpenAI API timeout')), 30000)
    );

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 600,
        temperature: 0.7,
      }),
      timeoutPromise
    ]) as any;

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      throw new Error("No response from OpenAI");
    }

    // Parse and cache result
    const result = JSON.parse(raw);
    await cache.set(cacheKey, result, { prefix: 'question_assessment' });
    metrics.track('question_assessment_success', startTime, true);
    return result;
  } catch (error) {
    // Update circuit breaker
    CIRCUIT_BREAKER.failures++;
    CIRCUIT_BREAKER.lastFailureTime = Date.now();
    if (CIRCUIT_BREAKER.failures >= CIRCUIT_BREAKER.failureThreshold) {
      CIRCUIT_BREAKER.isOpen = true;
    }

    metrics.track('question_assessment_error', startTime, false, error instanceof Error ? error.message : String(error));
    
    if (retries > 0 && !CIRCUIT_BREAKER.isOpen) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return processQuestion(question, frameworks, retries - 1);
    }
    throw error;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = Date.now();
  
  if (req.method !== "POST") {
    metrics.track('question_assessment_invalid_method', startTime, false, 'Method not allowed');
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { questions, frameworks } = req.body;

    // Validate inputs
    if (!Array.isArray(questions) || questions.length === 0) {
      metrics.track('question_assessment_invalid_input', startTime, false, 'questions array required');
      res.status(400).json({ error: "questions (nonempty array) is required" });
      return;
    }
    if (!Array.isArray(frameworks) || frameworks.length === 0) {
      metrics.track('question_assessment_invalid_input', startTime, false, 'frameworks array required');
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