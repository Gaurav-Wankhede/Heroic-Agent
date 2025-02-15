export interface PipelineError {
  url: string;
  phase: 'link' | 'web' | 'content' | 'processing';
  error: string;
  code?: string;
  retryCount?: number;
} 