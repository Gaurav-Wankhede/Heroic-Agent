import { ChatMessage } from '@/lib/ai/types/chat';
import { getModel } from '@/lib/genai';
import { buildPrompt } from './prompt';
import { updateChatHistory, getChatHistory, withTimeout } from '../services/chat';
import { getSearchModel } from '../services/model';
import { isQuestionRelevant } from '../utils/validation';
import { DOMAIN_CONFIG } from '../config/domains';
import { DomainError, AIError } from '../types/errors';
import { cacheResponse } from '../services/cache';
import { getDomainErrorSolution } from '../config/errors';

import { DOMAIN_URLS } from '../config/urls';
import { containsOtherDomainKeywords } from '../utils/validation';
import { validateAndFormatCitations } from '../utils/citationUtils';


// Function to detect domains in a message with improved accuracy
function getDetectedDomains(message: string, currentDomain: string): string[] {
  const messageLower = message.toLowerCase();
  const detectedDomains: string[] = [];
  
  // Common programming concepts that shouldn't trigger domain switches
  const commonConcepts = ['code', 'function', 'series', 'algorithm', 'example'];
  
  for (const [domain, config] of DOMAIN_CONFIG.entries()) {
    if (domain === currentDomain) continue;
    
    const keywordMatches = config.info.keywords.filter(keyword => {
      // Skip common programming concepts
      if (commonConcepts.includes(keyword.toLowerCase())) return false;
      // Skip generic update-related keywords
      if (['latest', 'news', 'update'].includes(keyword)) return false;
      return messageLower.includes(keyword.toLowerCase());
    });
    
    // More lenient domain detection - require only one strong match
    if (keywordMatches.length >= 1 && !isGenericProgrammingQuery(message)) {
      detectedDomains.push(domain);
    }
  }
  
  return detectedDomains;
}

