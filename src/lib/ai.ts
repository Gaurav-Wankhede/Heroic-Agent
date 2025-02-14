import { GoogleGenerativeAI, Tool, Part } from '@google/generative-ai';
import type { GroundingMetadata, FileUploadData, WebSearchSource } from '@/types/chat';
import { genAI } from './genai';
import {
  type FileUploadResponse,
  type FileAnalysis,
  fileModel,
  generateFileAnalysisPrompt,
  generateFileContent,
  fileToGenerativePart,
  analyzeNotebookContent,
  extractCodeContext
} from './fileHandler';

import type {
  ChatMessage,
  ChatHistory,
  CacheEntry
} from './ai/types/chat';

import type {
  DomainInfo,
  DomainConfig,
  DomainLatestInfo
} from './ai/types/domain';

import {
  // Error classes
  AIError,
  DomainError,
  
  // Services
  chatHistories,
  messageCache,
  model,
  MODEL_CONFIG,
  
  // Utils
  levenshteinDistance,
  memoizedLevenshtein,
  isSimilar,
  calculateMessageSimilarity,
  isGeneralGreeting,
  isQuestionRelevant,
  containsOtherDomainKeywords,
  isErrorQuery,
  validateUrl,
  validateUrls,
  
  // Handlers
  buildPrompt,
  getChatResponse,
  getLatestDomainInfo,
  getOffTopicResponse,
  createResponseStream,
  
  // Config
  DOMAIN_CONFIG,
  DOMAIN_URLS,
  DOMAIN_ERROR_SOLUTIONS,
  getDomainErrorSolution,
  getDomainExamples
} from './ai/index';

/**
 * Convert Gemini metadata to our application's format
 */
export function convertGroundingMetadata(geminiMetadata: any): GroundingMetadata | null {
  if (!geminiMetadata) return null;

  const metadata: GroundingMetadata = {
    webSearchSources: (geminiMetadata.sources || []).map((source: any) => ({
      title: source.title || '',
      url: source.url || '',
      snippet: source.snippet || ''
    })),
    groundingChunks: geminiMetadata.context ? [{
      web: {
        uri: 'gemini-context',
        title: 'Generated Context'
      }
    }] : undefined
  };

  return metadata;
}

// Re-export all types
export type {
  // Chat types
  ChatMessage,
  ChatHistory,
  CacheEntry,
  
  // Domain types
  DomainInfo,
  DomainConfig,
  DomainLatestInfo,
  
  // File types
  WebSearchSource,
  GroundingMetadata,
  FileUploadData,
  FileUploadResponse,
  FileAnalysis
};

// Re-export values and functions
export {
  // Error classes
  AIError,
  DomainError,
  
  // Services
  chatHistories,
  messageCache,
  model,
  MODEL_CONFIG,
  
  // Utils
  levenshteinDistance,
  memoizedLevenshtein,
  isSimilar,
  calculateMessageSimilarity,
  isGeneralGreeting,
  isQuestionRelevant,
  containsOtherDomainKeywords,
  isErrorQuery,
  validateUrl,
  validateUrls,
  
  // Handlers
  buildPrompt,
  getChatResponse,
  getLatestDomainInfo,
  getOffTopicResponse,
  createResponseStream,
  
  // Config
  DOMAIN_CONFIG,
  DOMAIN_URLS,
  DOMAIN_ERROR_SOLUTIONS,
  getDomainErrorSolution,
  getDomainExamples,
  
  // File handling
  fileModel,
  generateFileAnalysisPrompt,
  generateFileContent,
  fileToGenerativePart,
  analyzeNotebookContent,
  extractCodeContext
}; 