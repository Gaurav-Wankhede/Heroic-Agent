import type { CitationSource } from '@/components/chat/Citation';
import type { Source } from './source';
import type { PipelineMetadata } from './metadata';
import type { PipelineError } from './error';

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