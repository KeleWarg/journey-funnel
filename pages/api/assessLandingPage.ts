import { NextApiRequest, NextApiResponse } from 'next';

interface LandingPageFold {
  id: string;
  headline: string;
  subheadline?: string;
  cta: string;
  textBoxes: string[];
  socialProof?: string;
}

interface LandingPageContent {
  folds: LandingPageFold[];
}

interface LandingPageFrameworkAssessment {
  framework: string;
  issues: string[];
  suggestions: string[];
  rewrittenContent?: {
    headline?: string;
    subheadline?: string;
    textBoxes?: string[];
    cta?: string;
    socialProof?: string;
  };
  score?: number;
}

interface LandingPageContentAssessment {
  foldId: string;
  foldIndex: number;
  contentType: 'headline' | 'subheadline' | 'textBox' | 'cta' | 'socialProof';
  contentIndex?: number; // For textBoxes
  originalContent: string;
  frameworkAssessments: LandingPageFrameworkAssessment[];
}

// Mock analysis function - in production this would call the same MCP service as journey steps
const analyzeLandingPageContent = async (
  content: LandingPageContent, 
  categoryTitle: string, 
  frameworks: string[]
): Promise<{ assessments: LandingPageContentAssessment[]; overallScore: number; topRecommendations: string[] }> => {
  
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const assessments: LandingPageContentAssessment[] = [];

  // Process each fold
  content.folds.forEach((fold, foldIndex) => {
    // Process headline
    if (fold.headline.trim()) {
      const frameworkAssessments = frameworks.map(framework => 
        generateFrameworkAnalysis(framework, 'headline', fold.headline, categoryTitle, foldIndex)
      );
      assessments.push({
        foldId: fold.id,
        foldIndex,
        contentType: 'headline',
        originalContent: fold.headline,
        frameworkAssessments
      });
    }

    // Process subheadline
    if (fold.subheadline?.trim()) {
      const frameworkAssessments = frameworks.map(framework => 
        generateFrameworkAnalysis(framework, 'subheadline', fold.subheadline!, categoryTitle, foldIndex)
      );
      assessments.push({
        foldId: fold.id,
        foldIndex,
        contentType: 'subheadline',
        originalContent: fold.subheadline,
        frameworkAssessments
      });
    }

    // Process CTA
    if (fold.cta.trim()) {
      const frameworkAssessments = frameworks.map(framework => 
        generateFrameworkAnalysis(framework, 'cta', fold.cta, categoryTitle, foldIndex)
      );
      assessments.push({
        foldId: fold.id,
        foldIndex,
        contentType: 'cta',
        originalContent: fold.cta,
        frameworkAssessments
      });
    }

    // Process text boxes
    fold.textBoxes.forEach((textBox, textIndex) => {
      if (textBox.trim()) {
        const frameworkAssessments = frameworks.map(framework => 
          generateFrameworkAnalysis(framework, 'textBox', textBox, categoryTitle, foldIndex, textIndex)
        );
        assessments.push({
          foldId: fold.id,
          foldIndex,
          contentType: 'textBox',
          contentIndex: textIndex,
          originalContent: textBox,
          frameworkAssessments
        });
      }
    });

    // Process social proof
    if (fold.socialProof?.trim()) {
      const frameworkAssessments = frameworks.map(framework => 
        generateFrameworkAnalysis(framework, 'socialProof', fold.socialProof!, categoryTitle, foldIndex)
      );
      assessments.push({
        foldId: fold.id,
        foldIndex,
        contentType: 'socialProof',
        originalContent: fold.socialProof,
        frameworkAssessments
      });
    }
  });

  // Calculate overall score
  const allScores = assessments.flatMap(a => 
    a.frameworkAssessments.map(f => f.score).filter(s => s !== undefined)
  ) as number[];
  const overallScore = allScores.length > 0 ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length : 3.5;

  // Generate top recommendations
  const allSuggestions = assessments.flatMap(a => 
    a.frameworkAssessments.flatMap(f => f.suggestions)
  );
  const topRecommendations = allSuggestions.slice(0, 5); // Top 5 recommendations

  return {
    assessments,
    overallScore,
    topRecommendations
  };
};

