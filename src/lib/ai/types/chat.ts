export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  files?: Array<{
    name: string;
    type?: string;
    context?: boolean;
  }>;
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ChatHistory {
  messages: ChatMessage[];
  domain: string;
  userId: string;
  lastUpdated: string;
}

export interface CacheEntry {
  response: string;
  timestamp: number;
  history?: ChatMessage[];
}

// Constants for chat history management
export const CHAT_HISTORY_LIMIT = 10;
export const CHAT_HISTORY_TTL = 1000 * 60 * 60; // 1 hour
export const CACHE_TTL = 1000 * 60 * 5; // 5 minutes 