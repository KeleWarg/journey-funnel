import { NextApiRequest, NextApiResponse } from 'next';

interface FirecrawlResponse {
  success: boolean;
  data?: {
    markdown?: string;
    html?: string;
    metadata?: {
      title?: string;
      description?: string;
    };
  };
  error?: string;
}

interface ExtractedContent {
  headlines: string[];
  ctaButtons: string[];
  valuePropositions: string[];
  socialProof: string[];
  metadata: {
    title?: string;
    description?: string;
  };
}

// Helper function to extract headlines from markdown content
function extractHeadlines(markdown: string): string[] {
  const headlines: string[] = [];
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    // Extract H1-H3 headers
    const headerMatch = line.match(/^#{1,3}\s+(.+)$/);
    if (headerMatch) {
      headlines.push(headerMatch[1].trim());
    }
  }
  
  return headlines.slice(0, 10); // Limit to top 10 headlines
}

// Helper function to extract CTA buttons and links
function extractCTAs(markdown: string): string[] {
  const ctas: string[] = [];
  
  // Extract markdown links that look like CTAs
  const linkRegex = /\[([^\]]+)\]\([^)]+\)/g;
  let match;
  
  while ((match = linkRegex.exec(markdown)) !== null) {
    const linkText = match[1];
    // Filter for CTA-like text
    if (linkText.match(/\b(get|start|try|buy|sign|join|learn|download|contact|book|schedule|free|now)\b/i)) {
      ctas.push(linkText);
    }
  }
  
  return [...new Set(ctas)].slice(0, 8); // Remove duplicates and limit
}

// Helper function to extract value propositions
function extractValuePropositions(markdown: string): string[] {
  const valueProps: string[] = [];
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Look for benefit-oriented sentences
    if (trimmed.length > 20 && trimmed.length < 200) {
      if (trimmed.match(/\b(save|increase|improve|boost|reduce|eliminate|guarantee|ensure|deliver|provide)\b/i)) {
        valueProps.push(trimmed);
      }
    }
  }
  
  return valueProps.slice(0, 6);
}

// Helper function to extract social proof elements
function extractSocialProof(markdown: string): string[] {
  const socialProof: string[] = [];
  const lines = markdown.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Look for testimonials, reviews, numbers, etc.
    if (trimmed.match(/\b(\d+[k%+]|\d+,\d+|customers?|clients?|users?|testimonial|review|rating|trusted|featured)\b/i)) {
      if (trimmed.length > 10 && trimmed.length < 150) {
        socialProof.push(trimmed);
      }
    }
  }
  
  return socialProof.slice(0, 5);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    console.log(`🔍 Scraping competitor: ${url}`);
    
    // Use Firecrawl MCP to scrape the website
    // Note: This would typically use the MCP client, but for now we'll use a direct API call
    // In production, you would integrate with the Firecrawl MCP server directly
    
    let firecrawlResponse: FirecrawlResponse;
    
    try {
      // Attempt to use Firecrawl API directly
      const firecrawlApiResponse = await fetch('https://api.firecrawl.dev/v0/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FIRECRAWL_API_KEY}`
        },
        body: JSON.stringify({
          url: url,
          formats: ['markdown'],
          onlyMainContent: true,
          includeTags: ['h1', 'h2', 'h3', 'p', 'a', 'button'],
          excludeTags: ['nav', 'footer', 'script', 'style']
        })
      });

      if (firecrawlApiResponse.ok) {
        const firecrawlData = await firecrawlApiResponse.json();
        firecrawlResponse = {
          success: true,
          data: {
            markdown: firecrawlData.data?.markdown || '',
            metadata: {
              title: firecrawlData.data?.metadata?.title || '',
              description: firecrawlData.data?.metadata?.description || ''
            }
          }
        };
      } else {
        const errorText = await firecrawlApiResponse.text().catch(() => 'Unknown error');
        console.error(`❌ Firecrawl API error: ${firecrawlApiResponse.status} - ${errorText}`);
        throw new Error(`Firecrawl API failed: ${firecrawlApiResponse.status}`);
      }
    } catch (firecrawlError) {
      console.error('❌ Firecrawl API error:', firecrawlError);
      
      // Check if Firecrawl API key is configured
      if (!process.env.FIRECRAWL_API_KEY) {
        return res.status(500).json({ 
          error: 'Firecrawl API key not configured',
          details: 'FIRECRAWL_API_KEY environment variable is required for competitor analysis'
        });
      }
      
      // Re-throw the error instead of using mock data
      throw firecrawlError;
    }

    if (!firecrawlResponse.success || !firecrawlResponse.data?.markdown) {
      return res.status(500).json({ error: 'Failed to scrape website content' });
    }

    const markdown = firecrawlResponse.data.markdown;
    
    // Extract key content elements
    const extractedContent: ExtractedContent = {
      headlines: extractHeadlines(markdown),
      ctaButtons: extractCTAs(markdown),
      valuePropositions: extractValuePropositions(markdown),
      socialProof: extractSocialProof(markdown),
      metadata: firecrawlResponse.data.metadata || {}
    };

    console.log('✅ Successfully extracted content:', {
      headlines: extractedContent.headlines.length,
      ctas: extractedContent.ctaButtons.length,
      valueProps: extractedContent.valuePropositions.length,
      socialProof: extractedContent.socialProof.length
    });

    return res.status(200).json({
      success: true,
      url,
      extractedContent
    });

  } catch (error) {
    console.error('❌ Error scraping competitor:', error);
    return res.status(500).json({ 
      error: 'Failed to scrape competitor website',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 