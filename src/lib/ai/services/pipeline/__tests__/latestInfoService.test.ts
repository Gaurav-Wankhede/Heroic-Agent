import { latestInfoService } from '../latestInfoService';

describe('LatestInfoService', () => {
  describe('structureLatestInfo', () => {
    const mockSources = [
      {
        url: 'https://example1.com',
        title: 'Example Title 1',
        description: 'Description 1',
        content: 'First paragraph about key development.\n\nTrending topic is emerging.\nBest practice is recommended.',
        relevanceScore: 0.8
      },
      {
        url: 'https://example2.com',
        title: 'Example Title 2',
        description: 'Description 2',
        content: 'Another key development.\n\nPopular trend is rising.\nIt is important to follow guidelines.',
        relevanceScore: 0.9
      }
    ];

    const mockSearchResults = [
      {
        url: 'https://example1.com',
        title: 'Example Title 1',
        snippet: 'Snippet 1'
      }
    ];

    const mockAiContext = `Key Developments:
• Development 1
• Development 2

Trending Topics:
• Topic 1
• Topic 2

Best Practices:
• Practice 1
• Practice 2`;

    it('should structure information correctly', () => {
      const result = latestInfoService.structureLatestInfo(
        mockSources,
        mockAiContext,
        mockSearchResults
      );

      expect(result.keyDevelopments).toBeDefined();
      expect(result.trendingTopics).toBeDefined();
      expect(result.bestPractices).toBeDefined();
      expect(result.resources).toBeDefined();
      expect(result.lastUpdated).toBeDefined();

      expect(result.keyDevelopments.length).toBeGreaterThan(0);
      expect(result.trendingTopics.length).toBeGreaterThan(0);
      expect(result.bestPractices.length).toBeGreaterThan(0);
      expect(result.resources.length).toBeGreaterThan(0);
    });

    it('should extract bullet points correctly', () => {
      const result = latestInfoService.structureLatestInfo(
        [],
        mockAiContext,
        []
      );

      expect(result.keyDevelopments).toContain('Development 1');
      expect(result.trendingTopics).toContain('Topic 1');
      expect(result.bestPractices).toContain('Practice 1');
    });

    it('should handle empty sources', () => {
      const result = latestInfoService.structureLatestInfo(
        [],
        '',
        []
      );

      expect(result.keyDevelopments).toHaveLength(0);
      expect(result.trendingTopics).toHaveLength(0);
      expect(result.bestPractices).toHaveLength(0);
      expect(result.resources).toHaveLength(0);
    });

    it('should handle empty AI context', () => {
      const result = latestInfoService.structureLatestInfo(
        mockSources,
        '',
        mockSearchResults
      );

      expect(result.keyDevelopments.length).toBeGreaterThan(0);
      expect(result.resources.length).toBeGreaterThan(0);
    });
  });

  describe('formatLatestInfoResponse', () => {
    const mockLatestInfo = {
      keyDevelopments: ['Development 1', 'Development 2'],
      trendingTopics: ['Topic 1', 'Topic 2'],
      bestPractices: ['Practice 1', 'Practice 2'],
      resources: [
        {
          title: 'Resource 1',
          url: 'https://example1.com',
          description: 'Description 1'
        },
        {
          title: 'Resource 2',
          url: 'https://example2.com',
          description: 'Description 2'
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    it('should format response with all sections', () => {
      const result = latestInfoService.formatLatestInfoResponse(
        mockLatestInfo,
        'test-domain',
        'Domain description'
      );

      expect(result.content).toContain('Key Developments');
      expect(result.content).toContain('Trending Topics');
      expect(result.content).toContain('Current Best Practices');
      expect(result.content).toContain('Recommended Resources');
      expect(result.content).toContain('Development 1');
      expect(result.content).toContain('Topic 1');
      expect(result.content).toContain('Practice 1');
      expect(result.content).toContain('Resource 1');
    });

    it('should format domain name correctly', () => {
      const result = latestInfoService.formatLatestInfoResponse(
        mockLatestInfo,
        'test-domain-name',
        'Description'
      );

      expect(result.content).toContain('Test Domain Name');
    });

    it('should include domain description when provided', () => {
      const description = 'Test domain description';
      const result = latestInfoService.formatLatestInfoResponse(
        mockLatestInfo,
        'test-domain',
        description
      );

      expect(result.content).toContain(description);
    });

    it('should handle empty sections', () => {
      const emptyInfo = {
        keyDevelopments: [],
        trendingTopics: [],
        bestPractices: [],
        resources: [],
        lastUpdated: new Date().toISOString()
      };

      const result = latestInfoService.formatLatestInfoResponse(
        emptyInfo,
        'test-domain'
      );

      expect(result.content).not.toContain('Key Developments');
      expect(result.content).not.toContain('Trending Topics');
      expect(result.content).not.toContain('Current Best Practices');
      expect(result.content).not.toContain('Recommended Resources');
    });

    it('should format web search sources correctly', () => {
      const result = latestInfoService.formatLatestInfoResponse(
        mockLatestInfo,
        'test-domain'
      );

      expect(result.groundingMetadata.webSearchSources).toHaveLength(mockLatestInfo.resources.length);
      expect(result.groundingMetadata.webSearchSources[0]).toEqual({
        title: mockLatestInfo.resources[0].title,
        url: mockLatestInfo.resources[0].url,
        snippet: mockLatestInfo.resources[0].description
      });
    });
  });

  describe('formatEmptyResponse', () => {
    const mockMetrics = {
      startTime: Date.now(),
      searchTime: 100,
      linkScrapingTime: 200,
      contentScrapingTime: 300,
      processingTime: 400,
      groundingTime: 500,
      totalTime: 1500,
      searchResults: 0,
      linksFound: 0,
      validLinks: 0,
      sourcesProcessed: 0,
      groundedSources: 0,
      errors: {}
    };

    it('should format empty response correctly', () => {
      const result = latestInfoService.formatEmptyResponse(
        'test-domain',
        'Domain description',
        mockMetrics
      );

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.sources).toHaveLength(0);
      expect(result.citations).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('NO_SOURCES_FOUND');
    });

    it('should format domain name in error message', () => {
      const result = latestInfoService.formatEmptyResponse(
        'test-domain-name',
        'Description',
        mockMetrics
      );

      expect(result.errors[0].error).toContain('Test Domain Name');
    });

    it('should include description in error message when provided', () => {
      const description = 'Test description';
      const result = latestInfoService.formatEmptyResponse(
        'test-domain',
        description,
        mockMetrics
      );

      expect(result.errors[0].error).toContain(description);
    });

    it('should handle missing description', () => {
      const result = latestInfoService.formatEmptyResponse(
        'test-domain',
        undefined,
        mockMetrics
      );

      expect(result.errors[0].error).not.toContain('undefined');
    });
  });
}); 