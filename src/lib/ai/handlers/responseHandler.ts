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
    this.errorHandler = new ErrorHandler();
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
          return this.createChatResponse(cached.response, result, {
            ...fullOptions,
            cacheHit: true
          });
        }
      }

      // Update progress
      fullOptions.progressCallback(0.1, 'Formatting response');

      // Format content with citations
      let content = '';
      if (result.sources.length > 0 && fullOptions.includeCitations) {
        content = citationService.formatSourcesWithCitations(result.sources, {
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
        processingSteps: result.metadata.processingSteps || []
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
      const errorResponse = this.errorHandler.handleError(error, {
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
    return {
      content,
      groundingMetadata: {
        webSearchSources: result.sources.map(source => ({
          title: source.title,
          url: source.url,
          snippet: source.description,
          score: source.score,
          relevanceScore: source.relevance,
          date: source.metadata.date
        }))
      },
      isAI: true
    };
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
      content: `Error: ${errorResponse.error.message}\n\n` +
        `Type: ${errorResponse.error.type}\n` +
        `Severity: ${errorResponse.error.severity}\n` +
        (errorResponse.error.code ? `Code: ${errorResponse.error.code}\n` : '') +
        (errorResponse.error.details ? `Details: ${JSON.stringify(errorResponse.error.details, null, 2)}` : ''),
      groundingMetadata: null,
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