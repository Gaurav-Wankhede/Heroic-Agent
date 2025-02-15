import { responseHandler, ResponseOptions } from '../responseHandler';
import { PipelineResult } from '../../services/pipeline';
import { messageCache } from '../../services/cache';
import { ErrorHandler } from '../../utils/errorHandler';
import { citationService } from '../../services/citationService';

// Mock dependencies
jest.mock('../../services/cache');
jest.mock('../../utils/errorHandler');
jest.mock('../../services/citationService');

describe('ResponseHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    responseHandler.clearCache();
  });

  describe('formatPipelineResult', () => {
    const mockResult: Partial<PipelineResult> = {
      isValid: true,
      score: 0.8,
      sources: [
        {
          url: 'https://example1.com',
          title: 'Title 1',
          description: 'Description 1',
          content: 'Content 1',
          score: 0.9,
          relevance: 0.8,
          metadata: {
            date: '2024-03-14',
            author: 'Author 1',
            language: 'en',
            wordCount: 100,
            readingTime: 1
          }
        },
        {
          url: 'https://example2.com',
          title: 'Title 2',
          description: 'Description 2',
          content: 'Content 2',
          score: 0.8,
          relevance: 0.7,
          metadata: {
            date: '2024-03-14',
            author: 'Author 2',
            language: 'en',
            wordCount: 200,
            readingTime: 2
          }
        }
      ],
      metadata: {
        query: 'test query',
        timestamp: Date.now(),
        duration: 100,
        totalSources: 2,
        validSources: 2,
        averageScore: 0.85,
        cacheHits: 0,
        retries: 0,
        processingSteps: ['step1', 'step2']
      },
      citations: [],
      errors: []
    };

    beforeEach(() => {
      (citationService.formatSourcesWithCitations as jest.Mock).mockReturnValue(
        '[1] Title 1\nDescription 1\nSource: https://example1.com\n\n' +
        '[2] Title 2\nDescription 2\nSource: https://example2.com\n\n'
      );
    });

    it('should format a valid pipeline result', async () => {
      const response = await responseHandler.formatPipelineResult(
        mockResult as PipelineResult,
        'test query'
      );

      expect(citationService.formatSourcesWithCitations).toHaveBeenCalledWith(
        mockResult.sources,
        expect.any(Object)
      );
      expect(response.content).toContain('Title 1');
      expect(response.content).toContain('Title 2');
      expect(response.groundingMetadata).toBeDefined();
      expect(response.groundingMetadata?.webSearchSources).toHaveLength(2);
      expect(response.isAI).toBe(true);
    });

    it('should handle empty sources', async () => {
      const emptyResult = {
        ...mockResult,
        sources: [],
        metadata: {
          ...mockResult.metadata,
          totalSources: 0,
          validSources: 0,
          averageScore: 0
        }
      };

      const response = await responseHandler.formatPipelineResult(
        emptyResult as PipelineResult,
        'test query'
      );

      expect(citationService.formatSourcesWithCitations).not.toHaveBeenCalled();
      expect(response.content).toContain('No relevant sources found');
      expect(response.groundingMetadata?.webSearchSources).toHaveLength(0);
    });

    it('should use cache when available', async () => {
      const mockCacheEntry = {
        response: 'Cached response',
        timestamp: Date.now(),
        history: []
      };

      (messageCache.get as jest.Mock).mockReturnValue(mockCacheEntry);

      const response = await responseHandler.formatPipelineResult(
        mockResult as PipelineResult,
        'test query',
        { cacheResults: true }
      );

      expect(citationService.formatSourcesWithCitations).not.toHaveBeenCalled();
      expect(response.content).toBe('Cached response');
      expect(messageCache.get).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      const mockError = new Error('Test error');
      const mockErrorResponse = {
        error: {
          message: 'Test error',
          type: 'Error',
          severity: 'error',
          code: 'TEST_ERROR'
        },
        success: false
      };

      (citationService.formatSourcesWithCitations as jest.Mock).mockImplementation(() => {
        throw mockError;
      });
      (ErrorHandler.prototype.handleError as jest.Mock).mockReturnValue(mockErrorResponse);

      const response = await responseHandler.formatPipelineResult(
        mockResult as PipelineResult,
        'test query'
      );

      expect(response.content).toContain('Error:');
      expect(response.content).toContain('Test error');
      expect(response.groundingMetadata).toBeNull();
    });

    it('should track progress', async () => {
      const progressCallback = jest.fn();

      await responseHandler.formatPipelineResult(
        mockResult as PipelineResult,
        'test query',
        { progressCallback }
      );

      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenCalledWith(0.1, 'Formatting response');
      expect(progressCallback).toHaveBeenCalledWith(0.8, 'Processing metadata');
      expect(progressCallback).toHaveBeenCalledWith(1, 'Complete');
    });

    it('should respect citation options', async () => {
      const options: Partial<ResponseOptions> = {
        includeCitations: true,
        maxCitations: 1,
        citationStyle: 'footnote'
      };

      await responseHandler.formatPipelineResult(
        mockResult as PipelineResult,
        'test query',
        options
      );

      expect(citationService.formatSourcesWithCitations).toHaveBeenCalledWith(
        mockResult.sources,
        expect.objectContaining({
          maxCitations: 1,
          style: 'footnote'
        })
      );
    });

    it('should not include citations when disabled', async () => {
      const options: Partial<ResponseOptions> = {
        includeCitations: false
      };

      const response = await responseHandler.formatPipelineResult(
        mockResult as PipelineResult,
        'test query',
        options
      );

      expect(citationService.formatSourcesWithCitations).not.toHaveBeenCalled();
      expect(response.content).toContain('No relevant sources found');
    });
  });
}); 