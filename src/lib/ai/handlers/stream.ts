import { DomainError } from '../types/errors';
import { DOMAIN_CONFIG } from '../config/domains';
import { messageCache } from '../services/cache';
import { updateChatHistory, getChatHistory } from '../services/chat';
import { isQuestionRelevant } from '../utils/validation';
import { getOffTopicResponse } from './response';
import { buildPrompt } from './prompt';
import { getSearchModel } from '../services/model';
import { getDomainErrorSolution } from '../config/errors';
import { validateAndFormatCitations } from '../utils/citationUtils';

interface GoogleSearchQuery {
  title: string;
  url: string;
  snippet?: string;
  relevanceScore: number;
  date?: string;
}

interface GoogleGroundingMetadata {
  webSearchQueries?: GoogleSearchQuery[];
}

interface CustomGroundingMetadata {
  webSearchSources?: Array<{
    title: string;
    url: string;
    snippet?: string;
    relevanceScore: number;
    date?: string;
  }>;
  citations?: string[];
  score?: number;
}

interface StreamChunk {
  messageId: string;
  content: string;
  groundingMetadata?: CustomGroundingMetadata;
  done: boolean;
  error?: string;
  solution?: string;
}

interface CacheEntry {
  response: string;
  timestamp: number;
  history: any[];
  groundingMetadata?: CustomGroundingMetadata;
}

export async function* createResponseStream(
  message: string,
  domain: string,
  userId: string
): AsyncGenerator<string> {
  const messageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const cacheKey = `${domain}-${message}`;
  let accumulatedResponse = '';
  let customMetadata: CustomGroundingMetadata | undefined;

  try {
    const model = await getSearchModel();
    if (!model) {
      throw new Error('Search model not available');
    }

    const chatHistory = await getChatHistory(userId, domain);
    if (!isQuestionRelevant(message, domain, chatHistory)) {
      yield formatStreamChunk({
        messageId,
        content: getOffTopicResponse(domain, message),
        done: true
      });
      return;
    }

    const config = DOMAIN_CONFIG.get(domain);
    if (!config) {
      throw new DomainError(`Invalid domain: ${domain}`, domain);
    }

    // Build enhanced prompt with grounding context
    const prompt = await buildPrompt(message, domain, config.info.prompt, chatHistory);
    const result = await model.generateContentStream([{ text: prompt }]);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      accumulatedResponse += chunkText;
      
      const chunkMetadata = (chunk.candidates?.[0]?.groundingMetadata as unknown) as GoogleGroundingMetadata;
      if (chunkMetadata?.webSearchQueries) {
        customMetadata = {
          webSearchSources: chunkMetadata.webSearchQueries.map(q => ({
            title: q.title,
            url: q.url,
            snippet: q.snippet,
            relevanceScore: q.relevanceScore,
            date: q.date
          }))
        };
      }

      yield formatStreamChunk({
        messageId,
        content: accumulatedResponse,
        groundingMetadata: customMetadata,
        done: false
      });
    }

    if (customMetadata?.webSearchSources) {
      const validatedContent = await validateAndFormatCitations(
        accumulatedResponse,
        customMetadata
      );
      accumulatedResponse = validatedContent;
    }

    messageCache.set(cacheKey, {
      response: accumulatedResponse,
      timestamp: Date.now(),
      history: chatHistory,
      groundingMetadata: customMetadata
    } as CacheEntry);

    // Update chat history
    updateChatHistory(userId, domain, message, accumulatedResponse);

    yield formatStreamChunk({
      messageId,
      content: accumulatedResponse,
      groundingMetadata: customMetadata,
      done: true
    });

  } catch (error) {
    console.error('Error in response stream:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    const solution = error instanceof DomainError ? 
      getDomainErrorSolution(domain, errorMessage) : 
      undefined;
    
    yield formatStreamChunk({
      messageId,
      content: 'Sorry, I encountered an error while processing your request.',
      error: errorMessage,
      solution,
      done: true
    });
  }
}

function formatStreamChunk(chunk: StreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
} 