import { scrapeLinks } from './linkScraper';
import { validateAndEnrichSources, type ScrapedSource } from './webScraper';
import { DomainLatestInfo } from '../types/domain';
import { LatestInfoResponse } from '../types/latestInfo';
import { DOMAIN_CONFIG } from '../config/domains';
import { getLatestDomainInfo } from '../handlers/response';
import { 
  LinkValidationResult, 
  WebValidationResult, 
  ContentValidationResult,
  ValidationResults 
} from '../types/pipeline/validations';

import { getModel } from '@/lib/genai';
import axios from 'axios';
import { 
  errorHandler, 
  DomainError, 
  ScrapingError, 
  NetworkError, 
  RateLimitError
} from '../utils/errorHandler';
import { ValidationError } from '../utils/errorHandler';
import { linkValidator } from '../utils/linkValidator';
import { webValidator } from '../utils/webValidator';
import { contentValidator } from '../utils/contentValidator';
import { calculateSimilarity } from '@/lib/ai/utils/similarity';
import { type CitationSource } from '@/components/chat/Citation';
import {
  type PipelineMetrics,
  type PipelineOptions,
  type Source
} from '@/types/pipeline';

export interface PipelineResult {
  content: string;
  isValid?: boolean;
  score?: number;
  sources: Array<{
    title: string;
    url: string;
    description: string;
    relevanceScore: number;
    date?: string;
    content: string;
    score: number;
    relevance: number;
    metadata: {
      date?: string;
      wordCount?: number;
      readingTime?: number;
    };
    validations: ValidationResults;
  }>;
  metadata: {
    totalSources: number;
    validSources: number;
    averageScore: number;
    retries: number;
    processingSteps?: string[];
    queryType?: string;
    domain?: string;
    lastInteraction?: string;
    includesDate?: boolean;
    timestamp?: number;
    query?: string;
    duration?: number;
    cacheHits?: number;
  };
  citations?: Array<{
    url: string;
    title: string;
    description: string;
    date: string;
    relevanceScore: number;
  }>;
  errors: Array<{
    url: string;
    phase: string;
    error: string;
    code: string;
  }>;
  groundingMetadata: {
    webSearchSources: Array<{
      title: string;
      url: string;
      snippet: string;
      date?: string;
      relevanceScore?: number;
    }>;
  };
}

// Get search model instance
async function getSearchModel() {
  const model = await getModel();
  if (!model) {
    throw new Error('Search model not available');
  }
  return model;
}

// Default options
const DEFAULT_OPTIONS: Required<PipelineOptions> = {
  linkValidation: {},
  webValidation: {},
  contentValidation: {},
  maxConcurrentRequests: 5,
  timeout: 30000,
  retryCount: 3,
  retryDelay: 1000,
  cacheResults: true,
  similarityThreshold: 0.6,
  maxResults: 10,
  sortResults: true,
  filterDuplicates: true,
  includeMetadata: true,
  logProgress: false
};

// Pipeline service class
export class PipelineService {
  private static instance: PipelineService;
  private cache: Map<string, PipelineResult>;
  private activeRequests: number;

  private constructor() {
    this.cache = new Map();
    this.activeRequests = 0;
  }

  public static getInstance(): PipelineService {
    if (!PipelineService.instance) {
      PipelineService.instance = new PipelineService();
    }
    return PipelineService.instance;
  }

