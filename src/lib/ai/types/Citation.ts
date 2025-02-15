import { Source } from '../services/citationService';

export interface GoogleSearchSource {
  title: string;
  url: string;
  date?: string;
  relevanceScore: number;
  description?: string;
}

export interface CitationSource {
  title: string;
  url: string;
  date: string;
  relevanceScore: number;
  description?: string;
}

export interface CitationMetadata {
  webSearchSources: GoogleSearchSource[];
  snippets: Record<string, string>;
  citations: GoogleSearchSource[];
}

export interface CitationBlock {
  title: string;
  url: string;
  date: string;
  relevanceScore: number;
  description?: string;
  index: number;
}

export interface CitationValidationResult {
  isValid: boolean;
  formattedCitation: string;
  metadata: CitationMetadata;
}

export interface CitationFormatOptions {
  includeIndex?: boolean;
  includeDate?: boolean;
  includeDescription?: boolean;
  style?: 'google' | 'inline' | 'footnote' | 'endnote';
}

export function convertSourceToCitation(source: Source): GoogleSearchSource {
  return {
    title: source.title,
    url: source.url,
    date: source.metadata.date,
    relevanceScore: source.relevance,
    description: source.description
  };
}

export function formatCitationBlock(citation: CitationBlock, options: CitationFormatOptions = {}): string {
  const {
    includeIndex = true,
    includeDate = true,
    includeDescription = false,
    style = 'google'
  } = options;

  switch (style) {
    case 'google':
      return `[${citation.title}${includeDate ? ` (${citation.date})` : ''} - ${citation.url}]`;
    case 'inline':
      return `[${includeIndex ? `${citation.index + 1}. ` : ''}${citation.title}]`;
    case 'footnote':
      return `${citation.title}[${citation.index + 1}]`;
    case 'endnote':
      return `[${citation.index + 1}] ${citation.title}. ${citation.url}`;
    default:
      return `[${citation.title}]`;
  }
}

export function extractCitationBlocks(content: string): CitationBlock[] {
  const citationRegex = /\[(.*?)\s*\((.*?)\)\s*-\s*(https?:\/\/[^\s\]]+)\]/g;
  const matches = [...content.matchAll(citationRegex)];
  
  return matches.map((match, index) => ({
    title: match[1].trim(),
    date: match[2].trim(),
    url: match[3],
    relevanceScore: 0.8, // Default score
    index
  }));
}

export function validateCitationBlock(block: CitationBlock): boolean {
  return (
    typeof block.title === 'string' &&
    block.title.length > 0 &&
    typeof block.url === 'string' &&
    /^https?:\/\//.test(block.url) &&
    typeof block.date === 'string' &&
    block.date.length > 0 &&
    typeof block.relevanceScore === 'number' &&
    block.relevanceScore >= 0 &&
    block.relevanceScore <= 1
  );
} 