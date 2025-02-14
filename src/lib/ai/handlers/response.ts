import { ChatMessage } from '@/lib/ai/types/chat';
import { model } from '@/lib/ai/services/model';
import { isErrorQuery, isQuestionRelevant } from '@/lib/ai/utils/validation';
import { DOMAIN_CONFIG, DOMAIN_PROMPTS } from '@/lib/ai/config/domains';
import { DomainError, AIError } from '@/lib/ai/types/errors';
import { getChatHistory, updateChatHistory } from '@/lib/ai/services/chat';
import { cacheResponse } from '@/lib/ai/services/cache';
import { buildPrompt } from '@/lib/ai/handlers/prompt';
import { DOMAIN_ERROR_SOLUTIONS, getDomainErrorSolution, getDomainExamples } from '@/lib/ai/config/errors';
import { Tool } from '@google/generative-ai';
import { genAI } from '@/lib/genai';
import { DOMAIN_URLS } from '@/lib/ai/config/urls';
import { containsOtherDomainKeywords } from '@/lib/ai/utils/validation';

// Common constants for question handling
const COMMON_QUESTION_WORDS: string[] = [
  'what', 'how', 'why', 'when', 'where', 'which', 'who',
  'can', 'do', 'does', 'is', 'are', 'will', 'would',
  'should', 'could', 'may', 'might', 'must',
  'help', 'tell', 'explain', 'show', 'guide',
  'capabilities', 'features', 'functions', 'abilities'
];

// Function to detect domains in a message
function getDetectedDomains(message: string, currentDomain: string): string[] {
  const messageLower = message.toLowerCase();
  const detectedDomains: string[] = [];
  
  for (const [domain, config] of DOMAIN_CONFIG.entries()) {
    if (domain === currentDomain) continue;
    
    const keywordMatches = config.info.keywords.filter(keyword => {
      if (['latest', 'news', 'update'].includes(keyword)) return false;
      return messageLower.includes(keyword.toLowerCase());
    });
    
    if (keywordMatches.length >= 2 && !containsOtherDomainKeywords(message, domain)) {
      detectedDomains.push(domain);
    }
  }
  
  return detectedDomains;
}

interface GoogleSearchTool {
  google_search: Record<string, never>;
}

// Configure search tool
const searchTool = {
  google_search: {}
} as Tool;

// Helper function to validate URLs
async function validateUrls(urls: string[]): Promise<Set<string>> {
  const validUrls = new Set<string>();
  
  await Promise.all(urls.map(async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        validUrls.add(url);
      }
    } catch (error) {
      console.warn(`Failed to validate URL: ${url}`, error);
    }
  }));
  
  return validUrls;
}

