import { GoogleGenerativeAI } from '@google/generative-ai';

// Cache for initialized AI instance
let cachedAI: GoogleGenerativeAI | null = null;

// Validate API key format (basic check)
function isValidApiKey(key: string): boolean {
  return key.length > 0 && key.startsWith('AI');
}

// Initialize Gemini AI with error handling and caching
function initializeGenAI() {
  // Return cached instance if available
  if (cachedAI) return cachedAI;

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY environment variable is not set');
    return null;
  }

  if (!isValidApiKey(apiKey)) {
    console.error('Invalid GEMINI_API_KEY format');
    return null;
  }

  try {
    cachedAI = new GoogleGenerativeAI(apiKey);
    return cachedAI;
  } catch (error) {
    console.error('Error initializing Gemini AI:', error);
    return null;
  }
}

export const genAI = initializeGenAI();

// Export a function to check if Gemini AI is properly initialized
export function isGenAIInitialized(): boolean {
  return genAI !== null;
}

// Export a function to reinitialize AI if needed
export function reinitializeAI(): GoogleGenerativeAI | null {
  cachedAI = null;
  return initializeGenAI();
} 