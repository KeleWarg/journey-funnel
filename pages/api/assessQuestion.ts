import OpenAI from "openai";
import { NextApiRequest, NextApiResponse } from 'next';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { questionTitle, sampleResponses, frameworks } = req.body;

    // 1) Validate inputs
    if (!questionTitle || typeof questionTitle !== "string") {
      res.status(400).json({ error: "questionTitle (string) is required" });
      return;
    }
    if (sampleResponses == null) {
      res.status(400).json({ error: "sampleResponses is required" });
      return;
    }
    if (!Array.isArray(frameworks) || frameworks.length === 0) {
      res.status(400).json({ error: "frameworks (nonempty array) is required" });
      return;
    }

    // 2) Build the combined description of chosen frameworks
    const chosenFrameworks = frameworks
      .filter((f: string) => f in FRAMEWORK_DESCRIPTIONS)
      .map((f: string) => `• ${FRAMEWORK_DESCRIPTIONS[f as keyof typeof FRAMEWORK_DESCRIPTIONS]}`)
      .join("\n");

    // 3) Reformat sampleResponses into numbered bullet list (max 20)
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

    // 4) Construct the system prompt
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

    // 5) Construct the user prompt
    const userPrompt = `
Question Title:
"${questionTitle}"

Sample User Responses (up to 20):
${responsesText}
`.trim();

    // 6) Call OpenAI's chat endpoint (using gpt-4o-mini or gpt-4o)
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // or "gpt-4o" if accessible
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 600,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    if (!raw) {
      res.status(500).json({ error: "No response from OpenAI" });
      return;
    }

    // 7) Try to parse as JSON
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      res.status(200).json({
        error: "Failed to parse JSON from LLM. Here's the raw output:",
        raw,
      });
      return;
    }

    // 8) Return the parsed JSON
    res.status(200).json(parsed);
  } catch (err: unknown) {
    console.error("Error in /api/assessQuestion:", err);
    res.status(500).json({ 
      error: "LLM assessment failed", 
      details: err instanceof Error ? err.message : String(err)
    });
  }
}