export async function getChatResponse(message: string, domain: string, userId: string = 'default') {
  try {
    const chatHistory = getChatHistory(userId, domain);
    
    if (!isQuestionRelevant(message, domain, chatHistory)) {
      const response = getOffTopicResponse(domain, message);
      cacheResponse(domain, message, {
        response,
        timestamp: Date.now(),
        history: chatHistory
      });
      updateChatHistory(userId, domain, message, response);
      return {
        content: response,
        groundingMetadata: null,
      };
    }
    
    const config = DOMAIN_CONFIG.get(domain);
    if (!config) {
      throw new DomainError(`Invalid domain: ${domain}`, domain);
    }

    // Create model instance with enhanced search capability
    const searchModel = genAI?.getGenerativeModel({
      model: "models/gemini-2.0-flash",
      tools: [searchTool],
      generationConfig: {
        temperature: 0.4, // Lower temperature for more focused responses
        topK: 40,        // Increased for better search results
        topP: 0.95,      // Slightly reduced for more precise responses
        maxOutputTokens: 4096
      }
    });
    
    // Enhanced prompt with citation requirements
    const enhancedPrompt = await buildPrompt(message, domain, config.info.prompt, chatHistory);
    const citationPrompt = `${enhancedPrompt}\n\nIMPORTANT CITATION GUIDELINES:
    1. Only cite EXISTING and VERIFIABLE sources
    2. Include full source URLs for all factual claims
    3. Prefer official documentation and reputable sources
    4. Format citations as [Source: Title (Date) - URL]
    5. For news, only cite existing articles with real dates
    6. Verify all URLs exist before citing\n\n`;

    const result = await searchModel?.generateContent(citationPrompt);
    const response = await result?.response;
    const content = response?.text();

    // Extract and validate groundingMetadata
    const groundingMetadata = response?.candidates?.[0]?.groundingMetadata || null;
    
    // Validate citations in content
    const validatedContent = await validateAndFormatCitations(content || '', groundingMetadata);
    
    // Cache the validated response
    cacheResponse(domain, message, {
      response: validatedContent,
      timestamp: Date.now(),
      history: chatHistory
    });

    updateChatHistory(userId, domain, message, validatedContent);

    return {
      content: validatedContent,
      groundingMetadata,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown AI model error';
    const solution = getDomainErrorSolution(domain, errorMessage);
    
    throw new AIError(`${errorMessage}\n\nSuggested solution: ${solution}`, 'RESPONSE_ERROR');
  }
}

// New helper function to validate and format citations
async function validateAndFormatCitations(content: string, metadata: any): Promise<string> {
  if (!content) return '';

  // Extract URLs from content
  const urlRegex = /\bhttps?:\/\/[^\s<>[\](){}]+/g;
  const urls = content.match(urlRegex) || [];

  // Validate URLs
  const validUrls = await validateUrls(urls);

  // Replace invalid URLs with warning
  let validatedContent = content;
  urls.forEach(url => {
    if (!validUrls.has(url)) {
      validatedContent = validatedContent.replace(
        url,
        '[Source URL not available or could not be verified]'
      );
    }
  });

  return validatedContent;
}

export async function getLatestDomainInfo(domain: string, chatHistory: ChatMessage[] = []): Promise<string> {
  const currentYear = new Date().getFullYear();
  const searchQuery = `latest ${domain} news updates features trends ${currentYear}`;
  
  try {
    // Create model instance with enhanced search capability
    const searchModel = genAI?.getGenerativeModel({
      model: "models/gemini-2.0-flash",
      tools: [searchTool],
      generationConfig: {
        temperature: 0.3, // Lower temperature for factual responses
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 4096,
      }
    });

    const prompt = `Use this search query to find VERIFIED information: "${searchQuery}"

Search for the latest information about ${domain} including:
1. Recent news and announcements (only from reputable sources)
2. Latest features and updates (from official documentation)
3. Current trends (with data-backed evidence)
4. New tools and capabilities (from verified sources)
5. Important integrations (from official announcements)

STRICT CITATION GUIDELINES:
1. ONLY cite information from verifiable sources
2. NO future dates or unannounced features
3. Include FULL source details:
   - Publication name
   - Publication date (YYYY-MM-DD format)
   - Author (if available)
   - Complete URL
4. Prefer sources in this order:
   - Official documentation
   - Official blog posts
   - Reputable tech news sites
   - Verified expert articles
5. For each claim, include at least one citation
6. Format citations as: [Source: Title (YYYY-MM-DD) by Author - URL]

${chatHistory.length > 0 ? `Previous Context:\n${chatHistory.slice(-3).map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n` : ''}

Format the response with clear sections and proper citations.`;

    const result = await searchModel?.generateContent(prompt);
    if (!result?.response) {
      throw new Error('No response received from model');
    }

    const responseText = result.response.text();
    
    // Validate and clean response
    const validatedResponse = await validateLatestInfo(responseText);
    return validatedResponse;
  } catch (error) {
    console.error('Error fetching latest information:', error);
    return `Unable to fetch latest information for ${domain}. Please try again later.`;
  }
}

// Helper function to validate latest information
async function validateLatestInfo(response: string): Promise<string> {
  // Extract all URLs from the response
  const urlRegex = /\bhttps?:\/\/[^\s<>[\](){}]+/g;
  const urls = response.match(urlRegex) || [];
  
  // Validate URLs
  const validUrls = await validateUrls(urls);
  
  // Process each line of the response
  const lines = response.split('\n');
  const validatedLines = await Promise.all(lines.map(async line => {
    // Skip lines without URLs
    if (!urlRegex.test(line)) return line;
    
    // Check each URL in the line
    for (const url of line.match(urlRegex) || []) {
      if (!validUrls.has(url)) {
        // Replace invalid URL with warning
        line = line.replace(url, '[Source URL not available or could not be verified]');
      }
    }
    return line;
  }));
  
  return validatedLines.join('\n');
}

export function getOffTopicResponse(domain: string, message: string): string {
  const detectedDomains = getDetectedDomains(message, domain);
  let response = '';

  if (detectedDomains.length > 0) {
    response = `I notice you're asking about ${detectedDomains.join(', ')}. `;
    response += `While I can help with basic questions, for detailed assistance with ${detectedDomains.join(', ')}, `;
    response += `please switch to the appropriate domain using the domain selector.\n\n`;
    
    detectedDomains.forEach((d: string) => {
      const url = DOMAIN_URLS[d];
      if (url) {
        response += `For ${d}: ${url}\n`;
      }
    });
  } else {
    response = `I'm focused on ${domain}-related topics. `;
    response += `While I can provide basic information about other subjects, `;
    response += `for detailed assistance in other areas, please switch to the appropriate domain using the domain selector.`;
  }

  return response;
} 