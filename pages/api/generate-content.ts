import { NextApiRequest, NextApiResponse } from 'next';

interface CompetitorData {
  url: string;
  extractedContent: {
    headlines: string[];
    ctaButtons: string[];
    valuePropositions: string[];
    socialProof: string[];
    metadata: {
      title?: string;
      description?: string;
    };
  };
}

interface GeneratedContent {
  landingPageFolds: Array<{
    headline: string;
    subheadline: string;
    cta: string;
    textBoxes: string[];
    socialProof: string;
  }>;
  widgets: Array<{
    heading: string;
    subheading: string;
    textInputPlaceholder: string;
    ctaCopy: string;
    supportTexts: string[];
  }>;
  insights: {
    competitorAnalysis: string;
    foggOptimizations: string[];
    psychologicalTriggers: string[];
  };
}

// Helper function to analyze competitor patterns
function analyzeCompetitorPatterns(competitorData: CompetitorData[]): any {
  const allHeadlines = competitorData.flatMap(d => d.extractedContent.headlines);
  const allCTAs = competitorData.flatMap(d => d.extractedContent.ctaButtons);
  const allValueProps = competitorData.flatMap(d => d.extractedContent.valuePropositions);
  const allSocialProof = competitorData.flatMap(d => d.extractedContent.socialProof);

  return {
    commonHeadlinePatterns: extractPatterns(allHeadlines),
    popularCTAFormats: extractPatterns(allCTAs),
    valuePropositionThemes: extractPatterns(allValueProps),
    socialProofTypes: extractPatterns(allSocialProof),
    totalCompetitors: competitorData.length
  };
}

