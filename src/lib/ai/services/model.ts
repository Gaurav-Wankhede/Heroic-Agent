import { GoogleGenerativeAI, Tool } from '@google/generative-ai';
import { genAI } from '../../genai';

if (!genAI) {
  throw new Error('Gemini AI is not properly initialized. Please check your API key configuration.');
}

// Configure search tool
const searchTool = {
  google_search: {}
} as Tool;

// Initialize the model with search capability
export const model = genAI.getGenerativeModel({
  model: "models/gemini-2.0-flash",
  tools: [searchTool],
  generationConfig: {
    temperature: 0.7,
    topK: 32,
    topP: 1,
    maxOutputTokens: 4096,
  }
});

// Model configuration for different purposes
export const MODEL_CONFIG = {
  text: {
    model: "models/gemini-2.0-flash",
    tools: [searchTool],
    generationConfig: {
      maxOutputTokens: 4096,
    }
  },
  vision: {
    model: "models/gemini-2.0-flash",
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 4096,
    },
    tools: [searchTool]
  }
}; 