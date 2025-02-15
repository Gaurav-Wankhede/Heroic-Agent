import { ChatMessage, ChatHistory, CHAT_HISTORY_LIMIT, CHAT_HISTORY_TTL } from '../types/chat';
import { LRUCache } from 'lru-cache';

// Constants for timeout handling
const VERCEL_TIMEOUT = 58000; // 58 seconds (giving 2s buffer)
const RESPONSE_TIMEOUT_MESSAGE = "Response taking too long. Please try again.";

// Enhanced chat history storage with LRU cache
export const chatHistories = new LRUCache<string, ChatHistory>({
  max: 1000, // Maximum number of entries
  ttl: CHAT_HISTORY_TTL, // Time to live
  updateAgeOnGet: true, // Update item age on access
  updateAgeOnHas: true
});

// Add date formatting helper
function getFormattedDate(): string {
  const now = new Date();
  return now.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

// Function to manage chat history with memory optimization and timeout handling
export async function updateChatHistory(userId: string, domain: string, message: string, response: string) {
  const key = `${userId}:${domain}`;
  const now = getFormattedDate();
  const history = chatHistories.get(key) || { 
    messages: [], 
    domain, 
    userId,
    lastUpdated: now,
    lastDateCheck: now
  };

  // Clean old messages (older than 24 hours)
  history.messages = history.messages.filter(msg => {
    if (!msg.timestamp) return false;
    const msgDate = new Date(msg.timestamp);
    const nowDate = new Date();
    return nowDate.getTime() - msgDate.getTime() < 24 * 60 * 60 * 1000;
  });

  // Add new messages with optimization
  const newMessages: ChatMessage[] = [
    optimizeMessage({
      role: 'user' as const,
      content: message,
      timestamp: now
    }),
    optimizeMessage({
      role: 'assistant' as const,
      content: response,
      timestamp: now
    })
  ];

  // Add new messages and use smart truncation to preserve context
  history.messages.push(...newMessages);
  history.messages = smartTruncateHistory(history.messages, CHAT_HISTORY_LIMIT * 2);

  history.lastUpdated = now;
  chatHistories.set(key, history);
}

// Function to get relevant chat history with context preservation
export function getChatHistory(userId: string, domain: string): ChatMessage[] {
  const key = `${userId}:${domain}`;
  const history = chatHistories.get(key);
  
  if (!history) {
    return [];
  }
  
  // Return smartly truncated history to preserve context
  return smartTruncateHistory(history.messages, CHAT_HISTORY_LIMIT * 2);
}

// Helper function to handle response timeout
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = VERCEL_TIMEOUT
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(RESPONSE_TIMEOUT_MESSAGE));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutHandle!);
    return result;
  } catch (error) {
    clearTimeout(timeoutHandle!);
    throw error;
  }
}

// Helper function to optimize message storage
function optimizeMessage(message: ChatMessage): ChatMessage {
  return {
    role: message.role,
    content: message.content.trim(), // Remove unnecessary whitespace
    timestamp: message.timestamp
  };
}

// Smart truncation that preserves context
function smartTruncateHistory(messages: ChatMessage[], limit: number): ChatMessage[] {
  if (messages.length <= limit) return messages;

  // Keep recent messages
  const recentCount = Math.floor(limit * 0.7);
  const recentMessages = messages.slice(-recentCount);

  // Keep some older messages for context
  const oldestCount = limit - recentCount;
  const oldestMessages = messages.slice(0, oldestCount);

  // Combine with proper spacing
  return [...oldestMessages, ...recentMessages];
}

// Periodic cleanup of expired entries (already handled by LRU cache)
// Additional cleanup for memory optimization
setInterval(() => {
  const now = new Date().toISOString();
  chatHistories.forEach((history, key) => {
    // Clean individual message content if too large
    history.messages = history.messages.map(msg => optimizeMessage({
      ...msg,
      content: msg.content.length > 10000 ? 
        msg.content.substring(0, 10000) + '... [truncated]' : 
        msg.content,
      timestamp: msg.timestamp || now
    }));
    
    // Use smart truncation for history
    history.messages = smartTruncateHistory(history.messages, CHAT_HISTORY_LIMIT * 2);
    
    // Update the cleaned history
    chatHistories.set(key, history);
  });
}, CHAT_HISTORY_TTL / 2); 