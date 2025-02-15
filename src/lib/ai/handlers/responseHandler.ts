import { ChatResponse } from '@/types/chat';
import { CacheEntry } from '../types/chat';
import { ErrorResponse, ErrorHandler } from '../utils/errorHandler';
import { PipelineResult } from '../services/pipeline';
import { messageCache } from '../services/cache';
import { CACHE_TTL } from '../config/constants';
import { citationService, CitationStyle } from '../services/citationService';

/**
 * Interface for response metadata containing information about the response generation process.
 * 
 * @interface ResponseMetadata
 * @property {number} timestamp - Unix timestamp when the response was generated
 * @property {number} duration - Time taken to generate the response in milliseconds
 * @property {boolean} cacheHit - Whether the response was served from cache
 * @property {number} retries - Number of retries performed during generation
 * @property {number} sources - Total number of sources processed
 * @property {number} validSources - Number of valid sources after validation
 * @property {number} averageScore - Average relevance score of valid sources
 * @property {string[]} processingSteps - List of steps taken during processing
 */
export interface ResponseMetadata {
  timestamp: number;
  duration: number;
  cacheHit: boolean;
  retries: number;
  sources: number;
  validSources: number;
  averageScore: number;
  processingSteps: string[];
  queryType: string;
  domain: string;
  lastInteraction: string;
  includesDate: boolean;
}

/**
 * Interface for response formatting options.
 * 
 * @interface ResponseOptions
 * @property {boolean} [cacheResults] - Whether to cache the formatted response
 * @property {boolean} [includeMetadata] - Whether to include metadata in the response
 * @property {boolean} [formatMarkdown] - Whether to format the response as markdown
 * @property {boolean} [includeCitations] - Whether to include citations in the response
 * @property {number} [maxCitations] - Maximum number of citations to include
 * @property {CitationStyle} [citationStyle] - Style to use for citations
 * @property {(progress: number, step: string) => void} [progressCallback] - Callback for progress updates
 */
export interface ResponseOptions {
  cacheResults?: boolean;
  includeMetadata?: boolean;
  formatMarkdown?: boolean;
  includeCitations?: boolean;
  maxCitations?: number;
  citationStyle?: CitationStyle;
  progressCallback?: (progress: number, step: string) => void;
}

/**
 * Default options for response formatting.
 * 
 * @constant DEFAULT_OPTIONS
 * @type {Required<ResponseOptions>}
 */
const DEFAULT_OPTIONS: Required<ResponseOptions> = {
  cacheResults: true,
  includeMetadata: true,
  formatMarkdown: true,
  includeCitations: true,
  maxCitations: 10,
  citationStyle: 'inline',
  progressCallback: () => {}
};

/**
 * Class responsible for handling and formatting responses from the AI pipeline.
 * Implements the singleton pattern to ensure consistent state management.
 * 
 * @class ResponseHandler
 */
export class ResponseHandler {
  /** Singleton instance of the ResponseHandler */
  private static instance: ResponseHandler;
  
  /** Error handler instance for managing errors */
  private errorHandler: ErrorHandler;
  
  /** Cache map for storing formatted responses */
  private cache: Map<string, CacheEntry>;

