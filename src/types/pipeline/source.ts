import type { LinkValidationResult } from '@/lib/ai/utils/linkValidator';
import type { WebValidationResult } from '@/lib/ai/utils/webValidator';
import type { ContentValidationResult } from '@/lib/ai/utils/contentValidator';

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
    extractedContent?: string;
  };
} 