function extractPatterns(items: string[]): string[] {
  // Simple pattern extraction - look for common words/phrases
  const wordCounts: { [key: string]: number } = {};
  
  items.forEach(item => {
    const words = item.toLowerCase().match(/\b\w+\b/g) || [];
    words.forEach(word => {
      if (word.length > 3) { // Skip short words
        wordCounts[word] = (wordCounts[word] || 0) + 1;
      }
    });
  });

  return Object.entries(wordCounts)
    .filter(([_, count]) => count > 1)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

// Generate optimized content using AI principles
function generateOptimizedContent(
  competitorAnalysis: any,
  industry: string,
  targetAudience: string
): GeneratedContent {
  
  // Generate landing page folds based on competitor analysis
  const landingPageFolds = [
    {
      headline: generateHeadline(competitorAnalysis, 'primary'),
      subheadline: generateSubheadline(competitorAnalysis, industry),
      cta: generateCTA(competitorAnalysis, 'primary'),
      textBoxes: [
        generateValueProp(competitorAnalysis, 'benefit-focused'),
        generateValueProp(competitorAnalysis, 'feature-focused'),
        generateValueProp(competitorAnalysis, 'outcome-focused')
      ],
      socialProof: generateSocialProof(competitorAnalysis)
    },
    {
      headline: generateHeadline(competitorAnalysis, 'secondary'),
      subheadline: generateSubheadline(competitorAnalysis, industry),
      cta: generateCTA(competitorAnalysis, 'secondary'),
      textBoxes: [
        generateValueProp(competitorAnalysis, 'problem-solution'),
        generateValueProp(competitorAnalysis, 'urgency-focused')
      ],
      socialProof: generateSocialProof(competitorAnalysis, 'testimonial')
    }
  ];

  // Generate widgets based on competitor analysis
  const widgets = [
    {
      heading: generateWidgetHeading(competitorAnalysis, 'lead-capture'),
      subheading: generateWidgetSubheading(competitorAnalysis, 'value-focused'),
      textInputPlaceholder: generatePlaceholder(targetAudience),
      ctaCopy: generateCTA(competitorAnalysis, 'widget'),
      supportTexts: [
        generateSupportText(competitorAnalysis, 'privacy'),
        generateSupportText(competitorAnalysis, 'benefit')
      ]
    },
    {
      heading: generateWidgetHeading(competitorAnalysis, 'newsletter'),
      subheading: generateWidgetSubheading(competitorAnalysis, 'content-focused'),
      textInputPlaceholder: 'Enter your email address',
      ctaCopy: generateCTA(competitorAnalysis, 'newsletter'),
      supportTexts: [
        generateSupportText(competitorAnalysis, 'frequency'),
        generateSupportText(competitorAnalysis, 'value')
      ]
    }
  ];

  // Generate Fogg-based insights from competitor analysis
  const foggInsights = generateFoggInsights(competitorAnalysis, industry);

  const insights = {
    competitorAnalysis: `Analyzed ${competitorAnalysis.totalCompetitors} competitors. Common patterns include: ${competitorAnalysis.commonHeadlinePatterns.slice(0, 3).join(', ')}`,
    foggOptimizations: foggInsights.foggOptimizations,
    psychologicalTriggers: foggInsights.psychologicalTriggers
  };

  return {
    landingPageFolds,
    widgets,
    insights
  };
}

// Content generation helper functions
function generateHeadline(analysis: any, type: 'primary' | 'secondary'): string {
  const patterns = analysis.commonHeadlinePatterns;
  const templates = type === 'primary' ? [
    `Transform Your ${patterns[0] || 'Business'} in 30 Days`,
    `Get 10x More ${patterns[1] || 'Results'} Starting Today`,
    `The Ultimate ${patterns[0] || 'Solution'} for ${patterns[1] || 'Success'}`
  ] : [
    `Why ${patterns[0] || 'Smart'} ${patterns[1] || 'Businesses'} Choose Us`,
    `Join Thousands Who've ${patterns[0] || 'Transformed'} Their ${patterns[1] || 'Results'}`,
    `Ready to ${patterns[0] || 'Boost'} Your ${patterns[1] || 'Performance'}?`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateSubheadline(analysis: any, industry: string): string {
  const templates = [
    `Discover how leading ${industry} companies are achieving breakthrough results with our proven system.`,
    `Join the ${industry} revolution and unlock your potential with our comprehensive solution.`,
    `See why ${industry} professionals trust us to deliver exceptional outcomes every time.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

function generateCTA(analysis: any, type: string): string {
  const ctaPatterns = analysis.popularCTAFormats;
  const templates = {
    primary: ['Get Started Free', 'Start Your Free Trial', 'Claim Your Spot'],
    secondary: ['Learn More', 'See How It Works', 'Get Demo'],
    widget: ['Join Now', 'Get Access', 'Sign Me Up'],
    newsletter: ['Subscribe', 'Get Updates', 'Stay Informed']
  };
  
  const options = templates[type as keyof typeof templates] || templates.primary;
  return options[Math.floor(Math.random() * options.length)];
}

function generateValueProp(analysis: any, focus: string): string {
  const templates = {
    'benefit-focused': 'Increase your results by 300% with our proven methodology',
    'feature-focused': 'Advanced analytics and real-time insights at your fingertips',
    'outcome-focused': 'Join 10,000+ satisfied customers who transformed their business',
    'problem-solution': 'Stop wasting time on ineffective strategies that don\'t work',
    'urgency-focused': 'Limited time: Get exclusive access to our premium features'
  };
  
  return templates[focus as keyof typeof templates] || templates['benefit-focused'];
}

function generateSocialProof(analysis: any, type: string = 'general'): string {
  const templates = {
    general: 'Trusted by 50,000+ businesses worldwide',
    testimonial: '"This solution increased our conversion rate by 400% in just 2 months!" - Sarah Johnson, CEO',
    numbers: '10,000+ customers • 99% satisfaction rate • 24/7 support'
  };
  
  return templates[type as keyof typeof templates] || templates.general;
}

function generateWidgetHeading(analysis: any, type: string): string {
  const templates = {
    'lead-capture': 'Get Your Free Strategy Session',
    'newsletter': 'Stay Ahead of the Competition',
    'contact': 'Ready to Get Started?'
  };
  
  return templates[type as keyof typeof templates] || templates['lead-capture'];
}

function generateWidgetSubheading(analysis: any, focus: string): string {
  const templates = {
    'value-focused': 'Discover the secrets top performers use to dominate their market',
    'content-focused': 'Get weekly insights and proven strategies delivered to your inbox',
    'urgency-focused': 'Limited spots available - secure yours today'
  };
  
  return templates[focus as keyof typeof templates] || templates['value-focused'];
}

function generatePlaceholder(targetAudience: string): string {
  return `Enter your ${targetAudience.includes('business') ? 'business' : 'work'} email`;
}

function generateSupportText(analysis: any, type: string): string {
  const templates = {
    privacy: '🔒 Your information is 100% secure and never shared',
    benefit: '✨ Get instant access to exclusive resources',
    frequency: '📧 Weekly insights delivered every Tuesday',
    value: '💡 Join 25,000+ professionals getting ahead'
  };
  
  return templates[type as keyof typeof templates] || templates.benefit;
}

// Generate Fogg Behavior Model insights from competitor analysis
function generateFoggInsights(competitorAnalysis: any, industry: string): {
  foggOptimizations: string[];
  psychologicalTriggers: string[];
} {
  const { commonHeadlinePatterns, popularCTAFormats, valuePropositionThemes, socialProofTypes } = competitorAnalysis;
  
  // Analyze competitor patterns through Fogg B=MAT lens
  const motivationInsights = analyzeMotivationPatterns(valuePropositionThemes, socialProofTypes);
  const abilityInsights = analyzeAbilityPatterns(commonHeadlinePatterns, popularCTAFormats);
  const triggerInsights = analyzeTriggerPatterns(popularCTAFormats, socialProofTypes);
  
  return {
    foggOptimizations: [
      `Motivation: ${motivationInsights}`,
      `Ability: ${abilityInsights}`,
      `Trigger: ${triggerInsights}`
    ],
    psychologicalTriggers: [
      `Social Proof: Competitors use ${socialProofTypes.slice(0, 2).join(' and ')} to build credibility`,
      `Scarcity: ${popularCTAFormats.filter((cta: string) => cta.includes('now') || cta.includes('start')).length > 0 ? 'Urgency-based CTAs found in competitor analysis' : 'Consider adding urgency elements'}`,
      `Authority: ${industry} industry patterns show emphasis on ${commonHeadlinePatterns[0] || 'professional solutions'}`
    ]
  };
}

// Analyze competitor value propositions for motivation insights
function analyzeMotivationPatterns(valueProps: string[], socialProof: string[]): string {
  const benefitKeywords = ['increase', 'save', 'boost', 'improve', 'reduce', 'eliminate'];
  const outcomeKeywords = ['results', 'success', 'growth', 'profit', 'efficiency'];
  
  const hasBenefitFocus = valueProps.some(prop => 
    benefitKeywords.some(keyword => prop.toLowerCase().includes(keyword))
  );
  
  const hasOutcomeFocus = valueProps.some(prop =>
    outcomeKeywords.some(keyword => prop.toLowerCase().includes(keyword))
  );
  
  if (hasBenefitFocus && hasOutcomeFocus) {
    return 'Competitors emphasize both immediate benefits and long-term outcomes to maximize user motivation';
  } else if (hasBenefitFocus) {
    return 'Competitors focus on immediate benefits - consider adding outcome-based messaging';
  } else if (hasOutcomeFocus) {
    return 'Competitors emphasize outcomes - consider adding immediate benefit messaging';
  } else {
    return 'Competitors lack clear benefit messaging - opportunity to differentiate with strong value propositions';
  }
}

// Analyze competitor headlines and CTAs for ability insights
function analyzeAbilityPatterns(headlines: string[], ctas: string[]): string {
  const simplicityKeywords = ['easy', 'simple', 'quick', 'fast', 'instant'];
  const complexityIndicators = ['comprehensive', 'advanced', 'complete', 'full'];
  
  const emphasizesSimplicity = [...headlines, ...ctas].some(text =>
    simplicityKeywords.some(keyword => text.toLowerCase().includes(keyword))
  );
  
  const emphasizesComprehensiveness = [...headlines, ...ctas].some(text =>
    complexityIndicators.some(keyword => text.toLowerCase().includes(keyword))
  );
  
  const avgCtaLength = ctas.reduce((sum, cta) => sum + cta.split(' ').length, 0) / ctas.length;
  
  if (emphasizesSimplicity) {
    return 'Competitors emphasize ease of use - maintain simple, clear messaging to reduce cognitive load';
  } else if (avgCtaLength > 3) {
    return 'Competitors use complex CTAs - opportunity to simplify for better conversion';
  } else {
    return 'Competitors balance simplicity with comprehensiveness - ensure clear next steps';
  }
}

// Analyze competitor CTAs and social proof for trigger insights
function analyzeTriggerPatterns(ctas: string[], socialProof: string[]): string {
  const urgencyKeywords = ['now', 'today', 'limited', 'hurry', 'deadline'];
  const actionKeywords = ['get', 'start', 'join', 'claim', 'access'];
  
  const hasUrgency = ctas.some(cta =>
    urgencyKeywords.some(keyword => cta.toLowerCase().includes(keyword))
  );
  
  const hasStrongAction = ctas.some(cta =>
    actionKeywords.some(keyword => cta.toLowerCase().includes(keyword))
  );
  
  const hasNumberedProof = socialProof.some(proof =>
    /\d+[k%+]|\d+,\d+/.test(proof)
  );
  
  if (hasUrgency && hasStrongAction) {
    return 'Competitors use both urgency and action-oriented triggers effectively';
  } else if (hasStrongAction) {
    return 'Competitors use action words - consider adding urgency elements for stronger triggers';
  } else if (hasNumberedProof) {
    return 'Competitors rely on social proof numbers - ensure clear action triggers are present';
  } else {
    return 'Competitors lack strong triggers - opportunity to add urgency and clear calls-to-action';
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🚀 Generate content API called with body:', JSON.stringify(req.body, null, 2));
  
  const { competitorUrls, industry = 'business', targetAudience = 'business owners' } = req.body;

  console.log('📊 Parsed request:', { competitorUrls, industry, targetAudience });

  if (!competitorUrls || !Array.isArray(competitorUrls) || competitorUrls.length === 0) {
    console.error('❌ Invalid competitorUrls:', competitorUrls);
    return res.status(400).json({ error: 'At least one competitor URL is required' });
  }

  try {
    console.log(`🚀 Generating content from ${competitorUrls.length} competitors...`);

    // Scrape all competitor URLs
    const competitorData: CompetitorData[] = [];
    
    // Get the correct base URL for internal API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   (req.headers.host ? `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}` : 'http://localhost:3001');
    
    console.log('🌐 Using base URL for scraping:', baseUrl);
    
    for (const url of competitorUrls) {
      if (url.trim()) {
        try {
          console.log(`🔍 Scraping competitor: ${url.trim()}`);
          
          const response = await fetch(`${baseUrl}/api/scrape-competitor`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url.trim() })
          });
          
          console.log(`📡 Scrape response for ${url}: status ${response.status}`);
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Successfully scraped ${url}`);
            competitorData.push(data);
          } else {
            console.warn(`⚠️ Failed to scrape ${url}: HTTP ${response.status}`);
            
            // If it's a configuration error, log it
            if (response.status === 500) {
              const errorData = await response.json().catch(() => ({}));
              if (errorData.error && errorData.error.includes('API key')) {
                console.warn(`⚠️ Firecrawl not configured: ${errorData.details}`);
              }
            }
          }
        } catch (error) {
          console.warn(`❌ Failed to scrape ${url}:`, error);
        }
      }
    }

    console.log(`📊 Successfully scraped ${competitorData.length} out of ${competitorUrls.length} competitors`);

    // Use fallback data if no competitors were scraped successfully
    let competitorAnalysis;
    if (competitorData.length === 0) {
      console.log('⚠️ No competitor data available, using fallback patterns');
      competitorAnalysis = {
        totalCompetitors: 0,
        commonHeadlinePatterns: [
          'Transform Your Business',
          'Get Results Fast',
          'Increase Performance',
          'Boost Conversions',
          'Save Time'
        ],
        popularCTAFormats: [
          'Get Started Free',
          'Start Your Trial',
          'Learn More',
          'Book a Demo',
          'Sign Up Now'
        ],
        valuePropositionThemes: [
          'Increase efficiency and save time',
          'Boost conversions and revenue',
          'Get results in 30 days or less',
          'Trusted by thousands of businesses',
          'Easy to use, no technical skills required'
        ],
        socialProofTypes: [
          'customer testimonials',
          'usage statistics',
          'company logos',
          'success stories'
        ]
      };
    } else {
      // Analyze competitor patterns
      console.log('🔍 Analyzing competitor patterns...');
      competitorAnalysis = analyzeCompetitorPatterns(competitorData);
    }

    // Generate optimized content
    console.log('✨ Generating optimized content...');
    const generatedContent = generateOptimizedContent(
      competitorAnalysis,
      industry,
      targetAudience
    );

    console.log('✅ Successfully generated content:', {
      folds: generatedContent.landingPageFolds.length,
      widgets: generatedContent.widgets.length,
      competitorsAnalyzed: competitorData.length
    });

    return res.status(200).json({
      success: true,
      generatedContent,
      competitorsAnalyzed: competitorData.length
    });

  } catch (error) {
    console.error('❌ Error generating content:', error);
    return res.status(500).json({ 
      error: 'Failed to generate content',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 