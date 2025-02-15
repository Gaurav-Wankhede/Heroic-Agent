import { processLatestInfoPipeline } from '../latestInfoPipeline';
import { DOMAIN_CONFIG } from '../../../config/domains';
import { getLatestDomainInfo } from '../../../handlers/response';
import { scrapeLinks } from '../../linkScraper';
import { validateAndEnrichSources } from '../../webScraper';
import { searchService } from '../searchService';
import { groundingService } from '../groundingService';
import { latestInfoService } from '../latestInfoService';
import { DomainError, RateLimitError, NetworkError, ScrapingError } from '../../../utils/errorHandler';

jest.mock('../../../config/domains', () => ({
  DOMAIN_CONFIG: new Map([
    ['test-domain', {
      info: {
        keywords: ['test', 'example']
      },
      description: 'Test domain description'
    }]
  ])
}));

jest.mock('../../../handlers/response', () => ({
  getLatestDomainInfo: jest.fn()
}));

jest.mock('../../linkScraper', () => ({
  scrapeLinks: jest.fn()
}));

jest.mock('../../webScraper', () => ({
  validateAndEnrichSources: jest.fn()
}));

jest.mock('../searchService', () => ({
  searchService: {
    performGroundedSearch: jest.fn()
  }
}));

jest.mock('../groundingService', () => ({
  groundingService: {
    groundSourcesWithSearch: jest.fn()
  }
}));

jest.mock('../latestInfoService', () => ({
  latestInfoService: {
    structureLatestInfo: jest.fn(),
    formatLatestInfoResponse: jest.fn(),
    formatEmptyResponse: jest.fn()
  }
}));

describe('processLatestInfoPipeline', () => {
  const mockQuery = 'test query';
  const mockDomain = 'test-domain';

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default successful responses
    (searchService.performGroundedSearch as jest.Mock).mockResolvedValue([
      { title: 'Result 1', url: 'https://example1.com', snippet: 'Snippet 1' }
    ]);

    (getLatestDomainInfo as jest.Mock).mockResolvedValue('AI Context');

    (scrapeLinks as jest.Mock).mockResolvedValue([
      'https://example1.com',
      'https://example2.com'
    ]);

    (validateAndEnrichSources as jest.Mock).mockResolvedValue([
      {
        url: 'https://example1.com',
        title: 'Example 1',
        description: 'Description 1',
        content: 'Content 1'
      }
    ]);

    (groundingService.groundSourcesWithSearch as jest.Mock).mockResolvedValue([
      {
        url: 'https://example1.com',
        title: 'Example 1',
        description: 'Description 1',
        content: 'Content 1',
        relevanceScore: 0.8
      }
    ]);

    (latestInfoService.structureLatestInfo as jest.Mock).mockReturnValue({
      keyDevelopments: ['Development 1'],
      trendingTopics: ['Topic 1'],
      bestPractices: ['Practice 1'],
      resources: [{ title: 'Resource 1', url: 'https://example1.com', description: 'Description 1' }],
      lastUpdated: new Date().toISOString()
    });

    (latestInfoService.formatLatestInfoResponse as jest.Mock).mockReturnValue({
      content: 'Formatted content',
      groundingMetadata: {
        webSearchSources: [
          { title: 'Source 1', url: 'https://example1.com', snippet: 'Snippet 1' }
        ]
      }
    });
  });

  it('should process pipeline successfully', async () => {
    const result = await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(result.isValid).toBe(true);
    expect(result.sources).toHaveLength(1);
    expect(result.content).toBe('Formatted content');
    expect(result.errors).toHaveLength(0);
  });

  it('should handle invalid domain', async () => {
    const result = await processLatestInfoPipeline(mockQuery, 'invalid-domain');

    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('PROCESSING_ERROR');
    expect(result.errors[0].error).toContain('Invalid domain');
  });

  it('should handle search API rate limit', async () => {
    (searchService.performGroundedSearch as jest.Mock).mockRejectedValue(
      new RateLimitError('Rate limit exceeded', 60)
    );

    const result = await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('PROCESSING_ERROR');
    expect(result.errors[0].error).toContain('Rate limit exceeded');
  });

  it('should handle network errors', async () => {
    (searchService.performGroundedSearch as jest.Mock).mockRejectedValue(
      new NetworkError('Network error', 500)
    );

    const result = await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('PROCESSING_ERROR');
    expect(result.errors[0].error).toContain('Network error');
  });

  it('should handle empty search results', async () => {
    (searchService.performGroundedSearch as jest.Mock).mockResolvedValue([]);
    (scrapeLinks as jest.Mock).mockResolvedValue([]);

    const result = await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(result.isValid).toBe(false);
    expect(result.sources).toHaveLength(0);
    expect(latestInfoService.formatEmptyResponse).toHaveBeenCalled();
  });

  it('should handle scraping errors', async () => {
    (scrapeLinks as jest.Mock).mockRejectedValue(
      new ScrapingError('Failed to scrape', 'Error details')
    );

    const result = await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('PROCESSING_ERROR');
    expect(result.errors[0].error).toContain('Failed to scrape');
  });

  it('should handle empty sources after validation', async () => {
    (validateAndEnrichSources as jest.Mock).mockResolvedValue([]);

    const result = await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(result.isValid).toBe(false);
    expect(result.sources).toHaveLength(0);
    expect(latestInfoService.formatEmptyResponse).toHaveBeenCalled();
  });

  it('should handle grounding errors', async () => {
    (groundingService.groundSourcesWithSearch as jest.Mock).mockRejectedValue(
      new Error('Grounding failed')
    );

    const result = await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('PROCESSING_ERROR');
    expect(result.errors[0].error).toContain('Failed to ground sources');
  });

  it('should track metrics correctly', async () => {
    const result = await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(result.metadata.duration).toBeGreaterThan(0);
    expect(result.metadata.totalSources).toBe(1);
    expect(result.metadata.validSources).toBe(1);
  });

  it('should format citations correctly', async () => {
    const result = await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toEqual({
      url: 'https://example1.com',
      title: 'Example 1',
      description: 'Description 1',
      date: expect.any(String),
      relevanceScore: 0.8
    });
  });

  it('should handle AI context errors', async () => {
    (getLatestDomainInfo as jest.Mock).mockRejectedValue(
      new Error('Failed to get AI context')
    );

    const result = await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(result.isValid).toBe(false);
    expect(result.errors[0].code).toBe('PROCESSING_ERROR');
    expect(result.errors[0].error).toContain('Failed to get domain context');
  });

  it('should include domain description in empty response', async () => {
    (searchService.performGroundedSearch as jest.Mock).mockResolvedValue([]);
    (scrapeLinks as jest.Mock).mockResolvedValue([]);

    await processLatestInfoPipeline(mockQuery, mockDomain);

    expect(latestInfoService.formatEmptyResponse).toHaveBeenCalledWith(
      mockDomain,
      'Test domain description',
      expect.any(Object)
    );
  });
}); 