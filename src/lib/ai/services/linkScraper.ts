import { getModel } from '../../genai';
import { Tool } from '@google/generative-ai';
import axios from 'axios';

interface ScrapedLink {
  url: string;
  title: string;
  description: string;
  status: number;
  contentStatus: boolean;
  relevanceScore: number;
}

// Configure search tool
const searchTool = {
  google_search: {}
} as Tool;

// Get model instance for link scraping
export async function getGenerativeModel() {
  try {
    const model = await getModel();
    if (!model) {
      throw new Error('Search model not available');
    }
    return model;
  } catch (error) {
    console.error('Error getting search model:', error);
    throw error;
  }
}

/**
 * Find relevant links using Google search
 */
async function findLinks(query: string, domain: string): Promise<string[]> {
  try {
    const model = await getGenerativeModel();
    const prompt = `Find recent and authoritative sources about ${query} in ${domain}. Focus on:
- Official documentation
- Research papers
- Technical blogs
- Industry news
- Expert articles

Return ONLY valid URLs in this format:
URL: [url]
URL: [url]
...

IMPORTANT:
- Only include URLs from reputable sources
- Focus on content from the last 6 months
- Prioritize official documentation and verified sources
- Exclude social media, forums, and unreliable sources`;

    const result = await model.generateContent(prompt);
    const text = result.response?.text() || '';
    
    // Extract URLs using regex
    const urlMatches = text.match(/URL:\s*(https?:\/\/[^\s\n]+)/g);
    const urls = urlMatches?.map(match => match.replace(/URL:\s*/, '').trim()) || [];

    return urls;
  } catch (error) {
    console.error('Error finding links:', error);
    return [];
  }
}

/**
 * Validate link accessibility and content
 */
async function validateLink(url: string): Promise<ScrapedLink | null> {
  try {
    // Check if URL is accessible
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: (status) => status === 200
    });

    // Check content type
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('text/html')) {
      return null;
    }

    // Extract title and description from HTML
    const title = response.data.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || '';
    const description = response.data.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"[^>]*>/i)?.[1] || '';

    return {
      url,
      title,
      description,
      status: response.status,
      contentStatus: true,
      relevanceScore: 0 // Will be calculated later
    };
  } catch (error) {
    console.warn(`Failed to validate URL: ${url}`, error);
    return null;
  }
}

/**
 * Calculate relevance score for a link
 */
async function calculateRelevance(link: ScrapedLink, domain: string, keywords: string[]): Promise<number> {
  try {
    const model = await getGenerativeModel();
    const prompt = `Analyze this content's relevance to ${domain}:
Title: ${link.title}
Description: ${link.description}
URL: ${link.url}

Keywords: ${keywords.join(', ')}

Rate the relevance from 0 to 1 based on:
1. Content matches domain focus
2. Contains domain keywords
3. Recent and up-to-date
4. Authoritative source
5. Technical depth

Return ONLY a number between 0 and 1.`;

    const result = await model.generateContent(prompt);
    const score = parseFloat(result.response?.text() || '0');
    return isNaN(score) ? 0 : score;
  } catch (error) {
    console.error('Error calculating relevance:', error);
    return 0;
  }
}

/**
 * Main function to scrape and validate links
 */
export async function scrapeLinks(query: string, domain: string, keywords: string[] = []): Promise<ScrapedLink[] | string> {
  try {
    // If no keywords provided, treat as simple URL extraction
    if (keywords.length === 0 && query.startsWith('http')) {
      const model = await getGenerativeModel();
      const prompt = `Please analyze this URL and extract relevant information: ${query}`;
      const result = await model.generateContent(prompt);
      return result.response?.text() || '';
    }

    // Find initial links
    const urls = await findLinks(query, domain);
    
    // Validate links in parallel
    const validatedLinks = await Promise.all(
      urls.map(url => validateLink(url))
    );

    // Filter out null results
    const validLinks = validatedLinks.filter((link): link is ScrapedLink => 
      link !== null
    );

    // Calculate relevance scores in parallel
    const linksWithRelevance = await Promise.all(
      validLinks.map(async (link) => {
        const relevanceScore = await calculateRelevance(link, domain, keywords);
        return { ...link, relevanceScore };
      })
    );

    // Filter by relevance score and sort
    return linksWithRelevance
      .filter(link => link.relevanceScore >= 0.8)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

  } catch (error) {
    console.error('Error in link scraping:', error);
    return [];
  }
}

// Extract URLs from text
export function extractUrls(text: string): string[] {
  const urlPattern = /https?:\/\/[^\s<>"]+/g;
  const matches = text.match(urlPattern);
  return matches ? Array.from(new Set(matches)) : [];
} 