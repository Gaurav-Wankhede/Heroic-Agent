import type { FileAnalysis } from '../../fileHandler';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatHistory {
  messages: ChatMessage[];
  domain: string;
  lastUpdated: number;
}

export interface CacheEntry {
  response: string;
  timestamp: number;
  history?: ChatMessage[];
  fileAnalysis?: FileAnalysis;
}

// Constants for chat history management
export const CHAT_HISTORY_LIMIT = 10;
export const CHAT_HISTORY_TTL = 1000 * 60 * 60; // 1 hour
export const CACHE_TTL = 1000 * 60 * 5; // 5 minutes 