// Helper to check if a query is a generic programming question
function isGenericProgrammingQuery(message: string): boolean {
  const genericPatterns = [
    /fibonacci/i,
    /sort.*(array|list)/i,
    /reverse.*string/i,
    /binary.*search/i,
    /linked.*list/i,
    /factorial/i,
    /palindrome/i,
    /array.*sort/i,
    /linked.*list/i,
    /factorial/i,
    // Add more common programming patterns
  ];
  
  return genericPatterns.some(pattern => pattern.test(message));
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

// Enhanced latest info patterns with more specific triggers
const LATEST_INFO_PATTERNS = {
  version: /(latest|current|new)\s+(version|release)/i,
  features: /(new|latest|recent)\s+(features|capabilities|additions)/i,
  updates: /(updates|changes|improvements|enhancements)/i,
  breaking: /(breaking\s+changes|deprecations|migrations)/i,
  trends: /(trends|popular|trending|recommended|best\s+practices)/i
};

export async function getLatestDomainInfo(domain: string, chatHistory: ChatMessage[] = []): Promise<string> {
  const model = await getModel();
  if (!model) throw new Error('Model not available');

  const config = DOMAIN_CONFIG.get(domain);
  if (!config) throw new DomainError(`Invalid domain: ${domain}`, domain);

  const currentDate = new Date().toISOString().split('T')[0];
  
  // Extract and analyze recent interactions for context
  const recentInteractions = chatHistory
    .slice(-6) // Get last 3 conversations (6 messages)
    .map(msg => ({
      role: msg.role,
      content: msg.content,
      interests: detectUserInterests(msg.content)
    }));

  // Build focused prompt based on detected patterns
  const prompt = buildLatestInfoPrompt(domain, currentDate, recentInteractions, config);

  try {
    const response = await withTimeout(
      model.generateContent([{ text: prompt }]),
      30000 // 30-second timeout for latest info
    );

    const content = response?.response?.text();
    if (!content) return 'Unable to fetch latest information.';

    // Format and structure the response
    return formatLatestInfoResponse(content, domain);
  } catch (error) {
    if (error instanceof Error && error.message.includes('taking too long')) {
      return `Latest ${domain} information request timed out. Please try a more specific query or check back later.`;
    }
    throw error;
  }
}

// Helper to detect user interests from messages
function detectUserInterests(message: string): string[] {
  const interests: string[] = [];
  
  // Check for specific interests in the message
  for (const [category, pattern] of Object.entries(LATEST_INFO_PATTERNS)) {
    if (pattern.test(message)) {
      interests.push(category);
    }
  }

  // Check for framework-specific interests
  const frameworkPatterns = {
    typescript: /typescript|tsx?|types|interfaces/i,
    react: /react|hooks|components|jsx/i,
    nextjs: /next\.?js|app\s+router|pages|api\s+routes/i,
    styling: /css|tailwind|styled|theme/i,
    performance: /performance|optimization|speed|loading/i,
    security: /security|auth|protection|vulnerability/i
  };

  for (const [framework, pattern] of Object.entries(frameworkPatterns)) {
    if (pattern.test(message)) {
      interests.push(framework);
    }
  }

  return [...new Set(interests)]; // Remove duplicates
}

// Helper to build focused prompt
function buildLatestInfoPrompt(
  domain: string,
  currentDate: string,
  recentInteractions: Array<{ role: string; content: string; interests: string[] }>,
  config: any
): string {
  // Aggregate user interests
  const userInterests = recentInteractions
    .filter(msg => msg.role === 'user')
    .flatMap(msg => msg.interests);
  
  const uniqueInterests = [...new Set(userInterests)];

  let prompt = `Provide focused ${domain} information as of ${currentDate}.\n\n`;

  // Add context from recent interactions
  if (recentInteractions.length > 0) {
    prompt += `Recent conversation context:\n`;
    recentInteractions.forEach(msg => {
      prompt += `${msg.role}: ${msg.content}\n`;
    });
    prompt += '\n';
  }

  // Add interest-based focus
  if (uniqueInterests.length > 0) {
    prompt += `Focus areas based on user interests:\n`;
    uniqueInterests.forEach(interest => {
      prompt += `- ${interest}\n`;
    });
    prompt += '\n';
  }

  // Add domain-specific guidance
  prompt += `Please provide information about:
1. ${domain} Updates:
   - Latest stable version: ${config.info.currentVersion || 'N/A'}
   - Recent features and improvements
   - Breaking changes and migrations
   ${uniqueInterests.includes('security') ? '- Security updates and patches' : ''}
   ${uniqueInterests.includes('performance') ? '- Performance improvements' : ''}

2. Best Practices:
   - Current recommended patterns
   - Common pitfalls to avoid
   - Performance optimizations
   ${uniqueInterests.includes('typescript') ? '- TypeScript integration' : ''}

3. Community Trends:
   - Popular tools and libraries
   - Emerging patterns
   - Common challenges and solutions

4. Resources:
   - Official documentation updates
   - Notable blog posts and tutorials
   - Community discussions

Format as a structured, easy-to-read summary with bullet points.
Prioritize information relevant to: ${uniqueInterests.join(', ') || 'general updates'}`;

  return prompt;
}

// Helper to format the response
function formatLatestInfoResponse(content: string, domain: string): string {
  // Split content into sections
  const sections = content.split(/\n\d+\./);
  
  // Format each section with proper spacing and bullet points
  const formattedSections = sections.map(section => {
    if (!section.trim()) return '';
    
    // Ensure proper bullet point formatting
    return section.replace(/^[-•]\s*/gm, '• ')
                 .replace(/([^.!?])\n/g, '$1\n')
                 .trim();
  });

  // Combine sections with proper spacing
  return `Latest ${domain} Updates\n\n${formattedSections.join('\n\n')}`;
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
      const offTopicResponse = handleOffTopicResponse(domain, message, userId);
      updateChatHistory(userId, domain, message, offTopicResponse.content);
      return offTopicResponse;
    }

    const model = await getSearchModel();
    if (!model) throw new Error('Search model not available');

    const config = DOMAIN_CONFIG.get(domain);
    if (!config) throw new DomainError(`Invalid domain: ${domain}`, domain);

    // Generate response with enhanced grounding and timeout handling
    const prompt = await buildPrompt(message, domain, config.info.prompt, chatHistory);
    const result = await withTimeout(model.generateContent([{ text: prompt }]));
    
    if (!result?.response) throw new Error('No response from model');

    const response = result.response;
    const content = response.text() || '';
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata as GroundingMetadata;

    // Enhanced citation validation and formatting with timeout
    const enhancedResponse = await withTimeout(enhanceResponseWithGrounding(
      content,
      groundingMetadata,
      domain
    ));

    // Update chat history with the enhanced response
    updateChatHistory(userId, domain, message, enhancedResponse.content);

    return enhancedResponse;
  } catch (error) {
    if (error instanceof Error && error.message.includes('taking too long')) {
      const timeoutResponse = {
        content: 'Response taking too long. Please try with a shorter or simpler query.',
        groundingMetadata: null
      };
      updateChatHistory(userId, domain, message, timeoutResponse.content);
      return timeoutResponse;
    }
    const errorResponse = handleResponseError(error, domain);
    updateChatHistory(userId, domain, message, errorResponse.content || 'Error processing request');
    return errorResponse;
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

  // Format citations and validate content with timeout
  const validatedContent = await withTimeout(validateAndFormatCitations(content, {
    ...metadata,
    webSearchSources: enhancedSources
  }));

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

// Helper to detect error patterns in the message
function detectErrorPattern(message: string): {
  hasError: boolean;
  errorType?: string;
  codeSnippet?: string;
  framework?: string;
} {
  // Common error patterns by domain
  const errorPatterns = {
    // Web/Frontend errors
    syntaxError: /(syntax|parsing)\s+error|unexpected token|unterminated string/i,
    typeError: /type\s+error|cannot read property|is not a function|undefined is not|null is not/i,
    referenceError: /reference\s+error|is not defined|cannot access|before initialization/i,
    runtimeError: /runtime\s+error|maximum call stack|heap out of memory/i,
    networkError: /(network|fetch|api)\s+error|failed to fetch|cors|404|500|timeout/i,
    buildError: /build\s+error|compilation|webpack|babel|ts(c)?\s+error/i,
    dependencyError: /dependency|module not found|cannot find module|package|npm|yarn/i,
    
    // NextJS specific errors
    nextError: /next\.js|getStaticProps|getServerSideProps|hydration|routing|dynamic import/i,
    routeError: /pages|routing|navigation|link|router/i,
    serverError: /server component|client component|server-side|api route/i,
    
    // React errors
    reactError: /react|component|hook|state|effect|render|props|context/i,
    hookError: /invalid hook|hook rules|useEffect|useState|useMemo|useCallback/i,
    
    // Database/API errors
    dbError: /database|query|mongodb|sql|prisma|connection failed/i,
    apiError: /api|endpoint|request|response|status code|authentication/i
  };

  // Framework/library detection
  const frameworkPatterns = {
    react: /react|jsx|component|hook/i,
    next: /next\.js|getStatic|getServer|_app|_document/i,
    typescript: /typescript|tsx?|type|interface/i,
    tailwind: /tailwind|css|className/i,
    prisma: /prisma|database|schema|model/i
  };

  // Code block detection patterns
  const codeBlockPatterns = [
    /```[\s\S]*?```/g,  // Markdown code blocks
    /`[^`]+`/g,         // Inline code
    /Error:\s*[\s\S]*?(?=\n\n|\n$|$)/i, // Error messages
    /(?:Exception|Error):\s*[^\n]+(?:\n\s+at\s+[^\n]+)*/, // Stack traces
    /(?:Warning|Debug):\s*[^\n]+/ // Warnings and debug messages
  ];

  // Extract code snippets - Fixed type error by using reduce to combine matches
  const codeSnippets = codeBlockPatterns.reduce<RegExpMatchArray[]>((matches, pattern) => {
    const match = message.match(pattern);
    return match ? [...matches, match] : matches;
  }, []).flat();

  const codeSnippet = codeSnippets.length > 0 ? 
    codeSnippets[0].replace(/```\w*\n?|`/g, '') : undefined;

  // Detect error type
  let errorType: string | undefined;
  for (const [type, pattern] of Object.entries(errorPatterns)) {
    if (pattern.test(message)) {
      errorType = type;
      break;
    }
  }

  // Detect framework
  let framework: string | undefined;
  for (const [name, pattern] of Object.entries(frameworkPatterns)) {
    if (pattern.test(message)) {
      framework = name;
      break;
    }
  }

  return {
    hasError: !!errorType || /error|exception|failed|issue|problem|debug|warning/i.test(message),
    errorType,
    codeSnippet,
    framework
  };
}

export function getOffTopicResponse(domain: string, message: string): string {
  const detectedDomains = getDetectedDomains(message, domain);
  const errorInfo = detectErrorPattern(message);
  
  // Handle error-related queries
  if (errorInfo.hasError) {
    let response = `I can help you debug this ${domain}-related issue. `;
    
    if (errorInfo.errorType) {
      response += `I see you're encountering a ${errorInfo.errorType.replace(/([A-Z])/g, ' $1').toLowerCase()}. `;
    }
    
    if (errorInfo.framework) {
      response += `I'll provide specific guidance for ${errorInfo.framework} in the context of ${domain}. `;
    }
    
    if (errorInfo.codeSnippet) {
      response += `I'll analyze your code and suggest solutions using ${domain} best practices. `;
    }
    
    response += `\n\nTo help you better:
1. Could you provide any additional context about when this error occurs?
2. Are you using any specific ${domain} features or libraries?
3. What have you tried so far to resolve this?
4. What version of ${errorInfo.framework || domain} are you using?

I'll help you troubleshoot this issue using ${domain} best practices and error handling patterns.`;
    
    return response;
  }

  // Handle generic programming queries
  if (isGenericProgrammingQuery(message)) {
    return `I can help you with that! While this is a common programming question, let me provide guidance specific to ${domain}. 
    
For the best domain-specific help:
1. Could you clarify how this relates to ${domain}?
2. Are you looking to implement this specifically using ${domain} features?
3. Would you like to see how this could be optimized using ${domain} best practices?

This will help me provide more relevant assistance for your use case.`;
  }
  
  if (detectedDomains.length > 0) {
    let response = `I notice you're asking about ${detectedDomains.join(', ')}. `;
    response += `While I can help with cross-domain questions, for the most detailed assistance with ${detectedDomains.join(', ')}, `;
    response += `you might want to switch to the specific domain. However, I can still help you if this relates to ${domain}.\n\n`;
    
    response += `If you'd like to continue in the ${domain} context, please let me know how I can help you integrate this with ${domain}.\n\n`;
    
    detectedDomains.forEach(d => {
      const url = DOMAIN_URLS[d];
      if (url) {
        response += `For dedicated ${d} help: ${url}\n`;
      }
    });
    
    return response;
  }

  return `I'm specialized in ${domain}-related topics. I notice your question might be about a different area. 
  
To help you better:
1. Could you explain how this relates to ${domain}?
2. Are you looking to implement this within a ${domain} project?
3. Would you like to see ${domain}-specific approaches to this problem?

This will help me provide more relevant assistance for your needs.`;
}

function handleResponseError(error: unknown, domain: string) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown AI model error';
  const solution = getDomainErrorSolution(domain, errorMessage);
  const errorInfo = detectErrorPattern(errorMessage);

  let response = `${errorMessage}\n\n`;
  
  if (errorInfo.hasError) {
    response += `This appears to be a ${errorInfo.errorType || 'technical'} issue. `;
    if (errorInfo.framework) {
      response += `Specifically related to ${errorInfo.framework} in ${domain}. `;
    }
    response += `Here's a ${domain}-specific solution:\n\n${solution}\n\n`;
    response += `Common ${domain} troubleshooting steps:
1. Check your ${domain} version and dependencies
2. Verify your configuration settings
3. Review the official ${domain} documentation for this feature
4. Consider using ${domain}'s built-in error handling patterns`;
  } else {
    response += `Suggested solution: ${solution}`;
  }

  return {
    content: response,
    groundingMetadata: null
  };
} 