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