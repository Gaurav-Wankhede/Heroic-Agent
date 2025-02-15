import axios from 'axios';
import * as cheerio from 'cheerio';
import { scrapeLinks } from './linkScraper';
import { LRUCache } from 'lru-cache';
import pLimit from 'p-limit';

export interface ScrapedSource {
  title: string;
  url: string;
  description: string;
  date: string;
  content: string;
  relevanceScore: number;
  lastScraped: number;
}

// Cache configuration
const sourceCache = new LRUCache<string, ScrapedSource>({
  max: 500, // Maximum number of items
  ttl: 1000 * 60 * 30, // 30 minutes TTL
  updateAgeOnGet: true
});

// Concurrency limiter
const limit = pLimit(5); // Maximum 5 concurrent requests

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function extractMetadata($: cheerio.CheerioAPI, selectors: string[]): string {
  for (const selector of selectors) {
    const element = $(selector).first();
    const content = element.attr('content') || element.text();
    if (content) return content;
  }
  return '';
}

function extractDate($: cheerio.CheerioAPI): string {
  const dateSelectors = [
    'meta[property="article:published_time"]',
    'meta[name="date"]',
    'time[datetime]',
    '[datetime]',
    '.date',
    '.published-date',
    '.post-date',
    'meta[name="citation_publication_date"]'
  ];

  for (const selector of dateSelectors) {
    const element = $(selector).first();
    const date = element.attr('content') || 
                 element.attr('datetime') || 
                 element.text();
    if (date) {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    }
  }

  return new Date().toISOString();
}

function extractContent($: cheerio.CheerioAPI): string {
  // Remove noisy elements first
  $('script, style, nav, footer, iframe, .advertisement, .ads, #cookie-notice, .cookie-banner, .social-share').remove();

  const contentSelectors = [
    'article',
    'main',
    '.article-content',
    '.post-content',
    '.entry-content',
    '.content',
    '[role="main"]'
  ];

  for (const selector of contentSelectors) {
    const element = $(selector).first();
    if (element.length) {
      // Clean up the content before returning
      element.find('script, style, .advertisement').remove();
      return cleanContent(element.text());
    }
  }

  // Fallback: get all paragraphs
  const paragraphs = $('p')
    .filter((_, el) => {
      const text = $(el).text().trim();
      return text.length > 50; // Only consider substantial paragraphs
    })
    .map((_, el) => $(el).text())
    .get();

  return cleanContent(paragraphs.join('\n'));
}

function cleanContent(text: string): string {
  return text
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .replace(/[^\S\r\n]+/g, ' ') // Replace multiple spaces with single space
    .replace(/\s*\n\s*/g, '\n') // Clean up spaces around newlines
    .trim();
}

async function scrapeWebPage(url: string): Promise<ScrapedSource | null> {
  // Check cache first
  const cached = sourceCache.get(url);
  if (cached) {
    return cached;
  }

  let retries = 0;
  while (retries < MAX_RETRIES) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HeroicBot/1.0; +http://heroic.ai)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9',
          'Accept-Language': 'en-US,en;q=0.5'
        },
        maxRedirects: 5,
        validateStatus: (status) => status === 200
      });

      const $ = cheerio.load(response.data);

      const title = extractMetadata($, [
        'meta[property="og:title"]',
        'meta[name="twitter:title"]',
        'title',
        'h1'
      ]);

      const description = extractMetadata($, [
        'meta[property="og:description"]',
        'meta[name="description"]',
        'meta[name="twitter:description"]',
        'p'
      ]);

      const date = extractDate($);
      const content = extractContent($);

      const source: ScrapedSource = {
        title: title?.trim() || '',
        url,
        description: description?.trim() || '',
        date: date?.trim() || new Date().toISOString(),
        content: content || '',
        relevanceScore: 0,
        lastScraped: Date.now()
      };

      // Cache the result
      sourceCache.set(url, source);
      return source;

    } catch (error) {
      retries++;
      if (retries === MAX_RETRIES) {
        console.error(`Error scraping ${url}:`, error);
        return null;
      }
      await sleep(RETRY_DELAY * retries);
    }
  }
  return null;
}

export async function validateAndEnrichSources(query: string, domain: string): Promise<ScrapedSource[]> {
  try {
    console.time('validateAndEnrichSources');
    
    // Get relevant links from linkScraper
    const keywords = query.toLowerCase().split(' ').filter(word => word.length > 3);
    const relevantLinks = await scrapeLinks(query, domain, keywords);
    
    if (!Array.isArray(relevantLinks) || relevantLinks.length === 0) {
      console.timeEnd('validateAndEnrichSources');
      return [];
    }

    // Scrape full content for each relevant link with concurrency limit
    const scrapedSources = await Promise.all(
      relevantLinks.map(link => 
        limit(() => scrapeWebPage(link.url).then(source => {
          if (source) {
            source.relevanceScore = link.relevanceScore;
          }
          return source;
        }))
      )
    );

    // Filter out null results and sort by relevance score
    const results = scrapedSources
      .filter((source): source is ScrapedSource => 
        source !== null && 
        source.content.length > 100 // Ensure we have substantial content
      )
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.timeEnd('validateAndEnrichSources');
    return results;

  } catch (error) {
    console.error('Error validating and enriching sources:', error);
    return [];
  }
}

export function formatSourceCitation(source: ScrapedSource): string {
  const date = new Date(source.date);
  const formattedDate = date.toISOString().split('T')[0];
  const title = source.title.length > 50 ? 
    source.title.substring(0, 47) + '...' : 
    source.title;
  return `[${title} (${formattedDate}) - ${source.url}]`;
}

export { scrapeLinks };
export { scrapeWebPage }; 