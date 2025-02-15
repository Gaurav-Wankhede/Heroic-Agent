import { validateUrl } from './urls';
import {
  CitationBlock,
  CitationMetadata,
  CitationValidationResult,
  GoogleSearchSource,
  extractCitationBlocks,
  formatCitationBlock,
  validateCitationBlock
} from '../types/Citation';
import { ValidatedSource } from '../types/domain';
import { scrapeLinks, scrapeWebPage, ScrapedSource } from '../services/webScraper';
import { GroundingMetadata } from '../types/grounding';
import pLimit from 'p-limit';

// Helper function to validate URLs
async function validateUrls(urls: string[]): Promise<Set<string>> {
  const validUrls = new Set<string>();
  await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        validUrls.add(url);
      }
    } catch (error) {
      console.warn(`Failed to validate URL: ${url}`, error);
    }
  }));
  return validUrls;
}

// Helper function to validate and format citations
export async function validateAndFormatCitations(content: string, metadata: GroundingMetadata): Promise<string> {
  if (!content) return '';

  const urlRegex = /\bhttps?:\/\/[^\s<>\[\]{}()]+/g;
  const urls = content.match(urlRegex) || [];
  const validUrls = await validateUrls(urls);

  let validatedContent = content;
  urls.forEach(url => {
    if (!validUrls.has(url)) {
      validatedContent = validatedContent.replace(
        url,
        '[Source URL not available or could not be verified]'
      );
    }
  });

  return validatedContent;
}

export function formatGoogleSearchSources(sources: GoogleSearchSource[]): string {
  if (!sources.length) return '';

  return sources
    .map((source, index) => {
      const block: CitationBlock = {
        ...source,
        date: source.date || new Date().toISOString(),
        index
      };
      return formatCitationBlock(block, {
        style: 'google',
        includeDate: true,
        includeDescription: true
      });
    })
    .join('\n');
}

export function extractSourcesFromContent(content: string): GoogleSearchSource[] {
  const blocks = extractCitationBlocks(content);
  return blocks.map(block => ({
    title: block.title,
    url: block.url,
    date: block.date,
    relevanceScore: block.relevanceScore,
    description: block.description
  }));
}

const limit = pLimit(5); // Limit concurrent requests

export async function validateAndEnrichSources(query: string, domain: string): Promise<ValidatedSource[]> {
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

    // Filter out null results and convert to ValidatedSource
    const results = scrapedSources
      .filter((source): source is ScrapedSource => 
        source !== null && 
        source.content !== undefined &&
        source.content.length > 100
      )
      .map(source => ({
        title: source.title,
        url: source.url,
        description: source.description,
        content: source.content,
        relevanceScore: source.relevanceScore,
        date: source.date
      } as ValidatedSource))
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    console.timeEnd('validateAndEnrichSources');
    return results;

  } catch (error) {
    console.error('Error validating and enriching sources:', error);
    return [];
  }
} 