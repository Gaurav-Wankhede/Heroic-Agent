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

interface GroundingMetadata {
  webSearchSources?: Array<{
    title: string;
    url: string;
    snippet?: string;
  }>;
}

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