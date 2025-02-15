import { ChatMessage } from '@/lib/ai/types/chat';
import { getModel } from '@/lib/genai';
import { buildPrompt } from './prompt';
import { updateChatHistory, getChatHistory } from '../services/chat';
import { getSearchModel } from '../services/model';
import { isQuestionRelevant } from '../utils/validation';
import { DOMAIN_CONFIG } from '../config/domains';
import { DomainError, AIError } from '../types/errors';
import { cacheResponse } from '../services/cache';
import { getDomainErrorSolution } from '../config/errors';

import { DOMAIN_URLS } from '../config/urls';
import { containsOtherDomainKeywords } from '../utils/validation';
import { validateAndFormatCitations } from '../utils/citationUtils';


// Add retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds



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

interface GroundingMetadata {
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

// Enhanced search relevance thresholds
const RELEVANCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4
};

export async function getLatestDomainInfo(domain: string, chatHistory?: ChatMessage[]): Promise<string> {
  const model = await getModel();
  if (!model) throw new Error('Model not available');

  const config = DOMAIN_CONFIG.get(domain);
  if (!config) throw new DomainError(`Invalid domain: ${domain}`, domain);

  const currentDate = new Date().toISOString().split('T')[0];
  const prompt = `Provide the latest ${domain} information as of ${currentDate}:
1. Recent Updates:
   - Framework versions and changes
   - New features and deprecations
   - Breaking changes and migrations
2. Best Practices:
   - Current recommended patterns
   - Performance optimizations
   - Security considerations
3. Community Trends:
   - Popular tools and libraries
   - Emerging patterns
   - Common challenges and solutions
4. Resources:
   - Official documentation updates
   - Notable blog posts and tutorials
   - Community discussions

Format as a structured, easy-to-read summary with bullet points.`;

  const response = await model.generateContent([{ text: prompt }]);
  return response?.response?.text() || 'Unable to fetch latest information.';
}

/**
 * Get chat response with enhanced file context handling
 */
export async function getChatResponse(
  message: string,
  domain: string,
  userId: string = 'default'
) {
  try {
    const chatHistory = getChatHistory(userId, domain);
    
    if (!isQuestionRelevant(message, domain, chatHistory)) {
      return handleOffTopicResponse(domain, message, userId);
    }

    const model = await getSearchModel();
    if (!model) throw new Error('Search model not available');

    const config = DOMAIN_CONFIG.get(domain);
    if (!config) throw new DomainError(`Invalid domain: ${domain}`, domain);

    // Generate response with enhanced grounding
    const prompt = await buildPrompt(message, domain, config.info.prompt, chatHistory);
    const result = await model.generateContent([{ text: prompt }]);
    
    if (!result?.response) throw new Error('No response from model');

    const response = result.response;
    const content = response.text() || '';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata as GroundingMetadata;

    // Enhanced citation validation and formatting
    const enhancedResponse = await enhanceResponseWithGrounding(
      content,
      groundingMetadata,
      domain
    );

    // Update chat history
    updateChatHistory(userId, domain, message, enhancedResponse.content);

    return enhancedResponse;
  } catch (error) {
    return handleResponseError(error, domain);
  }
}

async function enhanceResponseWithGrounding(
  content: string,
  metadata: GroundingMetadata | null,
  domain: string
) {
  if (!metadata?.webSearchSources?.length) {
    return { content, groundingMetadata: metadata };
  }

  // Filter and sort sources by relevance
  const enhancedSources = metadata.webSearchSources
    .filter(source => source.relevanceScore >= RELEVANCE_THRESHOLDS.LOW)
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

  // Format citations and validate content
  const validatedContent = await validateAndFormatCitations(content, {
    ...metadata,
    webSearchSources: enhancedSources
  });

  return {
    content: validatedContent,
    groundingMetadata: {
      ...metadata,
      webSearchSources: enhancedSources
    }
  };
}

function handleOffTopicResponse(domain: string, message: string, userId: string) {
  const response = getOffTopicResponse(domain, message);
  cacheResponse(domain, message, {
    response,
    timestamp: Date.now(),
    history: getChatHistory(userId, domain)
  });
  return {
    content: response,
    groundingMetadata: null
  };
}

function handleResponseError(error: unknown, domain: string) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown AI model error';
  const solution = getDomainErrorSolution(domain, errorMessage);
  throw new AIError(`${errorMessage}\n\nSuggested solution: ${solution}`, 'RESPONSE_ERROR');
}

export function getOffTopicResponse(domain: string, message: string): string {
  const detectedDomains = getDetectedDomains(message, domain);
  
  if (detectedDomains.length > 0) {
    let response = `I notice you're asking about ${detectedDomains.join(', ')}. `;
    response += `While I can help with basic questions, for detailed assistance with ${detectedDomains.join(', ')}, `;
    response += `please switch to the appropriate domain using the domain selector.\n\n`;
    
    detectedDomains.forEach(d => {
      const url = DOMAIN_URLS[d];
      if (url) {
        response += `For ${d}: ${url}\n`;
      }
    });
    
    return response;
  }

  return `I'm focused on ${domain}-related topics. ` +
         `While I can provide basic information about other subjects, ` +
         `for detailed assistance in other areas, please switch to the appropriate domain.`;
} 