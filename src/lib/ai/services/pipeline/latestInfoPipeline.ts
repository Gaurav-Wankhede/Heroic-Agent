import { scrapeLinks } from '../linkScraper';
import { validateAndEnrichSources } from '../webScraper';
import { DOMAIN_CONFIG } from '../../config/domains';
import { getLatestDomainInfo } from '../../handlers/response';
import axios from 'axios';
import { 
  errorHandler, 
  DomainError, 
  ScrapingError, 
  NetworkError, 
  RateLimitError
} from '../../utils/errorHandler';
import type { PipelineMetrics, PipelineResult } from '@/types/pipeline';
import { searchService } from './searchService';
import { groundingService } from './groundingService';
import { latestInfoService } from './latestInfoService';

/**
 * Main pipeline for processing latest information requests
 */
export async function processLatestInfoPipeline(
  query: string,
  domain: string
): Promise<PipelineResult> {
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
      searchResults = await searchService.performGroundedSearch(query, domain, domainConfig.info.keywords);
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
      return latestInfoService.formatEmptyResponse(domain, domainConfig.description, metrics);
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
      return latestInfoService.formatEmptyResponse(domain, domainConfig.description, metrics);
    }

    // 6. Ground sources with search results
    const groundingStart = Date.now();
    let groundedSources;
    try {
      groundedSources = await groundingService.groundSourcesWithSearch(sources, searchResults, domain, query);
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
      latestInfo = latestInfoService.structureLatestInfo(groundedSources, aiContext, searchResults);
      metrics.processingTime += Date.now() - processingStart;
      metrics.sourcesProcessed = groundedSources.length;
    } catch (error: unknown) {
      throw new Error(
        `Failed to structure information: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // 8. Format final response with grounded sources
    const response = latestInfoService.formatLatestInfoResponse(latestInfo, domain, domainConfig.description);

    // 9. Calculate final metrics
    metrics.totalTime = Date.now() - metrics.startTime;

    // Convert ScrapedSource to Source
    const processedSources = groundedSources.map(source => ({
      url: source.url,
      title: source.title,
      description: source.description || '',
      content: source.content || '',
      score: source.relevanceScore || 0,
      relevance: source.relevanceScore || 0,
      validations: {},
      metadata: {
        date: source.date,
        wordCount: source.content?.split(/\s+/).length || 0,
        readingTime: Math.ceil((source.content?.split(/\s+/).length || 0) / 200)
      }
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
        processingSteps: []
      },
      citations: processedSources.map(source => ({
        url: source.url,
        title: source.title,
        description: source.description,
        date: source.metadata.date || new Date().toISOString(),
        relevanceScore: source.relevance
      })),
      errors: [],
      content: response.content,
      groundingMetadata: response.groundingMetadata
    };

  } catch (error: unknown) {
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
        processingSteps: []
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