import { pipelineService } from '../pipelineService';
import { linkValidator } from '../../../utils/linkValidator';
import { webValidator } from '../../../utils/webValidator';
import { contentValidator } from '../../../utils/contentValidator';
import { calculateSimilarity } from '../../../utils/similarity';
import type { PipelineOptions, Source } from '@/types/pipeline';

jest.mock('../../../utils/linkValidator', () => ({
  linkValidator: {
    validateLink: jest.fn()
  }
}));

jest.mock('../../../utils/webValidator', () => ({
  webValidator: {
    validateWeb: jest.fn()
  }
}));

jest.mock('../../../utils/contentValidator', () => ({
  contentValidator: {
    validateContent: jest.fn()
  }
}));

jest.mock('../../../utils/similarity', () => ({
  calculateSimilarity: jest.fn()
}));

describe('PipelineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pipelineService.clearCache();
  });

  describe('process', () => {
    const mockUrls = ['https://example1.com', 'https://example2.com'];
    const mockQuery = 'test query';
    const mockOptions: Partial<PipelineOptions> = {
      maxConcurrentRequests: 2,
      cacheResults: true
    };

    const mockValidSource: Source = {
      url: 'https://example1.com',
      title: 'Example Title',
      description: 'Example Description',
      content: 'Example Content',
      score: 0.8,
      relevance: 0.9,
      validations: {},
      metadata: {
        author: 'Test Author',
        date: new Date().toISOString(),
        language: 'en',
        wordCount: 100,
        readingTime: 1
      }
    };

    beforeEach(() => {
      (linkValidator.validateLink as jest.Mock).mockResolvedValue({
        isValid: true,
        score: 0.8
      });

      (webValidator.validateWeb as jest.Mock).mockResolvedValue({
        isValid: true,
        score: 0.9,
        metadata: {
          title: 'Example Title',
          description: 'Example Description',
          author: 'Test Author',
          language: 'en',
          headers: {
            'last-modified': new Date().toISOString()
          }
        }
      });

      (contentValidator.validateContent as jest.Mock).mockReturnValue({
        isValid: true,
        score: 0.7,
        metadata: {
          wordCount: 100,
          readingTime: 1
        }
      });

      (calculateSimilarity as jest.Mock).mockReturnValue(0.9);
    });

    it('should process URLs and return valid results', async () => {
      const result = await pipelineService.process(mockQuery, mockUrls, mockOptions);

      expect(result.isValid).toBe(true);
      expect(result.sources).toHaveLength(2);
      expect(result.metadata.validSources).toBe(2);
      expect(result.citations).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should use cache when available', async () => {
      const firstResult = await pipelineService.process(mockQuery, mockUrls, mockOptions);
      const secondResult = await pipelineService.process(mockQuery, mockUrls, mockOptions);

      expect(secondResult.metadata.cacheHits).toBe(1);
      expect(linkValidator.validateLink).toHaveBeenCalledTimes(2); // Only from first call
    });

    it('should handle validation failures', async () => {
      (linkValidator.validateLink as jest.Mock).mockResolvedValueOnce({
        isValid: false,
        score: 0
      });

      const result = await pipelineService.process(mockQuery, mockUrls, mockOptions);

      expect(result.sources).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].phase).toBe('link');
    });

    it('should respect maxConcurrentRequests option', async () => {
      const manyUrls = Array(5).fill('https://example.com');
      const options = { ...mockOptions, maxConcurrentRequests: 2 };

      await pipelineService.process(mockQuery, manyUrls, options);

      // Check that validateLink was called in batches
      const calls = (linkValidator.validateLink as jest.Mock).mock.calls;
      const timestamps = calls.map(call => call[3]?.timestamp);
      const uniqueTimestamps = new Set(timestamps).size;
      
      expect(uniqueTimestamps).toBeGreaterThan(1); // Should have multiple batch timestamps
    });

    it('should filter out low relevance sources', async () => {
      (calculateSimilarity as jest.Mock).mockReturnValueOnce(0.9).mockReturnValueOnce(0.3);

      const result = await pipelineService.process(mockQuery, mockUrls, {
        ...mockOptions,
        similarityThreshold: 0.6
      });

      expect(result.sources).toHaveLength(1);
      expect(result.errors.some(e => e.code === 'LOW_RELEVANCE')).toBe(true);
    });

    it('should handle processing errors gracefully', async () => {
      (linkValidator.validateLink as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await pipelineService.process(mockQuery, mockUrls, mockOptions);

      expect(result.sources).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('PROCESSING_ERROR');
    });

    it('should retry failed operations', async () => {
      (linkValidator.validateLink as jest.Mock)
        .mockRejectedValueOnce(new Error('Temporary error'))
        .mockResolvedValueOnce({
          isValid: true,
          score: 0.8
        });

      const result = await pipelineService.process(mockQuery, [mockUrls[0]], {
        ...mockOptions,
        retryCount: 2
      });

      expect(result.sources).toHaveLength(1);
      expect(result.metadata.retries).toBe(1);
    });

    it('should calculate overall score correctly', async () => {
      const result = await pipelineService.process(mockQuery, mockUrls, mockOptions);

      expect(result.score).toBeGreaterThan(0);
      expect(result.metadata.averageScore).toBeGreaterThan(0);
    });

    it('should format citations correctly', async () => {
      const result = await pipelineService.process(mockQuery, mockUrls, mockOptions);

      expect(result.citations[0]).toEqual({
        url: mockValidSource.url,
        title: mockValidSource.title,
        description: mockValidSource.description,
        date: expect.any(String),
        relevanceScore: mockValidSource.relevance
      });
    });

    it('should handle empty URL list', async () => {
      const result = await pipelineService.process(mockQuery, [], mockOptions);

      expect(result.isValid).toBe(true);
      expect(result.sources).toHaveLength(0);
      expect(result.score).toBe(0);
    });

    it('should remove duplicate sources', async () => {
      const duplicateUrls = [mockUrls[0], mockUrls[0]];
      const result = await pipelineService.process(mockQuery, duplicateUrls, {
        ...mockOptions,
        filterDuplicates: true
      });

      expect(result.sources).toHaveLength(1);
    });

    it('should sort results by score', async () => {
      (calculateSimilarity as jest.Mock)
        .mockReturnValueOnce(0.7)
        .mockReturnValueOnce(0.9);

      const result = await pipelineService.process(mockQuery, mockUrls, {
        ...mockOptions,
        sortResults: true
      });

      expect(result.sources[0].relevance).toBeGreaterThan(result.sources[1].relevance);
    });

    it('should respect maxResults option', async () => {
      const manyUrls = Array(5).fill('https://example.com');
      const result = await pipelineService.process(mockQuery, manyUrls, {
        ...mockOptions,
        maxResults: 3
      });

      expect(result.sources).toHaveLength(3);
    });
  });
}); 