  /**
   * Process a query through the pipeline
   */
  public async process(
    query: string,
    urls: string[],
    options: Partial<PipelineOptions> = {}
  ): Promise<PipelineResult> {
    try {
      const fullOptions = { ...DEFAULT_OPTIONS, ...options };
      const startTime = Date.now();
      
      // Initialize result with empty errors array
      const result: PipelineResult = {
        isValid: true,
        score: 0,
        sources: [],
        metadata: {
          query,
          timestamp: startTime,
          duration: 0,
          totalSources: urls.length,
          validSources: 0,
          averageScore: 0,
          cacheHits: 0,
          retries: 0,
          processingSteps: [],
          queryType: '',
          domain: '',
          lastInteraction: '',
          includesDate: false
        },
        citations: [],
        errors: [], // Initialize empty errors array
        content: '',
        groundingMetadata: {
          webSearchSources: []
        }
      };

      // Check cache
      if (fullOptions.cacheResults) {
        const cacheKey = this.getCacheKey(query, urls, fullOptions);
        const cachedResult = this.cache.get(cacheKey);
        if (cachedResult) {
          if (cachedResult.metadata.cacheHits !== undefined) {
            cachedResult.metadata.cacheHits++;
          } else {
            cachedResult.metadata.cacheHits = 1;
          }
          return cachedResult;
        }
      }

      // Process URLs in batches
      const batches = this.createBatches(urls, fullOptions.maxConcurrentRequests);
      for (const batch of batches) {
        const batchResults = await Promise.all(
          batch.map(url => this.processUrl(url, query, fullOptions, result))
        );
        
        // Add valid results to sources
        batchResults
          .filter(source => source !== null)
          .forEach(source => {
            if (source) {
              result.sources.push({
                title: source.title,
                url: source.url,
                description: source.description || '',
                relevanceScore: source.relevance || 0,
                date: source.metadata.date,
                content: source.content,
                score: source.score,
                relevance: source.relevance || 0,
                metadata: source.metadata,
                validations: {
                  link: source.validations?.link,
                  web: source.validations?.web,
                  content: source.validations?.content
                }
              });
              result.metadata.validSources++;
            }
          });
      }

      // Post-process results
      if (fullOptions.filterDuplicates) {
        this.removeDuplicates(result.sources);
      }

      if (fullOptions.sortResults) {
        this.sortResults(result.sources);
      }

      if (result.sources.length > fullOptions.maxResults) {
        result.sources = result.sources.slice(0, fullOptions.maxResults);
      }

      // Generate citations
      result.citations = this.generateCitations(result.sources);

      // Calculate final score
      result.score = this.calculateOverallScore(result);
      result.metadata.averageScore = result.sources.reduce((sum, source) => sum + source.score, 0) / result.sources.length;
      result.metadata.duration = Date.now() - startTime;

      // Cache result
      if (fullOptions.cacheResults) {
        const cacheKey = this.getCacheKey(query, urls, fullOptions);
        this.cache.set(cacheKey, result);
      }

      // Format response
      const response = this.formatLatestInfoResponse(result);

      return {
        content: response.content,
        isValid: true,
        score: result.score,
        sources: result.sources,
        metadata: {
          ...result.metadata,
          query: result.metadata.query || query,
          timestamp: result.metadata.timestamp || Date.now()
        },
        citations: result.citations,
        errors: result.errors,
        groundingMetadata: response.groundingMetadata
      };

    } catch (error) {
      throw new ValidationError(`Pipeline processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a single URL
   */
  private async processUrl(
    url: string,
    query: string,
    options: Required<PipelineOptions>,
    result: PipelineResult
  ): Promise<Source | null> {
    try {
      // Validate link
      const linkResult = await this.retryOperation(
        () => linkValidator.validateLink(url, new URL(url).hostname, options.linkValidation),
        options.retryCount,
        options.retryDelay,
        result
      );

      if (!linkResult.isValid) {
        result.errors.push({
          url,
          phase: 'link',
          error: 'Link validation failed',
          code: 'LINK_INVALID'
        });
        return null;
      }

      // Validate web page
      const webResult = await this.retryOperation(
        () => webValidator.validateWeb(url, new URL(url).hostname, options.webValidation),
        options.retryCount,
        options.retryDelay,
        result
      );

      if (!webResult.isValid) {
        result.errors.push({
          url,
          phase: 'web',
          error: 'Web validation failed',
          code: 'WEB_INVALID'
        });
        return null;
      }

      // Extract content from document
      const extractedContent = webResult.metadata?.description || '';

      // Validate content
      const contentResult = contentValidator.validateContent(
        extractedContent,
        new URL(url).hostname,
        options.contentValidation
      );

      if (!contentResult.isValid) {
        result.errors.push({
          url,
          phase: 'content',
          error: 'Content validation failed',
          code: 'CONTENT_INVALID'
        });
        return null;
      }

      // Calculate relevance score
      const relevance = calculateSimilarity(query, extractedContent);

      if (relevance < options.similarityThreshold) {
        result.errors.push({
          url,
          phase: 'processing',
          error: 'Content relevance below threshold',
          code: 'LOW_RELEVANCE'
        });
        return null;
      }

      // Create source
      const source: Source = {
        url,
        title: webResult.metadata.title,
        description: webResult.metadata.description,
        content: extractedContent,
        score: (linkResult.score + webResult.score + contentResult.score) / 3,
        relevance,
        validations: {
          link: linkResult,
          web: webResult,
          content: contentResult
        },
        metadata: {
          author: webResult.metadata.author,
          date: webResult.metadata.headers?.['last-modified'] || new Date().toISOString(),
          language: webResult.metadata.language,
          wordCount: contentResult.metadata.wordCount,
          readingTime: contentResult.metadata.readingTime,
          extractedContent
        }
      };

      return source;

    } catch (error) {
      result.errors.push({
        url,
        phase: 'processing',
        error: `Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'PROCESSING_ERROR'
      });
      return null;
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number,
    delay: number,
    result: PipelineResult
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        result.metadata.retries++;
        
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
        }
      }
    }

    throw lastError;
  }

  /**
   * Create batches of URLs for concurrent processing
   */
  private createBatches(urls: string[], batchSize: number): string[][] {
    const batches: string[][] = [];
    for (let i = 0; i < urls.length; i += batchSize) {
      batches.push(urls.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Remove duplicate sources based on content similarity
   */
  private removeDuplicates(sources: Array<{
    title: string;
    url: string;
    description: string;
    relevanceScore: number;
    date?: string;
    content: string;
    score: number;
    relevance: number;
    metadata: {
      date?: string;
      wordCount?: number;
      readingTime?: number;
    };
    validations: {
      link?: LinkValidationResult;
      web?: WebValidationResult;
      content?: ContentValidationResult;
    };
  }>): void {
    const seen = new Set<string>();
    let i = 0;
    
    while (i < sources.length) {
      const source = sources[i];
      const key = `${source.title}|${source.description}`;
      
      if (seen.has(key)) {
        sources.splice(i, 1);
      } else {
        seen.add(key);
        i++;
      }
    }
  }

  /**
   * Sort results by score and relevance
   */
  private sortResults(sources: Array<{
    title: string;
    url: string;
    description: string;
    relevanceScore: number;
    date?: string;
    content: string;
    score: number;
    relevance: number;
    metadata: {
      date?: string;
      wordCount?: number;
      readingTime?: number;
    };
    validations: {
      link?: LinkValidationResult;
      web?: WebValidationResult;
      content?: ContentValidationResult;
    };
  }>): void {
    sources.sort((a, b) => {
      const scoreA = (a.score + a.relevance) / 2;
      const scoreB = (b.score + b.relevance) / 2;
      return scoreB - scoreA;
    });
  }

  /**
   * Generate citations from sources
   */
  private generateCitations(sources: Array<{
    title: string;
    url: string;
    description: string;
    relevanceScore: number;
    date?: string;
    content: string;
    score: number;
    relevance: number;
    metadata: {
      date?: string;
      wordCount?: number;
      readingTime?: number;
    };
    validations: ValidationResults;
  }>): Array<{
    url: string;
    title: string;
    description: string;
    date: string;
    relevanceScore: number;
  }> {
    return sources.map(source => ({
      url: source.url,
      title: source.title,
      description: source.description || '',
      date: source.metadata.date || new Date().toISOString(),
      relevanceScore: source.relevanceScore || 0
    }));
  }

  /**
   * Calculate overall pipeline score
   */
  private calculateOverallScore(result: PipelineResult): number {
    if (result.sources.length === 0) return 0;

    const weights = {
      sourceCount: 0.2,
      averageScore: 0.4,
      averageRelevance: 0.4
    };

    const sourceCountScore = Math.min(result.sources.length / result.metadata.totalSources, 1);
    const averageScore = result.sources.reduce((sum, source) => sum + source.score, 0) / result.sources.length;
    const averageRelevance = result.sources.reduce((sum, source) => sum + source.relevance, 0) / result.sources.length;

    return (
      sourceCountScore * weights.sourceCount +
      averageScore * weights.averageScore +
      averageRelevance * weights.averageRelevance
    );
  }

  /**
   * Generate cache key
   */
  private getCacheKey(query: string, urls: string[], options: Required<PipelineOptions>): string {
    return `${query}|${urls.sort().join(',')}|${JSON.stringify(options)}`;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Format the response with proper structure and citations
   */
  public formatLatestInfoResponse(result: PipelineResult): LatestInfoResponse {
    const query = result.metadata.query || '';
    const formattedDomain = query.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    let content = `Here's the latest information about ${formattedDomain}:\n\n`;

    // Add sections with emojis and citations
    if (result.sources.length > 0) {
      content += "🔑 Key Findings:\n";
      result.sources.slice(0, 3).forEach((source, index) => {
        content += `• ${source.title} [${index + 1}]\n`;
      });
      content += "\n";
    }

    return {
      content,
      groundingMetadata: {
        webSearchSources: result.sources.map(source => ({
          title: source.title,
          url: source.url,
          snippet: source.description,
          date: source.metadata.date,
          relevanceScore: source.relevance
        }))
      }
    };
  }

  /**
   * Format empty response
   */
  public formatEmptyResponse(
    domain: string, 
    description: string | undefined, 
    metrics: PipelineMetrics
  ): PipelineResult {
    const formattedDomain = domain.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    
    return {
      content: '',
      isValid: false,
      score: 0,
      sources: [],
      metadata: {
        totalSources: 0,
        validSources: 0,
        averageScore: 0,
        retries: 0,
        processingSteps: [],
        queryType: '',
        domain: '',
        lastInteraction: '',
        includesDate: false,
        timestamp: Date.now(),
        query: '',
        duration: 0,
        cacheHits: 0
      },
      citations: [],
      errors: [
        {
          url: '',
          phase: 'processing',
          error: `No recent information found for ${formattedDomain}. ${description || ''}`,
          code: 'NO_SOURCES_FOUND'
        }
      ],
      groundingMetadata: {
        webSearchSources: []
      }
    };
  }

  // Helper method to extract main content
  private extractMainContent(document: Document): string {
    // Try to find main content in article or main tags
    const article = document.querySelector('article');
    if (article) return article.textContent || '';

    const main = document.querySelector('main');
    if (main) return main.textContent || '';

    // Fallback to body content
    return document.body.textContent || '';
  }
}

// Export singleton instance
export const pipelineService = PipelineService.getInstance();

/**
 * Main pipeline for processing latest information requests
 */
export async function processLatestInfoPipeline(
  query: string,
  domain: string
): Promise<PipelineResult> {
  const pipelineService = PipelineService.getInstance();
  const metrics: PipelineMetrics = {
    startTime: Date.now(),
    searchTime: 0,
    linkScrapingTime: 0,
    contentScrapingTime: 0,
    processingTime: 0,
    groundingTime: 0,
    totalTime: 0,
    searchResults: 0,
    linksFound: 0,
    validLinks: 0,
    sourcesProcessed: 0,
    groundedSources: 0,
    errors: {}
  };

  try {
    // 1. Validate domain configuration
    const domainConfig = DOMAIN_CONFIG.get(domain);
    if (!domainConfig) {
      throw new DomainError(`Invalid domain: ${domain}`);
    }

    // 2. Perform Google Search with grounding
    const searchStart = Date.now();
    let searchResults;
    try {
      searchResults = await performGroundedSearch(query, domain, domainConfig.info.keywords);
      metrics.searchTime = Date.now() - searchStart;
      metrics.searchResults = searchResults.length;
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        throw new RateLimitError('Search API rate limit exceeded', 60);
      }
      throw new NetworkError(
        'Failed to perform search', 
        axios.isAxiosError(error) ? error.response?.status : undefined
      );
    }

    // 3. Get AI-generated context with grounding
    const aiContextStart = Date.now();
    let aiContext;
    try {
      aiContext = await getLatestDomainInfo(domain);
      metrics.processingTime += Date.now() - aiContextStart;
    } catch (error: unknown) {
      throw new DomainError(
        `Failed to get domain context: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // 4. Find and validate links with grounding
    const linkScrapingStart = Date.now();
    let links;
    try {
      links = await scrapeLinks(query, domain, [
        ...domainConfig.info.keywords,
        ...searchResults.map(result => result.title.toLowerCase().split(' ')).flat()
      ]);
      metrics.linkScrapingTime = Date.now() - linkScrapingStart;
      metrics.linksFound = links.length;
    } catch (error: unknown) {
      throw new ScrapingError(
        'Failed to scrape links',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    if (links.length === 0) {
      return pipelineService.formatEmptyResponse(domain, domainConfig.description, metrics);
    }

    // 5. Scrape and enrich content with search context
    const contentScrapingStart = Date.now();
    let sources;
    try {
      sources = await validateAndEnrichSources(query, domain);
      metrics.contentScrapingTime = Date.now() - contentScrapingStart;
      metrics.validLinks = sources.length;
    } catch (error: unknown) {
      throw new ScrapingError(
        'Failed to validate and enrich sources',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    if (sources.length === 0) {
      return pipelineService.formatEmptyResponse(domain, domainConfig.description, metrics);
    }

    // 6. Ground sources with search results
    const groundingStart = Date.now();
    let groundedSources;
    try {
      groundedSources = await groundSourcesWithSearch(sources, searchResults, domain, query);
      metrics.groundingTime = Date.now() - groundingStart;
      metrics.groundedSources = groundedSources.length;
    } catch (error: unknown) {
      throw new ScrapingError(
        'Failed to ground sources',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // 7. Process and structure information
    const processingStart = Date.now();
    let latestInfo;
    try {
      latestInfo = structureLatestInfo(groundedSources, aiContext, searchResults);
      metrics.processingTime += Date.now() - processingStart;
      metrics.sourcesProcessed = groundedSources.length;
    } catch (error: unknown) {
      throw new Error(
        `Failed to structure information: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // 8. Format final response with grounded sources
    const response = pipelineService.formatLatestInfoResponse(latestInfo);

    // 9. Calculate final metrics
    metrics.totalTime = Date.now() - metrics.startTime;

    // Convert ScrapedSource to Source with required fields
    const processedSources = groundedSources.map(source => ({
      url: source.url,
      title: source.title,
      description: source.description || '',
      content: source.content || '',
      score: source.relevanceScore || 0,
      relevance: source.relevanceScore || 0,
      relevanceScore: source.relevanceScore || 0,
      date: source.date || new Date().toISOString(),
      lastScraped: new Date().toISOString(),
      validations: {
        link: undefined,
        web: undefined,
        content: undefined
      },
      metadata: {
        date: source.date || new Date().toISOString(),
        wordCount: source.content?.split(/\s+/).length || 0,
        readingTime: Math.ceil((source.content?.split(/\s+/).length || 0) / 200)
      }
    }));

    // Format citations with required fields
    const citations = processedSources.map(source => ({
      url: source.url,
      title: source.title,
      description: source.description || '',
      date: source.metadata.date || new Date().toISOString(),
      relevanceScore: source.relevance || 0
    }));

    return {
      isValid: true,
      score: metrics.totalTime,
      sources: processedSources,
      metadata: {
        query,
        timestamp: Date.now(),
        duration: metrics.totalTime,
        totalSources: processedSources.length,
        validSources: processedSources.length,
        averageScore: metrics.totalTime,
        cacheHits: 0,
        retries: 0,
        processingSteps: [],
        queryType: '',
        domain: '',
        lastInteraction: '',
        includesDate: false
      },
      citations,
      errors: [],
      content: response.content,
      groundingMetadata: response.groundingMetadata
    };

  } catch (error) {
    console.error('Pipeline error:', error);
    metrics.totalTime = Date.now() - metrics.startTime;

    // Convert unknown error to Error type
    const typedError = error instanceof Error ? error : new Error('Unknown error occurred');

    // Handle error with proper context
    const errorResponse = errorHandler.handleError(typedError, {
      source: 'pipeline',
      context: {
        domain,
        query,
        metrics
      }
    });
    
    return {
      isValid: false,
      score: 0,
      sources: [],
      metadata: {
        query,
        timestamp: Date.now(),
        duration: metrics.totalTime,
        totalSources: 0,
        validSources: 0,
        averageScore: 0,
        cacheHits: 0,
        retries: 0,
        processingSteps: [],
        queryType: '',
        domain: '',
        lastInteraction: '',
        includesDate: false
      },
      citations: [],
      errors: [
        {
          url: '',
          phase: 'processing',
          error: errorResponse.error.message,
          code: 'PROCESSING_ERROR'
        }
      ],
      content: errorHandler.createUserMessage(typedError),
      groundingMetadata: {
        webSearchSources: []
      }
    };
  }
}

/**
 * Perform grounded search using Google Search
 */
async function performGroundedSearch(
  query: string,
  domain: string,
  keywords: string[]
): Promise<Array<{ title: string; url: string; snippet: string; }>> {
  const searchPrompt = `Find the latest verified information about ${domain} focusing on:
1. Recent developments and updates
2. Current trends and innovations
3. Best practices and standards
4. Official documentation and reliable sources

Keywords: ${keywords.join(', ')}
Query: ${query}

Return results in this format:
URL: [url]
Title: [title]
Snippet: [brief description]

IMPORTANT:
- Only include results from the last 6 months
- Prioritize official documentation and verified sources
- Focus on technical and educational content
- Exclude social media and unreliable sources`;

  try {
    const model = await getSearchModel();
    const result = await model.generateContent(searchPrompt);
    const text = result?.response?.text() || '';
    
    return parseSearchResults(text);
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Ground sources using search results
 */
async function groundSourcesWithSearch(
  sources: ScrapedSource[],
  searchResults: Array<{ title: string; url: string; snippet: string; }>,
  domain: string,
  query: string
): Promise<ScrapedSource[]> {
  const groundedSources: ScrapedSource[] = [];

  for (const source of sources) {
    try {
      // Check if source matches any search result
      const matchingResult = searchResults.find(result => 
        result.url === source.url || 
        calculateSimilarity(result.title, source.title) > 0.8
      );

      // Create grounding prompt with search context
      const prompt = `Verify and rate the relevance of this source for ${domain} and "${query}":
Title: ${source.title}
URL: ${source.url}
Content: ${source.content.substring(0, 500)}...
${matchingResult ? `Search Match: ${matchingResult.title}` : ''}

Rate from 0-1 based on:
1. Source authority and credibility (0.3)
2. Content relevance to query (0.3)
3. Information recency (0.2)
4. Technical depth (0.1)
5. Domain expertise (0.1)

Return ONLY a number between 0 and 1.`;

      const model = await getSearchModel();
      const result = await model.generateContent(prompt);
      const relevanceScore = parseFloat(result?.response?.text() || '0');

      // Include sources with high relevance or matching search results
      if (!isNaN(relevanceScore) && (relevanceScore >= 0.7 || matchingResult)) {
        groundedSources.push({
          ...source,
          relevanceScore: matchingResult ? Math.max(relevanceScore, 0.8) : relevanceScore
        });
      }
    } catch (error) {
      console.warn(`Failed to ground source: ${source.url}`, error);
    }
  }

  // Sort by relevance score
  return groundedSources.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
}

/**
 * Structure the scraped information with AI context
 */
function structureLatestInfo(sources: ScrapedSource[], aiContext: string, searchResults: Array<{ title: string; url: string; snippet: string; }>): PipelineResult {
  const processedSources = sources.map(source => ({
    title: source.title,
    url: source.url,
    description: source.description || '',
    content: source.content || '',
    score: source.relevanceScore || 0,
    relevance: source.relevanceScore || 0,
    relevanceScore: source.relevanceScore || 0,
    metadata: {
      date: source.date || new Date().toISOString(),
      wordCount: source.content?.split(/\s+/).length || 0,
      readingTime: Math.ceil((source.content?.split(/\s+/).length || 0) / 200)
    },
    validations: {
      link: undefined,
      web: undefined,
      content: undefined
    }
  }));

  return {
    content: 'Latest information',
    isValid: true,
    score: 1,
    sources: processedSources,
    metadata: {
      totalSources: sources.length,
      validSources: sources.length,
      averageScore: sources.reduce((acc, src) => acc + (src.relevanceScore || 0), 0) / sources.length,
      retries: 0,
      processingSteps: [],
      queryType: '',
      domain: '',
      lastInteraction: new Date().toISOString(),
      includesDate: true,
      timestamp: Date.now(),
      query: '',
      duration: 0,
      cacheHits: 0
    },
    citations: processedSources.map(source => ({
      url: source.url,
      title: source.title,
      description: source.description,
      date: source.metadata.date || new Date().toISOString(),
      relevanceScore: source.relevanceScore || 0
    })),
    errors: [],
    groundingMetadata: {
      webSearchSources: searchResults
    }
  };
}

/**
 * Parse search results from text
 */
function parseSearchResults(text: string): Array<{ title: string; url: string; snippet: string; }> {
  const results: Array<{ title: string; url: string; snippet: string; }> = [];
  const lines = text.split('\n');
  let current: { title?: string; url?: string; snippet?: string; } = {};

  for (const line of lines) {
    if (line.startsWith('URL:')) {
      if (current.url) {
        if (current.title && current.url && current.snippet) {
          results.push({
            title: current.title,
            url: current.url,
            snippet: current.snippet
          });
        }
        current = {};
      }
      current.url = line.replace('URL:', '').trim();
    } else if (line.startsWith('Title:')) {
      current.title = line.replace('Title:', '').trim();
    } else if (line.startsWith('Snippet:')) {
      current.snippet = line.replace('Snippet:', '').trim();
    }
  }

  if (current.title && current.url && current.snippet) {
    results.push({
      title: current.title,
      url: current.url,
      snippet: current.snippet
    });
  }

  return results;
} 