import { GoogleGenerativeAI, Tool } from '@google/generative-ai';
import type { GroundingMetadata, WebSearchSource } from '@/types/chat';


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

// Enhanced model configuration
export const MODEL_CONFIG = {
  text: {
    model: "models/gemini-2.0-flash",
    tools: [{
      functionDeclarations: [{
        name: "google_search",
        description: "Search the web",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string" }
          },
          required: ["query"]
        }
      }]
    }] as Tool[],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.4,
      topK: 40,
      topP: 0.95,
    }
  }
} as const;

// Initialize Gemini model
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Get model instance with configuration
export async function getModel() {
  try {
    return genAI.getGenerativeModel(MODEL_CONFIG.text);
  } catch (error) {
    console.error('Error initializing model:', error);
    return null;
  }
}


// Generate chat response with file context
export async function generateChatResponse(
  message: string,
  domain: string
): Promise<{ content: string; groundingMetadata: GroundingMetadata | null }> {
  try {
    const model = await getModel();
    if (!model) {
      throw new Error('Model not available');
    }

    // Generate response with file context
    const prompt = `Context:
Domain: ${domain}

User Message: ${message}

Provide a response that:
1. Addresses the user's message
2. Incorporates relevant file context
3. Provides domain-specific insights
4. Suggests actionable next steps
5. Maintains coherence with previous context`;

    const result = await model.generateContent([{ text: prompt }]);
    const response = result.response.text();

    return {
      content: response,
      groundingMetadata: null
    };
  } catch (error) {
    console.error('Error generating chat response:', error);
    throw error;
  }
}

// Stream chat response with file context
export async function streamChatResponse(
  message: string,
  domain: string,
  onToken: (token: string) => void
): Promise<void> {
  try {
    const model = await getModel();
    if (!model) {
      throw new Error('Model not available');
    }

    const prompt = `Context:
Domain: ${domain}

User Message: ${message}

Provide a response that:
1. Addresses the user's message
2. Provides domain-specific insights
3. Suggests actionable next steps
4. Maintains coherence with previous context`;

    const result = await model.generateContentStream([{ text: prompt }]);
    
    for await (const chunk of result.stream) {
      const token = chunk.text();
      onToken(token);
    }
  } catch (error) {
    console.error('Error streaming chat response:', error);
    throw error;
  }
}

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
  ChatMessage,
  ChatHistory,
  CacheEntry,
  DomainInfo,
  DomainConfig,
  DomainLatestInfo,
  WebSearchSource,
  GroundingMetadata
};

// Re-export values and functions
export {
  // Error classes
  AIError,
  DomainError,
  
  // Services
  chatHistories,
  messageCache,
  
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
}; 