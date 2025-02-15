import type { LinkValidationOptions } from '@/lib/ai/utils/linkValidator';
import type { WebValidationOptions } from '@/lib/ai/utils/webValidator';
import type { ContentValidationOptions } from '@/lib/ai/utils/contentValidator';

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