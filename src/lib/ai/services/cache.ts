import { CacheEntry, CACHE_TTL } from '../types/chat';

// Message cache storage
export const messageCache = new Map<string, CacheEntry>();

// Function to get cached response
export function getCachedResponse(domain: string, message: string): CacheEntry | null {
  const cacheKey = `${domain}:${message}`;
  const cached = messageCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached;
  }
  
  return null;
}

// Function to cache response
export function cacheResponse(domain: string, message: string, entry: CacheEntry) {
  const cacheKey = `${domain}:${message}`;
  messageCache.set(cacheKey, {
    ...entry,
    timestamp: Date.now()
  });
}

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of messageCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      messageCache.delete(key);
    }
  }
}, CACHE_TTL); 