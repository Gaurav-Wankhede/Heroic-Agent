import { Tool } from '@google/generative-ai';
import { getModel } from '@/lib/genai';

// Configure search tool
const searchTool = {
  google_search: {}
} as Tool;

// Initialize the model with search capability
export const getSearchModel = async () => {
  const model = await getModel();
  if (!model) {
    throw new Error('Search model not available');
  }
  return model;
};

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