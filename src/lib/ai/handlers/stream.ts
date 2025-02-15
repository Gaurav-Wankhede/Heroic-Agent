import { DOMAIN_CONFIG } from '../config/domains';
import { updateChatHistory, getChatHistory } from '../services/chat';
import { handleResponseError } from './response';
import { buildPrompt } from './prompt';
import { getSearchModel } from '../services/model';

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
  let accumulatedResponse = '';
  let customMetadata: CustomGroundingMetadata | undefined;

  try {
    const model = await getSearchModel();
    if (!model) {
      throw new Error('Model not available');
    }

    const chatHistory = getChatHistory(userId, domain);
    const prompt = await buildPrompt(message, domain, DOMAIN_CONFIG.get(domain)?.info.prompt || '', chatHistory);
    const result = await model.generateContentStream([{ text: prompt }]);

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      accumulatedResponse += chunkText;
      
      const chunkMetadata = chunk.candidates?.[0]?.groundingMetadata as GoogleGroundingMetadata | undefined;
      if (chunkMetadata?.webSearchQueries) {
        customMetadata = {
          webSearchSources: chunkMetadata.webSearchQueries.map(q => ({
            title: q.title,
            url: q.url,
            snippet: q.snippet || '',
            relevanceScore: q.relevanceScore || 0,
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

    // Update chat history after completion
    updateChatHistory(userId, domain, message, accumulatedResponse);

    yield formatStreamChunk({
      messageId,
      content: accumulatedResponse,
      groundingMetadata: customMetadata,
      done: true
    });

  } catch (error) {
    console.error('Error in response stream:', error);
    const errorResponse = handleResponseError(error, domain);
    yield formatStreamChunk({
      messageId,
      content: errorResponse.content,
      groundingMetadata: undefined,
      done: true
    });
  }
}

function formatStreamChunk(chunk: StreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
} 