const generateFrameworkAnalysis = (
  framework: string, 
  contentType: string, 
  content: string, 
  categoryTitle: string,
  foldIndex: number,
  textBoxIndex?: number
): LandingPageFrameworkAssessment => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let rewrittenContent: any = {};
  let score = 3.5;

  const foldContext = `Fold ${foldIndex + 1}`;
  const textBoxContext = textBoxIndex !== undefined ? ` (Text Box ${textBoxIndex + 1})` : '';

  switch (framework) {
    case 'PAS':
      if (contentType === 'headline') {
        if (!content.toLowerCase().includes('problem') && !content.includes('?')) {
          issues.push(`${foldContext}: Headline doesn't clearly identify the problem`);
          suggestions.push(`${foldContext}: Start with a problem-focused question or statement`);
          score -= 0.5;
        }
        rewrittenContent.headline = `Are you struggling with ${categoryTitle.toLowerCase()} challenges? Here's your solution.`;
      } else if (contentType === 'textBox') {
        if (content.length < 50) {
          issues.push(`${foldContext}${textBoxContext}: Text too short to properly agitate the problem`);
          suggestions.push(`${foldContext}${textBoxContext}: Expand on the pain points and consequences`);
          score -= 0.3;
        }
        suggestions.push(`${foldContext}${textBoxContext}: Structure as Problem → Agitation → Solution`);
      }
      break;

    case 'AIDA':
      if (contentType === 'headline') {
        if (!content.match(/[!?]/) && content.length < 10) {
          issues.push(`${foldContext}: Headline lacks attention-grabbing elements`);
          suggestions.push(`${foldContext}: Use power words, numbers, or questions to capture attention`);
          score -= 0.4;
        }
        rewrittenContent.headline = `Transform Your ${categoryTitle} Results in 30 Days!`;
      } else if (contentType === 'cta') {
        if (content.toLowerCase().includes('submit') || content.toLowerCase().includes('click')) {
          issues.push(`${foldContext}: CTA uses weak action words`);
          suggestions.push(`${foldContext}: Use desire-driven action words like "Get", "Start", "Unlock"`);
          score -= 0.6;
        }
        rewrittenContent.cta = `Get My ${categoryTitle} Solution Now`;
      }
      break;

    case 'Cialdini':
      if (contentType === 'socialProof') {
        if (!content || content.length < 20) {
          issues.push(`${foldContext}: Missing or insufficient social proof`);
          suggestions.push(`${foldContext}: Add testimonials, user counts, or authority endorsements`);
          score -= 0.8;
        }
      } else if (contentType === 'cta') {
        if (!content.toLowerCase().includes('limited') && !content.toLowerCase().includes('now')) {
          suggestions.push(`${foldContext}: Add scarcity or urgency elements to increase action`);
          rewrittenContent.cta = `${content} - Limited Time Offer`;
        }
      }
      break;

    case 'Nielsen':
      if (contentType === 'textBox') {
        if (content.split('.').length > 8) {
          issues.push(`${foldContext}${textBoxContext}: Text may be too complex - consider breaking into smaller chunks`);
          suggestions.push(`${foldContext}${textBoxContext}: Use bullet points and shorter paragraphs for better readability`);
          score -= 0.2;
        }
      } else if (contentType === 'headline') {
        if (content.length > 60) {
          issues.push(`${foldContext}: Headline may be too long for optimal readability`);
          suggestions.push(`${foldContext}: Keep headlines under 60 characters for better comprehension`);
          score -= 0.3;
        }
      }
      break;

    case 'Fogg':
      if (contentType === 'cta') {
        if (content.split(' ').length > 3) {
          issues.push(`${foldContext}: CTA may be too complex - reduce cognitive load`);
          suggestions.push(`${foldContext}: Simplify to 1-3 words for easier decision making`);
          score -= 0.4;
        }
        rewrittenContent.cta = 'Start Now';
      } else if (contentType === 'textBox') {
        if (!content.toLowerCase().includes('easy') && !content.toLowerCase().includes('simple')) {
          suggestions.push(`${foldContext}${textBoxContext}: Emphasize ease and simplicity to reduce perceived effort`);
        }
      }
      break;
  }

  // Add some positive reinforcement
  if (issues.length === 0) {
    suggestions.push(`${foldContext}: ${contentType}${textBoxContext} effectively applies ${framework} principles`);
    score += 0.2;
  }

  return {
    framework,
    issues,
    suggestions,
    rewrittenContent: Object.keys(rewrittenContent).length > 0 ? rewrittenContent : undefined,
    score: Math.min(5, Math.max(1, score))
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, categoryTitle, frameworks } = req.body;

    if (!content || !categoryTitle || !frameworks) {
      return res.status(400).json({ error: 'Missing required fields: content, categoryTitle, frameworks' });
    }

    if (!content.folds || !Array.isArray(content.folds) || content.folds.length === 0) {
      return res.status(400).json({ error: 'Content must contain at least one fold' });
    }

    // Validate that at least one fold has required content
    const hasValidFold = content.folds.some((fold: LandingPageFold) => 
      fold.headline?.trim() && 
      fold.cta?.trim() && 
      fold.textBoxes?.some((text: string) => text.trim())
    );

    if (!hasValidFold) {
      return res.status(400).json({ error: 'At least one fold must have headline, CTA, and text content' });
    }

    const result = await analyzeLandingPageContent(content, categoryTitle, frameworks);

    res.status(200).json(result);
  } catch (error) {
    console.error('Landing page analysis error:', error);
    res.status(500).json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
} 