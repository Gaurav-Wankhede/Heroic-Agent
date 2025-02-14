export interface WebSearchSource {
  url: string;
  title: string;
}

export interface GroundingMetadata {
  webSearchSources?: WebSearchSource[];
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
  originalContent?: string;
}

export interface ChatResponse {
  content: string;
  groundingMetadata: GroundingMetadata | null;
  isAI: boolean;
}

export interface StreamChunk {
  messageId?: string;
  content?: string;
  groundingMetadata?: GroundingMetadata;
  error?: string;
}

export interface FileUploadData {
  data: string;
  mimeType: string;
  name: string;
}

export interface EditMessageRequest {
  messageId: string;
  content: string;
  domain: string;
  userId: string;
} 