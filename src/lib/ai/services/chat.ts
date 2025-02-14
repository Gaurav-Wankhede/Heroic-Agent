import { ChatMessage, ChatHistory, CHAT_HISTORY_LIMIT, CHAT_HISTORY_TTL } from '../types/chat';
import { LRUCache } from 'lru-cache';

// Enhanced chat history storage with LRU cache
export const chatHistories = new LRUCache<string, ChatHistory>({
  max: 1000, // Maximum number of entries
  ttl: CHAT_HISTORY_TTL, // Time to live
  updateAgeOnGet: true, // Update item age on access
  updateAgeOnHas: true
});

// Function to manage chat history with memory optimization
export function updateChatHistory(userId: string, domain: string, message: string, response: string) {
  const key = `${userId}:${domain}`;
  const now = Date.now();
  const history = chatHistories.get(key) || { messages: [], domain, lastUpdated: now };

  // Clean old messages (older than 24 hours)
  history.messages = history.messages.filter(msg => now - msg.timestamp < 24 * 60 * 60 * 1000);

  // Optimize message storage
  const newMessages: ChatMessage[] = [
    {
      role: 'user' as const,
      content: message,
      timestamp: now
    },
    {
      role: 'assistant' as const,
      content: response,
      timestamp: now
    }
  ].map(optimizeMessage);

  history.messages.push(...newMessages);

  // Keep more context with smart truncation
  if (history.messages.length > CHAT_HISTORY_LIMIT * 6) {
    history.messages = smartTruncateHistory(history.messages, CHAT_HISTORY_LIMIT * 6);
  }

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
  
  return history.messages;
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
  const now = Date.now();
  chatHistories.forEach((history, key) => {
    // Clean individual message content if too large
    history.messages = history.messages.map(msg => {
      if (msg.content.length > 10000) {
        return {
          ...msg,
          content: msg.content.substring(0, 10000) + '... [truncated]'
        };
      }
      return msg;
    });
    
    // Update the cleaned history
    chatHistories.set(key, history);
  });
}, CHAT_HISTORY_TTL / 2); // Run cleanup more frequently 