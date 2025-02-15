import { ChatMessage } from '@/lib/ai/types/chat';
import { getModel } from '@/lib/genai';
import { buildPrompt } from './prompt';
import { updateChatHistory, getChatHistory, withTimeout } from '../services/chat';
import { DOMAIN_CONFIG } from '../config/domains';
import { DomainError } from '../types/errors';
import { cacheResponse } from '../services/cache';
import { getDomainErrorSolution } from '../config/errors';
import { validateAndFormatCitations, validateAndEnrichSources } from '../utils/citationUtils';
import { DomainLatestInfo, ValidatedSource } from '../types/domain';
import { GroundingMetadata } from '@/lib/ai/types/grounding'; 

// Add type for user interests
type UserInterest = 'features' | 'security' | 'performance' | 'api' | 'community' | 'ecosystem' | 'trends';

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

// Enhanced search relevance thresholds
const RELEVANCE_THRESHOLDS = {
  HIGH: 0.8,
  MEDIUM: 0.6,
  LOW: 0.4
};

// Enhanced latest info patterns with stricter matching and priority levels
const LATEST_INFO_PATTERNS = {
  CRITICAL: {
    version: /(latest|current|new)\s+(version|release|update)s?\b/i,
    breaking: /(breaking\s+changes|deprecations|migrations|critical\s+updates)/i,
    security: /(security|vulnerability|patch|hotfix|critical\s+fix)/i,
    date: /what('?s| is) today'?s date|current date|today/i,
    news: /latest news|breaking news|current news|news update/i
  },
  HIGH: {
    features: /(new|latest|recent)\s+(features|capabilities|additions|improvements)/i,
    api: /(api|endpoint|interface)\s+(changes|updates|improvements)/i,
    performance: /(performance|optimization|speed)\s+(improvements|updates|changes)/i,
    general: /give me latest|what'?s new|latest information|recent changes|news/i
  },
  MEDIUM: {
    trends: /(trends|popular|trending|recommended)\s+(patterns|practices|approaches)/i,
    community: /(community|ecosystem|library|package)\s+(updates|changes)/i,
    general: /updates|changes|news/i
  }
};

// Enhanced latest info detection with date and news awareness
function isLatestInfoRequest(message: string): { 
  isLatest: boolean; 
  priority: string; 
  categories: string[]; 
  includesDate: boolean;
  timeframe: 'immediate' | 'recent' | 'weekly' | 'monthly';
  isNewsRequest: boolean;
} {
  const messageLower = message.toLowerCase();
  const categories: string[] = [];
  
  // Check for date queries first
  const includesDate = LATEST_INFO_PATTERNS.CRITICAL.date.test(message);
  
  // Check for news requests
  const isNewsRequest = LATEST_INFO_PATTERNS.CRITICAL.news.test(message) || 
                       messageLower.includes('news') ||
                       messageLower.includes('latest');
  
  // Check for general latest info indicators
  const hasLatestIndicator = LATEST_INFO_PATTERNS.HIGH.general.test(message) || 
                            LATEST_INFO_PATTERNS.MEDIUM.general.test(message);
  
  // Determine timeframe
  let timeframe: 'immediate' | 'recent' | 'weekly' | 'monthly' = 'recent';
  if (messageLower.includes('now') || messageLower.includes('current') || includesDate) {
    timeframe = 'immediate';
  } else if (messageLower.includes('this week') || messageLower.includes('weekly')) {
    timeframe = 'weekly';
  } else if (messageLower.includes('this month') || messageLower.includes('monthly')) {
    timeframe = 'monthly';
  }
  
  // Enhanced priority detection
  for (const [priority, patterns] of Object.entries(LATEST_INFO_PATTERNS)) {
    for (const [category, pattern] of Object.entries(patterns)) {
      if (pattern.test(messageLower)) {
        categories.push(category);
        // Return immediately for date queries, news requests, or CRITICAL priority
        if (includesDate || isNewsRequest || (priority === 'CRITICAL' && category !== 'date')) {
          return { 
            isLatest: true, 
            priority: includesDate || isNewsRequest ? 'CRITICAL' : priority, 
            categories: [category],
            includesDate,
            timeframe,
            isNewsRequest
          };
        }
      }
    }
  }

  if (categories.length > 0 || includesDate || hasLatestIndicator || isNewsRequest) {
    const highestPriority = categories.some(cat => 
      Object.keys(LATEST_INFO_PATTERNS.HIGH).includes(cat)) ? 'HIGH' : 'MEDIUM';
    return { 
      isLatest: true, 
      priority: highestPriority,
      categories,
      includesDate,
      timeframe,
      isNewsRequest
    };
  }

  return { 
    isLatest: hasLatestIndicator,
    priority: 'LOW',
    categories: [],
    includesDate: false,
    timeframe: 'recent',
    isNewsRequest: false
  };
}

// Add the missing detectUserInterests function
function detectUserInterests(message: string): UserInterest[] {
  const interestPatterns: Record<UserInterest, RegExp[]> = {
    features: [/features?/i, /capabilities/i, /what.*can.*do/i],
    security: [/security/i, /vulnerab/i, /cve/i, /patch/i, /fix/i],
    performance: [/performance/i, /speed/i, /optimization/i, /slow/i],
    api: [/api/i, /endpoint/i, /interface/i, /method/i],
    community: [/community/i, /ecosystem/i, /people/i],
    ecosystem: [/package/i, /library/i, /dependency/i, /tool/i],
    trends: [/trend/i, /popular/i, /recommended/i, /best.*practice/i]
  };

  return Object.entries(interestPatterns)
    .filter(([_, patterns]) => patterns.some(pattern => pattern.test(message)))
    .map(([interest]) => interest as UserInterest);
}

export async function getLatestDomainInfo(domain: string, chatHistory: ChatMessage[] = []): Promise<string> {
  const model = await getModel();
  if (!model) throw new Error('Model not available');

  const config = DOMAIN_CONFIG.get(domain);
  if (!config) throw new DomainError(`Invalid domain: ${domain}`, domain);

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  // Extract and analyze recent interactions for context
  const recentInteractions = chatHistory
    .slice(-6) // Get last 3 conversations (6 messages)
    .map(msg => ({
      role: msg.role,
      content: msg.content,
      interests: detectUserInterests(msg.content),
      latestInfo: isLatestInfoRequest(msg.content)
    }));

  const prompt = buildPrioritizedLatestInfoPrompt(domain, currentDate, recentInteractions, config);

  try {
    const timeoutDuration = getTimeoutDuration(recentInteractions);
    const response = await withTimeout(
      model.generateContent([{ text: prompt }]),
      timeoutDuration
    );

    const content = response?.response?.text();
    if (!content) {
      return `As of ${currentDate}, I'm unable to fetch the latest ${domain} information. Please try a more specific query or check back later.`;
    }

    // Format and structure the response using formatPrioritizedResponse
    return formatPrioritizedResponse(content, domain, recentInteractions);
  } catch (error) {
    if (error instanceof Error && error.message.includes('taking too long')) {
      return generateTimeoutResponse(domain, recentInteractions);
    }
    throw error;
  }
}

// Helper to get timeout duration based on priority
function getTimeoutDuration(interactions: Array<any>): number {
  const latestRequest = interactions[interactions.length - 1]?.latestInfo;
  switch (latestRequest?.priority || 'LOW') {
    case 'CRITICAL': return 20000;
    case 'HIGH': return 25000;
    case 'MEDIUM': return 30000;
    default: return 35000;
  }
}

// Helper to build prioritized prompt
function buildPrioritizedLatestInfoPrompt(
  domain: string,
  currentDate: string,
  recentInteractions: Array<any>,
  config: any
): string {
  const latestRequest = recentInteractions[recentInteractions.length - 1]?.latestInfo || {
    priority: 'LOW',
    categories: [],
  };
  const uniqueInterests = [...new Set(recentInteractions.flatMap(msg => msg.interests || []))];

  let prompt = `Provide ${latestRequest.priority.toLowerCase()} priority ${domain} information as of ${currentDate}.\n\n`;

  if (latestRequest.categories?.length > 0) {
    prompt += `Priority focus areas:\n`;
    latestRequest.categories.forEach((category: string) => {
      prompt += `- ${category} (${latestRequest.priority} priority)\n`;
    });
    prompt += '\n';
  }

  // Add strict timeline guidance
  prompt += `Timeline focus: ${getTimelineFocus(latestRequest.priority, latestRequest.timeframe)}\n\n`;

  // Add domain-specific guidance with priority ordering
  prompt += buildPrioritizedSections(domain, config, latestRequest, uniqueInterests);

  return prompt;
}

// Helper to get timeline focus based on priority and timeframe
function getTimelineFocus(priority: string, timeframe: string): string {
  if (timeframe === 'immediate') return 'Immediate and current changes (last 24 hours)';
  if (timeframe === 'weekly') return 'Recent changes (last 7 days)';
  if (timeframe === 'monthly') return 'Monthly overview (last 30 days)';
  
  switch (priority) {
    case 'CRITICAL':
      return 'Immediate and recent changes (last 24-48 hours)';
    case 'HIGH':
      return 'Recent changes (last 7 days)';
    case 'MEDIUM':
      return 'Recent and upcoming changes (last 14 days)';
    default:
      return 'General updates (last 30 days)';
  }
}

// Helper to build prioritized sections
function buildPrioritizedSections(
  domain: string,
  config: any,
  latestRequest: any,
  interests: string[]
): string {
  let sections = '';

  // Critical Updates Section (always first if applicable)
  if (latestRequest.priority === 'CRITICAL') {
    sections += `CRITICAL UPDATES:\n`;
    sections += `- Latest stable version: ${config.info.currentVersion || 'N/A'}\n`;
    sections += `- Breaking changes and migrations\n`;
    sections += `- Security patches and fixes\n\n`;
  }

  // Main Sections (ordered by priority)
  sections += `Please provide information in the following priority order:

1. Latest Changes (Highest Priority):
   ${latestRequest.categories.map((cat: string) => `- ${cat.charAt(0).toUpperCase() + cat.slice(1)} updates`).join('\n   ')}
   - Version changes and migrations
   - Critical fixes and improvements

2. Recent Developments:
   - New features and capabilities
   - Performance improvements
   - API changes and updates
   ${interests.includes('security') ? '- Security updates and patches' : ''}

3. Community and Ecosystem:
   - Popular tools and libraries
   - Emerging patterns
   - Common challenges and solutions

4. Additional Context:
   - Official documentation updates
   - Notable blog posts and tutorials
   - Community discussions

Format as a structured, easy-to-read summary with bullet points.
Focus primarily on: ${latestRequest.categories.join(', ') || 'general updates'}
Timeline focus: ${getTimelineFocus(latestRequest.priority, latestRequest.timeframe)}`;

  return sections;
}

// Enhanced response formatting with date and news awareness
function formatPrioritizedResponse(content: string, domain: string, interactions: Array<any>): string {
  const latestRequest = interactions[interactions.length - 1]?.latestInfo;
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  
  // Add header with domain and date information
  let response = `${domain.toUpperCase()} ${latestRequest?.isNewsRequest ? 'NEWS' : 'UPDATES'}\n`;
  response += `As of ${currentDate}\n\n`;
  
  // Add temporal context
  if (latestRequest?.includesDate) {
    response += `Current Date and Time: ${currentDate}\n\n`;
  }
  
  // Add priority and category indicators
  if (latestRequest?.priority === 'CRITICAL') {
    response += `🔴 PRIORITY: CRITICAL\n`;
  } else if (latestRequest?.priority === 'HIGH') {
    response += `🔵 PRIORITY: HIGH\n`;
  }
  
  if (latestRequest?.categories?.length) {
    response += `Categories: ${latestRequest.categories.join(', ')}\n`;
  }
  
  response += `Timeframe: ${getTimelineFocus(latestRequest?.priority || 'MEDIUM', latestRequest?.timeframe || 'recent')}\n\n`;
  
  // Format the content sections with enhanced structure
  const sections = content.split(/\n\d+\./);
  const formattedSections = sections
    .map(section => {
      if (!section?.trim()) return '';
      
      // Add emoji indicators for different types of updates
      return section
        .replace(/^[-•]\s*/gm, '• ')
        .replace(/CRITICAL:?\s*/gi, '🔴 CRITICAL: ')
        .replace(/IMPORTANT:?\s*/gi, '🔵 IMPORTANT: ')
        .replace(/NEW:?\s*/gi, '✨ NEW: ')
        .replace(/UPDATE:?\s*/gi, '📢 UPDATE: ')
        .replace(/SECURITY:?\s*/gi, '🔒 SECURITY: ')
        .replace(/PERFORMANCE:?\s*/gi, '⚡ PERFORMANCE: ')
        .replace(/COMMUNITY:?\s*/gi, '👥 COMMUNITY: ')
        .replace(/([^.!?])\n/g, '$1\n')
        .trim();
    })
    .filter(Boolean);

  response += formattedSections.join('\n\n');
  
  // Add footer with update information
  response += `\n\nLast checked: ${currentDate}`;
  if (latestRequest?.timeframe) {
    response += `\nCovering: ${getTimelineFocus(latestRequest.priority || 'MEDIUM', latestRequest.timeframe)}`;
  }
  
  return response;
}

// Helper to generate appropriate timeout response
function generateTimeoutResponse(domain: string, interactions: Array<any>): string {
  const latestRequest = interactions[interactions.length - 1]?.latestInfo || {
    priority: 'LOW'
  };
  
  if (latestRequest.priority === 'CRITICAL') {
    return `Unable to fetch critical ${domain} updates in time. Please try again or check the official ${domain} documentation for urgent updates.`;
  }
  
  return `Latest ${domain} information request timed out. Please try a more specific query or check back later.`;
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
    const model = await getModel();
    if (!model) throw new Error('Model not available');

    const chatHistory = getChatHistory(userId, domain);
    const latestInfoRequest = isLatestInfoRequest(message);
    
    // Get current date/time in a consistent format
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Handle temporal queries with enhanced context
    if (latestInfoRequest.isLatest || latestInfoRequest.includesDate) {
      const temporalContext = {
        currentDate,
        domain,
        priority: latestInfoRequest.priority || 'MEDIUM',
        categories: latestInfoRequest.categories || [],
        includesDate: latestInfoRequest.includesDate
      };

      // Get domain-specific latest information with grounding
      const latestInfoStr = await getLatestDomainInfo(domain, chatHistory);
      
      // Get validated and enriched sources using Google grounding
      const query = `latest developments in ${domain.replace(/-/g, ' ')}`;
      const validatedSources = await validateAndEnrichSources(query, domain);

      // Create citations for each section using validated sources
      const keyDevelopments = extractSectionWithCitations(latestInfoStr, 'Key Developments', validatedSources);
      const trendingTopics = extractSectionWithCitations(latestInfoStr, 'Trending Topics', validatedSources);
      const bestPractices = extractSectionWithCitations(latestInfoStr, 'Current Best Practices', validatedSources);
      
      const latestInfo: DomainLatestInfo = {
        keyDevelopments: keyDevelopments.items,
        trendingTopics: trendingTopics.items,
        bestPractices: bestPractices.items,
        resources: validatedSources.map((source: ValidatedSource) => ({
          title: source.title,
          url: source.url,
          description: source.description
        })),
        lastUpdated: new Date().toISOString()
      };

      const domainConfig = DOMAIN_CONFIG.get(domain);
      if (!domainConfig) {
        throw new Error(`Invalid domain: ${domain}`);
      }

      // Format the response with latest information and grounding metadata
      const response = formatLatestInfoResponse(
        latestInfo,
        domain,
        domainConfig.description,
        {
          keyDevelopments: keyDevelopments.citations,
          trendingTopics: trendingTopics.citations,
          bestPractices: bestPractices.citations
        }
      );

      // Update chat history with the grounded response
      updateChatHistory(userId, domain, message, response.content);

      return {
        content: response.content,
        groundingMetadata: {
          webSearchSources: validatedSources
            .filter((source: ValidatedSource) => source.relevanceScore >= 70)
            .map((source: ValidatedSource) => ({
              title: source.title,
              url: source.url,
              snippet: source.description,
              relevanceScore: source.relevanceScore,
              timestamp: new Date().toISOString()
            })),
          temporalContext
        }
      };
    }

    // Handle regular domain-specific queries with enhanced context
    const prompt = await buildPrompt(message, domain, DOMAIN_CONFIG.get(domain)?.info.prompt || '', chatHistory);
    const result = await model.generateContent([{ text: prompt }]);
    
    if (!result?.response) throw new Error('No response from model');

    // Check if the query is off-topic
    const detectedDomains = getDetectedDomains(message, domain);
    if (detectedDomains.length > 0) {
      return handleOffTopicResponse(domain, message, userId);
    }

    const content = result.response.text();
    const groundingMetadata = result.response.candidates?.[0]?.groundingMetadata;

    // Enhance response with grounding and temporal context
    const response = await enhanceResponseWithGrounding(
      content || 'Unable to process your request.',
      groundingMetadata || null,
      {
        currentDate,
        domain,
        chatHistory
      }
    );

    updateChatHistory(userId, domain, message, response.content);
    return response;

  } catch (error) {
    console.error('Error in getChatResponse:', error);
    const errorResponse = handleResponseError(error, domain);
    updateChatHistory(userId, domain, message, errorResponse.content);
    return errorResponse;
  }
}

