import { scrapeLinks } from '../linkScraper';
import { validateAndEnrichSources, type ScrapedSource } from '../webScraper';
import { DomainLatestInfo } from '../../types/domain';
import { LatestInfoResponse } from '../../types/latestInfo';
import { DOMAIN_CONFIG } from '../../config/domains';
import { getLatestDomainInfo } from '../../handlers/response';
import axios from 'axios';
import { 
  errorHandler, 
  DomainError, 
  ScrapingError, 
  NetworkError, 
  RateLimitError,
  ValidationError
} from '../../utils/errorHandler';
import { linkValidator } from '../../utils/linkValidator';
import { webValidator } from '../../utils/webValidator';
import { contentValidator } from '../../utils/contentValidator';
import { calculateSimilarity } from '@/lib/ai/utils/similarity';
import { type CitationSource } from '@/components/chat/Citation';
import { JSDOM } from 'jsdom';
import {
  type PipelineMetrics,
  type PipelineResult,
  type PipelineOptions,
  type Source,
  type PipelineMetadata,
  type PipelineError
} from '@/types/pipeline';
import { searchService } from './searchService';
import { groundingService } from './groundingService';
import { latestInfoService } from './latestInfoService';

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
      
      // Initialize result
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
          processingSteps: []
        },
        citations: [],
        errors: [],
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
          result.metadata.cacheHits++;
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
              result.sources.push(source);
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
      const response = latestInfoService.formatLatestInfoResponse(
        latestInfoService.structureLatestInfo(
          result.sources.map(source => ({
            url: source.url,
            title: source.title,
            description: source.description,
            content: source.content,
            relevanceScore: source.relevance,
            lastScraped: Date.now(),
            date: source.metadata.date || new Date().toISOString()
          })),
          '',
          result.groundingMetadata?.webSearchSources.map(source => ({
            title: source.title,
            url: source.url,
            snippet: source.snippet || source.title
          })) || []
        ),
        query
      );

      return {
        isValid: true,
        score: result.score,
        sources: result.sources,
        metadata: result.metadata,
        citations: result.citations,
        errors: result.errors,
        content: response.content,
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
          date: webResult.metadata.headers?.['last-modified'],
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
  private removeDuplicates(sources: Source[]): void {
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
  private sortResults(sources: Source[]): void {
    sources.sort((a, b) => {
      const scoreA = (a.score + a.relevance) / 2;
      const scoreB = (b.score + b.relevance) / 2;
      return scoreB - scoreA;
    });
  }

  /**
   * Generate citations from sources
   */
  private generateCitations(sources: Source[]): CitationSource[] {
    return sources.map(source => ({
      url: source.url,
      title: source.title,
      description: source.description,
      date: source.metadata.date || new Date().toISOString(),
      relevanceScore: source.relevance
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
}

export const pipelineService = PipelineService.getInstance(); 