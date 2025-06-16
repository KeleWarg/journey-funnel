import { NextApiRequest, NextApiResponse } from 'next';

interface LandingPageContent {
  headline: string;
  subheadline?: string;
  bodyText: string;
  cta: string;
  supportingCopy?: string;
  valueProposition?: string;
  socialProof?: string;
}

interface LandingPageFrameworkAssessment {
  framework: string;
  issues: string[];
  suggestions: string[];
  rewrittenContent?: {
    headline?: string;
    subheadline?: string;
    bodyText?: string;
    cta?: string;
    valueProposition?: string;
  };
  score?: number;
}

interface LandingPageContentAssessment {
  contentType: 'headline' | 'subheadline' | 'bodyText' | 'cta' | 'valueProposition' | 'supportingCopy' | 'socialProof';
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
  
  const contentElements = [
    { type: 'headline' as const, content: content.headline },
    { type: 'subheadline' as const, content: content.subheadline || '' },
    { type: 'bodyText' as const, content: content.bodyText },
    { type: 'cta' as const, content: content.cta },
    { type: 'valueProposition' as const, content: content.valueProposition || '' },
    { type: 'supportingCopy' as const, content: content.supportingCopy || '' },
    { type: 'socialProof' as const, content: content.socialProof || '' }
  ].filter(element => element.content.trim().length > 0);

  const assessments: LandingPageContentAssessment[] = contentElements.map(element => {
    const frameworkAssessments: LandingPageFrameworkAssessment[] = frameworks.map(framework => {
      // Generate framework-specific analysis based on content type and framework
      const analysis = generateFrameworkAnalysis(framework, element.type, element.content, categoryTitle);
      return analysis;
    });

    return {
      contentType: element.type,
      originalContent: element.content,
      frameworkAssessments
    };
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
  categoryTitle: string
): LandingPageFrameworkAssessment => {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let rewrittenContent: any = {};
  let score = 3.5;

  switch (framework) {
    case 'PAS':
      if (contentType === 'headline') {
        if (!content.toLowerCase().includes('problem') && !content.includes('?')) {
          issues.push('Headline doesn\'t clearly identify the problem');
          suggestions.push('Start with a problem-focused question or statement');
          score -= 0.5;
        }
        rewrittenContent.headline = `Are you struggling with ${categoryTitle.toLowerCase()} challenges? Here's your solution.`;
      } else if (contentType === 'bodyText') {
        if (content.length < 100) {
          issues.push('Body text too short to properly agitate the problem');
          suggestions.push('Expand on the pain points and consequences of not solving the problem');
          score -= 0.3;
        }
        suggestions.push('Structure content as: Problem → Agitation → Solution for maximum impact');
      }
      break;

    case 'AIDA':
      if (contentType === 'headline') {
        if (!content.match(/[!?]/) && content.length < 10) {
          issues.push('Headline lacks attention-grabbing elements');
          suggestions.push('Use power words, numbers, or questions to capture attention');
          score -= 0.4;
        }
        rewrittenContent.headline = `Transform Your ${categoryTitle} Results in 30 Days!`;
      } else if (contentType === 'cta') {
        if (content.toLowerCase().includes('submit') || content.toLowerCase().includes('click')) {
          issues.push('CTA uses weak action words');
          suggestions.push('Use desire-driven action words like "Get", "Start", "Unlock"');
          score -= 0.6;
        }
        rewrittenContent.cta = `Get My ${categoryTitle} Solution Now`;
      }
      break;

    case 'Cialdini':
      if (contentType === 'socialProof') {
        if (!content || content.length < 20) {
          issues.push('Missing or insufficient social proof');
          suggestions.push('Add testimonials, user counts, or authority endorsements');
          score -= 0.8;
        }
      } else if (contentType === 'cta') {
        if (!content.toLowerCase().includes('limited') && !content.toLowerCase().includes('now')) {
          suggestions.push('Add scarcity or urgency elements to increase action');
          rewrittenContent.cta = `${content} - Limited Time Offer`;
        }
      }
      break;

    case 'Nielsen':
      if (contentType === 'bodyText') {
        if (content.split('.').length > 10) {
          issues.push('Text may be too complex - consider breaking into smaller chunks');
          suggestions.push('Use bullet points and shorter paragraphs for better readability');
          score -= 0.2;
        }
      } else if (contentType === 'headline') {
        if (content.length > 60) {
          issues.push('Headline may be too long for optimal readability');
          suggestions.push('Keep headlines under 60 characters for better comprehension');
          score -= 0.3;
        }
      }
      break;

    case 'Fogg':
      if (contentType === 'cta') {
        if (content.split(' ').length > 3) {
          issues.push('CTA may be too complex - reduce cognitive load');
          suggestions.push('Simplify to 1-3 words for easier decision making');
          score -= 0.4;
        }
        rewrittenContent.cta = 'Start Now';
      } else if (contentType === 'bodyText') {
        if (!content.toLowerCase().includes('easy') && !content.toLowerCase().includes('simple')) {
          suggestions.push('Emphasize ease and simplicity to reduce perceived effort');
        }
      }
      break;
  }

  // Add some positive reinforcement
  if (issues.length === 0) {
    suggestions.push(`${contentType} effectively applies ${framework} principles`);
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

    if (!content.headline || !content.bodyText || !content.cta) {
      return res.status(400).json({ error: 'Missing required content fields: headline, bodyText, cta' });
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