async function enhanceResponseWithGrounding(
  content: string,
  metadata: any | null,
  context: {
    currentDate: string;
    domain: string;
    chatHistory: ChatMessage[];
  }
) {
  if (!metadata?.webSearchSources?.length) {
    return { 
      content,
      groundingMetadata: {
        temporalContext: {
          currentDate: context.currentDate,
          domain: context.domain,
          lastInteraction: context.chatHistory[context.chatHistory.length - 1]?.timestamp
        }
      }
    };
  }

  // Convert Google's metadata to our custom format
  const customMetadata: GroundingMetadata = {
    webSearchSources: metadata.webSearchSources.map((source: any) => ({
      title: source.title,
      url: source.url,
      snippet: source.snippet,
      relevanceScore: source.relevanceScore,
      date: source.date
    })),
    temporalContext: {
      currentDate: context.currentDate,
      domain: context.domain,
      lastInteraction: context.chatHistory[context.chatHistory.length - 1]?.timestamp
    }
  };

  // Filter and sort sources by relevance
  const enhancedSources = customMetadata.webSearchSources?.
    filter(source => (source.relevanceScore ?? 0) >= RELEVANCE_THRESHOLDS.LOW)
    .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)) || [];

  // Format citations and validate content with timeout
  const validatedContent = await withTimeout(validateAndFormatCitations(content, {
    ...customMetadata,
    webSearchSources: enhancedSources
  }));

  return {
    content: validatedContent,
    groundingMetadata: {
      ...customMetadata,
      webSearchSources: enhancedSources
    }
  };
}

