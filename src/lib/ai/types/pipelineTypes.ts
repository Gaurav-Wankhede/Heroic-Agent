import type { LinkValidationOptions, LinkValidationResult } from '@/lib/ai/utils/linkValidator';
import type { WebValidationOptions, WebValidationResult } from '@/lib/ai/utils/webValidator';
import type { ContentValidationOptions, ContentValidationResult } from '@/lib/ai/utils/contentValidator';
import type { CitationSource } from '@/components/chat/Citation';

// Pipeline metrics interface
export interface PipelineMetrics {
  startTime: number;
  searchTime: number;
  linkScrapingTime: number;
  contentScrapingTime: number;
  processingTime: number;
  groundingTime: number;
  totalTime: number;
  searchResults: number;
  linksFound: number;
  validLinks: number;
  sourcesProcessed: number;
  groundedSources: number;
  errors: {
    search?: string;
    linkScraping?: string;
    contentScraping?: string;
    grounding?: string;
    processing?: string;
  };
}

// Source interface
export interface Source {
  url: string;
  title: string;
  description: string;
  content: string;
  score: number;
  relevance: number;
  date?: string;
  relevanceScore?: number;
  lastScraped?: string;
  validations: {
    link?: LinkValidationResult;
    web?: WebValidationResult;
    content?: ContentValidationResult;
  };
  metadata: {
    author?: string;
    date?: string;
    language?: string;
    wordCount?: number;
    readingTime?: number;
  };
}

// Pipeline metadata interface
export interface PipelineMetadata {
  query: string;
  timestamp: number;
  duration: number;
  totalSources: number;
  validSources: number;
  averageScore: number;
  cacheHits: number;
  retries: number;
  processingSteps: string[];
}

// Pipeline error interface
export interface PipelineError {
  url: string;
  phase: 'link' | 'web' | 'content' | 'processing';
  error: string;
  code?: string;
  retryCount?: number;
}

// Pipeline result interface
export interface PipelineResult {
  isValid: boolean;
  score: number;
  sources: Source[];
  metadata: PipelineMetadata;
  citations: CitationSource[];
  errors: PipelineError[];
  content?: string;
  groundingMetadata?: {
    webSearchSources: Array<{
      url: string;
      title: string;
      date?: string;
      relevanceScore?: number;
      snippet?: string;
    }>;
  };
}

// Pipeline options interface
export interface PipelineOptions {
  linkValidation?: Partial<LinkValidationOptions>;
  webValidation?: Partial<WebValidationOptions>;
  contentValidation?: Partial<ContentValidationOptions>;
  maxConcurrentRequests?: number;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  cacheResults?: boolean;
  similarityThreshold?: number;
  maxResults?: number;
  sortResults?: boolean;
  filterDuplicates?: boolean;
  includeMetadata?: boolean;
  logProgress?: boolean;
} 