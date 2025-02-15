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
  temporalContext?: {
    currentDate: string;
    domain: string;
    lastInteraction?: string;
    priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    categories?: string[];
    includesDate?: boolean;
    lastUpdate?: string;
    newsCategories?: Array<'features' | 'security' | 'performance' | 'api' | 'community' | 'ecosystem' | 'trends'>;
    timeframe?: 'immediate' | 'recent' | 'weekly' | 'monthly';
  };
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
  isAI?: boolean;
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