async function handleOffTopicResponse(domain: string, message: string, userId: string) {
  const response = await getOffTopicResponse(domain, message);
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

export async function getOffTopicResponse(domain: string, message: string): Promise<string> {
  const model = await getModel();
  if (!model) throw new Error('Model not available');

  const detectedDomains = getDetectedDomains(message, domain);
  const errorInfo = detectErrorPattern(message);
  const latestInfoRequest = isLatestInfoRequest(message);
  
  // Build the prompt based on the type of request
  let prompt = '';
  
  if (latestInfoRequest.includesDate || latestInfoRequest.isLatest) {
    const currentDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    if (latestInfoRequest.includesDate) {
      prompt = `Current date and time is ${currentDate}. Generate a natural response about the current date and ask if they would like to know about recent ${domain} updates. Format the response conversationally.`;
    }

    if (latestInfoRequest.isLatest) {
      prompt = `You are a ${domain} expert assistant. Generate a response about checking for the latest ${domain} information as of ${currentDate}.
      Priority Level: ${latestInfoRequest.priority}
      Focus Areas: ${latestInfoRequest.categories.join(', ') || 'general updates'}
      Include:
      1. Current date/time acknowledgment
      2. Priority level indicator (🔴 for CRITICAL, 🔵 for IMPORTANT)
      3. Specific areas being checked
      4. Offer to provide detailed information`;
    }
  } else if (errorInfo.hasError) {
    prompt = `You are a ${domain} expert assistant. Generate a response for a user experiencing a technical issue.
    Error Type: ${errorInfo.errorType || 'unspecified'}
    Framework: ${errorInfo.framework || domain}
    Include:
    1. Acknowledgment of the error type
    2. Request for specific information needed
    3. Mention of ${domain} best practices
    4. Offer to help troubleshoot`;
  } else if (detectedDomains.length > 0) {
    prompt = `You are a ${domain} expert assistant. Generate a response acknowledging that the user's question involves other domains (${detectedDomains.join(', ')}).
    Include:
    1. Acknowledgment of cross-domain nature
    2. Offer to help with ${domain}-specific aspects
    3. Suggestion to focus the question on ${domain}
    4. Maintain helpful and constructive tone`;
  } else {
    prompt = `You are a ${domain} expert assistant. Generate a response for an off-topic question.
    Include:
    1. Acknowledgment of specialization in ${domain}
    2. Request for clarification on ${domain} relevance
    3. Offer to help with ${domain}-specific approaches
    4. Maintain helpful and constructive tone`;
  }

  try {
    const response = await model.generateContent([{ text: prompt }]);
    const content = response?.response?.text();
    if (!content) throw new Error('No response from model');
    return content;
  } catch (error) {
    console.error('Error generating response:', error);
    return `I'm specialized in ${domain}-related topics. Could you help me understand how I can assist you with ${domain}?`;
  }
}

export function handleResponseError(error: unknown, domain: string) {
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

interface SectionWithCitations {
  items: string[];
  citations: string[];
}

function extractSectionWithCitations(
  content: string,
  sectionName: string,
  sources: Array<{
    title: string;
    url: string;
    description?: string;
    relevanceScore?: number;
  }>
): SectionWithCitations {
  const items: string[] = [];
  const citations: string[] = [];
  
  // Extract section content using regex
  const sectionRegex = new RegExp(`${sectionName}:([\\s\\S]*?)(?=\\n\\n|$)`);
  const sectionMatch = content.match(sectionRegex);
  
  if (sectionMatch && sectionMatch[1]) {
    // Split into bullet points and process each
    const bulletPoints = sectionMatch[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('•') || line.startsWith('-'));
    
    bulletPoints.forEach(point => {
      // Find most relevant source for this point
      const relevantSource = findMostRelevantSource(point, sources);
      
      if (relevantSource) {
        items.push(point.replace(/^[•-]\s*/, ''));
        citations.push(`[Source: ${relevantSource.title}](${relevantSource.url})`);
      }
    });
  }
  
  return { items, citations };
}

function findMostRelevantSource(
  text: string,
  sources: Array<{
    title: string;
    url: string;
    description?: string;
    relevanceScore?: number;
  }>
): { title: string; url: string } | null {
  let bestMatch = null;
  let highestScore = 0;
  
  for (const source of sources) {
    const score = calculateRelevanceScore(text, source.description || source.title);
    if (score > highestScore && score > 0.3) { // Minimum threshold
      highestScore = score;
      bestMatch = source;
    }
  }
  
  return bestMatch;
}

function calculateRelevanceScore(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\W+/));
  const words2 = new Set(text2.toLowerCase().split(/\W+/));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

function formatLatestInfoResponse(
  latestInfo: DomainLatestInfo,
  domain: string,
  domainDescription?: string,
  citations?: {
    keyDevelopments: string[];
    trendingTopics: string[];
    bestPractices: string[];
  }
): {
  content: string;
  sources: Array<{ title: string; url: string; snippet: string; }>;
} {
  const formattedDomain = domain.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  let content = `Here's the latest information about ${formattedDomain}:\n\n`;

  if (domainDescription) {
    content += `${domainDescription}\n\n`;
  }

  // Add key developments with citations
  if (latestInfo.keyDevelopments?.length) {
    content += "🔑 Key Developments:\n";
    latestInfo.keyDevelopments.forEach((dev: string, index: number) => {
      content += `• ${dev}`;
      if (citations?.keyDevelopments[index]) {
        content += ` ${citations.keyDevelopments[index]}`;
      }
      content += '\n';
    });
    content += "\n";
  }

  // Add trending topics with citations
  if (latestInfo.trendingTopics?.length) {
    content += "📈 Trending Topics:\n";
    latestInfo.trendingTopics.forEach((topic: string, index: number) => {
      content += `• ${topic}`;
      if (citations?.trendingTopics[index]) {
        content += ` ${citations.trendingTopics[index]}`;
      }
      content += '\n';
    });
    content += "\n";
  }

  // Add best practices with citations
  if (latestInfo.bestPractices?.length) {
    content += "✨ Current Best Practices:\n";
    latestInfo.bestPractices.forEach((practice: string, index: number) => {
      content += `• ${practice}`;
      if (citations?.bestPractices[index]) {
        content += ` ${citations.bestPractices[index]}`;
      }
      content += '\n';
    });
    content += "\n";
  }

  // Add resources
  if (latestInfo.resources?.length) {
    content += "📚 Recommended Resources:\n";
    latestInfo.resources.forEach((resource: { title: string; url: string; }) => {
      content += `• ${resource.title} - ${resource.url}\n`;
    });
  }

  // Format sources for grounding
  const sources = latestInfo.resources?.map((resource: { title: string; url: string; description?: string; }) => ({
    title: resource.title,
    url: resource.url,
    snippet: resource.description || ''
  })) || [];

  return {
    content,
    sources
  };
} 