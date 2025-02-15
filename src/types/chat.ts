import { GoogleSearchSource } from '@/lib/ai/types/Citation';

export interface WebSearchSource extends GoogleSearchSource {
  snippet?: string;
}

export interface GroundingMetadata {
  webSearchSources: WebSearchSource[];
  citations?: string[];
  score?: number;
  groundingChunks?: Array<{
    web: {
      uri: string;
      title: string;
    };
  }>;
}

export interface Message {
  messageId: string;
  content: string;
  isAI: boolean;
  groundingMetadata?: GroundingMetadata | null;
  timestamp?: number;
  edited?: boolean;
}

export interface ChatResponse {
  messageId: string;
  content: string;
  groundingMetadata?: GroundingMetadata;
  error?: string;
}

export interface StreamChunk {
  messageId?: string;
  content?: string;
  groundingMetadata?: GroundingMetadata;
  error?: string;
}

export interface EditMessageRequest {
  messageId: string;
  content: string;
  domain: string;
  userId: string;
} 