  /**
   * Private constructor to prevent direct instantiation.
   * Use {@link ResponseHandler.getInstance} instead.
   * 
   * @private
   * @constructor
   */
  private constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.cache = messageCache;
  }

  /**
   * Gets the singleton instance of the ResponseHandler.
   * Creates a new instance if one doesn't exist.
   * 
   * @static
   * @returns {ResponseHandler} The singleton instance
   */
  public static getInstance(): ResponseHandler {
    if (!ResponseHandler.instance) {
      ResponseHandler.instance = new ResponseHandler();
    }
    return ResponseHandler.instance;
  }

  /**
   * Formats a pipeline result into a chat response.
   * Handles caching, citation formatting, and error cases.
   * 
   * @async
   * @param {PipelineResult} result - The pipeline result to format
   * @param {string} query - The original query that generated the result
   * @param {Partial<ResponseOptions>} [options] - Options for formatting
   * @returns {Promise<ChatResponse>} The formatted chat response
   * @throws {Error} If formatting fails
   */
  public async formatPipelineResult(
    result: PipelineResult,
    query: string,
    options: Partial<ResponseOptions> = {}
  ): Promise<ChatResponse> {
    const fullOptions = { ...DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();

    try {
      // Check cache first
      if (fullOptions.cacheResults) {
        const cached = this.getCachedResponse(query, result.metadata);
        if (cached) {
          const cachedMetadata: ResponseMetadata = {
            timestamp: cached.timestamp,
            duration: 0,
            cacheHit: true,
            retries: result.metadata.retries,
            sources: result.metadata.totalSources,
            validSources: result.metadata.validSources,
            averageScore: result.metadata.averageScore,
            processingSteps: result.metadata.processingSteps || [],
            queryType: result.metadata.queryType || 'General Query',
            domain: result.metadata.domain || 'general',
            lastInteraction: result.metadata.lastInteraction || new Date().toISOString(),
            includesDate: result.metadata.includesDate || false
          };
          return this.createChatResponse(cached.response, result, cachedMetadata);
        }
      }

      // Update progress
      fullOptions.progressCallback(0.1, 'Formatting response');

      // Format content with citations
      let content = '';
      if (result.sources.length > 0 && fullOptions.includeCitations) {
        const sourcesWithDefaultDate = result.sources.map(source => ({
          ...source,
          metadata: {
            ...source.metadata,
            date: source.metadata.date || new Date().toISOString()
          }
        }));
        content = citationService.formatSourcesWithCitations(sourcesWithDefaultDate, {
          maxCitations: fullOptions.maxCitations,
          style: fullOptions.citationStyle,
          includeMetadata: fullOptions.includeMetadata,
          formatMarkdown: fullOptions.formatMarkdown
        });
      } else {
        content = 'No relevant sources found for your query.';
      }

      // Update progress
      fullOptions.progressCallback(0.8, 'Processing metadata');

      // Create response metadata
      const responseMetadata: ResponseMetadata = {
        timestamp: Date.now(),
        duration: Date.now() - startTime,
        cacheHit: false,
        retries: result.metadata.retries,
        sources: result.metadata.totalSources,
        validSources: result.metadata.validSources,
        averageScore: result.metadata.averageScore,
        processingSteps: result.metadata.processingSteps || [],
        queryType: result.metadata.queryType || 'General Query',
        domain: result.metadata.domain || 'general',
        lastInteraction: result.metadata.lastInteraction || new Date().toISOString(),
        includesDate: result.metadata.includesDate || false
      };

      // Cache response if enabled
      if (fullOptions.cacheResults) {
        this.cacheResponse(query, content, responseMetadata);
      }

      // Update progress
      fullOptions.progressCallback(1, 'Complete');

      // Return formatted response
      return this.createChatResponse(content, result, responseMetadata);

    } catch (error) {
      // Handle errors
      const errorResponse = this.errorHandler.handleError(error instanceof Error ? error : new Error(String(error)), {
        context: {
          query,
          options: fullOptions
        }
      });

      return this.createErrorResponse(errorResponse);
    }
  }

  /**
   * Creates a chat response object from formatted content and metadata.
   * 
   * @private
   * @param {string} content - The formatted response content
   * @param {PipelineResult} result - The original pipeline result
   * @param {ResponseMetadata} metadata - Response metadata
   * @returns {ChatResponse} The chat response object
   */
  private createChatResponse(
    content: string,
    result: PipelineResult,
    metadata: ResponseMetadata
  ): ChatResponse {
    // Determine if this is a news/update response
    const isNewsUpdate = metadata.queryType === 'News Update';
    const isInstallation = metadata.queryType === 'Installation';

    // Format the response based on the query type
    let formattedContent = content;
    if (isNewsUpdate) {
      formattedContent = this.formatNewsResponse(content, result, metadata);
    } else if (isInstallation) {
      formattedContent = this.formatInstallationResponse(content, result, metadata);
    }

    return {
      messageId: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: formattedContent,
      groundingMetadata: {
        webSearchSources: result.sources.map(source => ({
          title: source.title,
          url: source.url,
          snippet: source.description,
          score: source.score,
          relevanceScore: source.relevance,
          date: source.metadata.date
        })),
        temporalContext: {
          currentDate: new Date().toISOString(),
          domain: metadata.domain,
          lastInteraction: metadata.lastInteraction,
          priority: this.determinePriority(metadata.queryType, content),
          categories: this.determineCategories(metadata.queryType, content),
          includesDate: metadata.includesDate || false,
          lastUpdate: result.metadata.timestamp?.toString(),
          newsCategories: this.determineNewsCategories(content),
          timeframe: this.determineTimeframe(metadata.queryType, content)
        }
      },
      isAI: true
    };
  }

  /**
   * Format news update response with enhanced structure
   */
  private formatNewsResponse(
    content: string,
    result: PipelineResult,
    metadata: ResponseMetadata
  ): string {
    const sections = [
      { emoji: '📢', title: 'Latest Updates' },
      { emoji: '🔄', title: 'Breaking Changes' },
      { emoji: '🛡️', title: 'Security Updates' },
      { emoji: '✨', title: 'New Features' },
      { emoji: '🐛', title: 'Bug Fixes' },
      { emoji: '📚', title: 'Documentation' }
    ];

    let formatted = `${metadata.domain} Updates - ${new Date().toLocaleDateString()}\n\n`;

    // Add priority indicator if high priority updates exist
    if (this.determinePriority(metadata.queryType, content) === 'HIGH') {
      formatted += '🔴 High Priority Updates Included\n\n';
    }

    // Format each section
    sections.forEach(section => {
      const sectionContent = this.extractSection(content, section.title);
      if (sectionContent) {
        formatted += `${section.emoji} ${section.title}\n${sectionContent}\n\n`;
      }
    });

    // Add relevant sources
    if (result.sources.length > 0) {
      formatted += '📌 Sources:\n';
      result.sources
        .filter(source => source.relevance > 0.7)
        .slice(0, 3)
        .forEach(source => {
          formatted += `• ${source.title} - ${source.url}\n`;
        });
    }

    return formatted;
  }

  /**
   * Format installation response with enhanced structure
   */
  private formatInstallationResponse(
    content: string,
    result: PipelineResult,
    metadata: ResponseMetadata
  ): string {
    let formatted = `${metadata.domain} Installation Guide\n\n`;

    // Add prerequisites section
    formatted += '📋 Prerequisites:\n';
    const prerequisites = this.extractSection(content, 'Prerequisites');
    formatted += prerequisites ? prerequisites + '\n\n' : 'No specific prerequisites listed.\n\n';

    // Add step-by-step installation
    formatted += '🔧 Installation Steps:\n';
    const steps = this.extractSection(content, 'Installation');
    formatted += steps ? steps + '\n\n' : 'Installation steps not available.\n\n';

    // Add configuration guidance
    formatted += '⚙️ Configuration:\n';
    const config = this.extractSection(content, 'Configuration');
    formatted += config ? config + '\n\n' : 'No configuration required.\n\n';

    // Add verification steps
    formatted += '✅ Verification:\n';
    const verification = this.extractSection(content, 'Verification');
    formatted += verification ? verification + '\n\n' : 'No verification steps provided.\n\n';

    // Add troubleshooting tips
    formatted += '🔍 Troubleshooting:\n';
    const troubleshooting = this.extractSection(content, 'Troubleshooting');
    formatted += troubleshooting ? troubleshooting + '\n\n' : 'No common issues noted.\n\n';

    // Add relevant documentation
    if (result.sources.length > 0) {
      formatted += '📚 Additional Resources:\n';
      result.sources
        .filter(source => source.relevance > 0.7)
        .slice(0, 3)
        .forEach(source => {
          formatted += `• ${source.title} - ${source.url}\n`;
        });
    }

    return formatted;
  }

  /**
   * Determine priority level based on content analysis
   */
  private determinePriority(queryType: string, content: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    const criticalPatterns = ['security vulnerability', 'critical bug', 'urgent update', 'breaking change'];
    const highPatterns = ['important update', 'major release', 'significant change'];
    const mediumPatterns = ['new feature', 'enhancement', 'improvement'];

    if (criticalPatterns.some(pattern => content.toLowerCase().includes(pattern))) {
      return 'CRITICAL';
    }
    if (highPatterns.some(pattern => content.toLowerCase().includes(pattern))) {
      return 'HIGH';
    }
    if (mediumPatterns.some(pattern => content.toLowerCase().includes(pattern))) {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Determine relevant categories based on content
   */
  private determineCategories(queryType: string, content: string): string[] {
    const categories = new Set<string>();
    
    if (content.toLowerCase().includes('security')) categories.add('security');
    if (content.toLowerCase().includes('performance')) categories.add('performance');
    if (content.toLowerCase().includes('feature')) categories.add('features');
    if (content.toLowerCase().includes('api')) categories.add('api');
    if (content.toLowerCase().includes('community')) categories.add('community');
    if (content.toLowerCase().includes('ecosystem')) categories.add('ecosystem');
    if (content.toLowerCase().includes('trend')) categories.add('trends');

    return Array.from(categories);
  }

  /**
   * Determine news categories from content
   */
  private determineNewsCategories(content: string): Array<'features' | 'security' | 'performance' | 'api' | 'community' | 'ecosystem' | 'trends'> {
    const categories: Array<'features' | 'security' | 'performance' | 'api' | 'community' | 'ecosystem' | 'trends'> = [];
    
    if (content.toLowerCase().includes('feature')) categories.push('features');
    if (content.toLowerCase().includes('security')) categories.push('security');
    if (content.toLowerCase().includes('performance')) categories.push('performance');
    if (content.toLowerCase().includes('api')) categories.push('api');
    if (content.toLowerCase().includes('community')) categories.push('community');
    if (content.toLowerCase().includes('ecosystem')) categories.push('ecosystem');
    if (content.toLowerCase().includes('trend')) categories.push('trends');

    return categories;
  }

  /**
   * Determine timeframe based on content analysis
   */
  private determineTimeframe(queryType: string, content: string): 'immediate' | 'recent' | 'weekly' | 'monthly' {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('urgent') || contentLower.includes('immediate')) {
      return 'immediate';
    }
    if (contentLower.includes('this week') || contentLower.includes('weekly')) {
      return 'weekly';
    }
    if (contentLower.includes('this month') || contentLower.includes('monthly')) {
      return 'monthly';
    }
    return 'recent';
  }

  /**
   * Extract specific section from content
   */
  private extractSection(content: string, sectionTitle: string): string {
    const sections = content.split('\n\n');
    const sectionIndex = sections.findIndex(section => 
      section.toLowerCase().includes(sectionTitle.toLowerCase())
    );
    
    if (sectionIndex === -1) return '';
    
    let sectionContent = sections[sectionIndex];
    if (sectionIndex + 1 < sections.length) {
      sectionContent += '\n' + sections[sectionIndex + 1];
    }
    
    return sectionContent.replace(new RegExp(`.*${sectionTitle}.*\n?`), '').trim();
  }

  /**
   * Creates an error response object from an error response.
   * 
   * @private
   * @param {ErrorResponse} errorResponse - The error response to format
   * @returns {ChatResponse} The formatted error response
   */
  private createErrorResponse(errorResponse: ErrorResponse): ChatResponse {
    return {
      messageId: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: `Error: ${errorResponse.error.message}\n\n` +
        `Type: ${errorResponse.error.type}\n` +
        `Severity: ${errorResponse.error.severity}\n` +
        (errorResponse.error.code ? `Code: ${errorResponse.error.code}\n` : '') +
        (errorResponse.error.details ? `Details: ${JSON.stringify(errorResponse.error.details, null, 2)}` : ''),
      groundingMetadata: undefined,
      isAI: true
    };
  }

  /**
   * Gets a cached response if available and not expired.
   * 
   * @private
   * @param {string} query - The query used to generate the response
   * @param {any} metadata - The metadata used to generate the response
   * @returns {CacheEntry | null} The cached entry or null if not found/expired
   */
  private getCachedResponse(query: string, metadata: any): CacheEntry | null {
    const cacheKey = `${query}|${JSON.stringify(metadata)}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached;
    }
    
    return null;
  }

  /**
   * Caches a response with its metadata.
   * 
   * @private
   * @param {string} query - The query that generated the response
   * @param {string} content - The response content to cache
   * @param {ResponseMetadata} metadata - The response metadata
   */
  private cacheResponse(query: string, content: string, metadata: ResponseMetadata): void {
    const cacheKey = `${query}|${JSON.stringify(metadata)}`;
    this.cache.set(cacheKey, {
      response: content,
      timestamp: metadata.timestamp,
      history: []
    });
  }

  /**
   * Clears all cached responses.
   * 
   * @public
   */
  public clearCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const responseHandler = ResponseHandler.getInstance(); 