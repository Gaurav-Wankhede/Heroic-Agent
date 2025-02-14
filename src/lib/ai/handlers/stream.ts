import { FileUploadData } from '@/types/chat';
import { DomainError } from '../types/errors';
import { DOMAIN_CONFIG } from '../config/domains';
import { messageCache } from '../services/cache';
import { updateChatHistory, getChatHistory } from '../services/chat';
import { isQuestionRelevant } from '../utils/validation';
import { getOffTopicResponse } from './response';
import { buildPrompt } from './prompt';
import { model } from '../services/model';
import { getDomainErrorSolution } from '../config/errors';

export async function* createResponseStream(
  message: string,
  domain: string,
  userId: string,
  files: FileUploadData[] = []
): AsyncGenerator<string> {
  const messageId = `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const cacheKey = `${domain}-${message}`;

  try {
    // Check if message is relevant
    const chatHistory = await getChatHistory(userId, domain);
    if (!isQuestionRelevant(message, domain, chatHistory)) {
      const offTopicResponse = getOffTopicResponse(domain, message);
      yield `data: ${JSON.stringify({ messageId, content: offTopicResponse, done: true })}\n\n`;
      return;
    }
    
    const config = DOMAIN_CONFIG.get(domain);
    if (!config) {
      throw new DomainError(`Invalid domain: ${domain}`, domain);
    }

    // Include chat history in prompt
    const prompt = await buildPrompt(message, domain, config.info.prompt, chatHistory, files);
    
    // Generate streaming response
    const result = await model.generateContentStream(prompt);
    let accumulatedResponse = '';
      
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      accumulatedResponse += chunkText;
      
      // Send accumulated response so far
      yield `data: ${JSON.stringify({ messageId, content: accumulatedResponse, done: false })}\n\n`;
    }

    // Cache the complete response
    messageCache.set(cacheKey, {
      response: accumulatedResponse,
      timestamp: Date.now(),
      history: chatHistory
    });

    // Update chat history with complete response
    updateChatHistory(userId, domain, message, accumulatedResponse);

    // Send final chunk with done flag
    yield `data: ${JSON.stringify({ messageId, content: accumulatedResponse, done: true })}\n\n`;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown AI model error';
    const solution = getDomainErrorSolution(domain, errorMessage);
    
    yield `data: ${JSON.stringify({ messageId, content: `Error: ${errorMessage}\n\nSuggested solution: ${solution}`, done: true })}\n\n`;
  }
} 