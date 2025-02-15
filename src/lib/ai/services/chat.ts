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
  const now = new Date().toISOString();
  const history = chatHistories.get(key) || { 
    messages: [], 
    domain, 
    userId,
    lastUpdated: now 
  };

  // Clean old messages (older than 24 hours)
  history.messages = history.messages.filter(msg => {
    if (!msg.timestamp) return false;
    const msgDate = new Date(msg.timestamp);
    const nowDate = new Date();
    return nowDate.getTime() - msgDate.getTime() < 24 * 60 * 60 * 1000;
  });

  // Add new messages
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
  ];

  // Add new messages and keep only the last 10 conversations (20 messages, as each conversation has 2 messages)
  history.messages.push(...newMessages);
  if (history.messages.length > CHAT_HISTORY_LIMIT * 2) {
    history.messages = history.messages.slice(-CHAT_HISTORY_LIMIT * 2);
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
  
  // Return only the last 10 conversations (20 messages)
  return history.messages.slice(-CHAT_HISTORY_LIMIT * 2);
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
    history.messages = history.messages.map(msg => {
      if (msg.content.length > 10000) {
        return {
          ...msg,
          content: msg.content.substring(0, 10000) + '... [truncated]',
          timestamp: msg.timestamp || now
        };
      }
      return msg;
    });
    
    // Ensure history doesn't exceed 10 conversations
    if (history.messages.length > CHAT_HISTORY_LIMIT * 2) {
      history.messages = history.messages.slice(-CHAT_HISTORY_LIMIT * 2);
    }
    
    // Update the cleaned history
    chatHistories.set(key, history);
  });
}, CHAT_HISTORY_TTL / 2); 