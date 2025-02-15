import { pipelineService } from '../../services/pipeline';
import { linkValidator } from '../../utils/linkValidator';
import { webValidator } from '../../utils/webValidator';
import { contentValidator } from '../../utils/contentValidator';
import { responseHandler } from '../../handlers/responseHandler';
import { citationService } from '../../services/citationService';
import { messageCache } from '../../services/cache';
import { ErrorHandler } from '../../utils/errorHandler';
import axios from 'axios';

// Mock external dependencies
jest.mock('axios');

describe('Pipeline Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    messageCache.clear();
  });

  describe('Full Pipeline Flow', () => {
    it('should process a query and return formatted results', async () => {
      // Mock axios responses
      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url === 'https://example.com') {
          return Promise.resolve({
            status: 200,
            data: '<html><head><title>Test Page</title></head><body><p>Test content</p></body></html>',
            headers: {
              'content-type': 'text/html',
              'last-modified': new Date().toUTCString()
            }
          });
        }
        return Promise.reject(new Error('Not found'));
      });

      // Process query through pipeline
      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true,
        validateContent: true,
        validateWeb: true,
        cacheResults: true,
        retryCount: 1
      });

      // Verify pipeline result
      expect(result.isValid).toBe(true);
      expect(result.sources).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.errors).toHaveLength(0);

      // Format response
      const response = await responseHandler.formatPipelineResult(result, 'test query', {
        includeCitations: true,
        includeMetadata: true,
        formatMarkdown: true
      });

      // Verify response
      expect(response.content).toBeDefined();
      expect(response.groundingMetadata).toBeDefined();
      expect(response.isAI).toBe(true);
    });

    it('should handle validation errors gracefully', async () => {
      // Mock validation errors
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true,
        validateContent: true,
        validateWeb: true,
        cacheResults: true,
        retryCount: 1
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].phase).toBe('validation');
    });

    it('should respect cache settings', async () => {
      // First request
      const result1 = await pipelineService.process('test query', {
        maxResults: 5,
        cacheResults: true
      });

      // Second request (should use cache)
      const result2 = await pipelineService.process('test query', {
        maxResults: 5,
        cacheResults: true
      });

      expect(result2.metadata.cacheHits).toBe(1);
    });

    it('should handle concurrent requests', async () => {
      const promises = Array(5).fill(null).map(() =>
        pipelineService.process('test query', {
          maxResults: 5,
          validateLinks: true,
          validateContent: true,
          validateWeb: true
        })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.isValid).toBeDefined();
      });
    });

    it('should retry failed requests', async () => {
      let attempts = 0;
      (axios.get as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          status: 200,
          data: '<html><head><title>Test Page</title></head><body><p>Test content</p></body></html>',
          headers: {
            'content-type': 'text/html',
            'last-modified': new Date().toUTCString()
          }
        });
      });

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true,
        validateContent: true,
        validateWeb: true,
        retryCount: 3
      });

      expect(result.metadata.retries).toBe(2);
      expect(result.isValid).toBe(true);
    });

    it('should validate and format citations correctly', async () => {
      // Mock successful validation
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: '<html><head><title>Test Page</title></head><body><p>Test content</p></body></html>',
        headers: {
          'content-type': 'text/html',
          'last-modified': new Date().toUTCString()
        }
      });

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true,
        validateContent: true,
        validateWeb: true
      });

      // Test different citation styles
      const styles: ('inline' | 'footnote' | 'endnote')[] = ['inline', 'footnote', 'endnote'];
      
      for (const style of styles) {
        const response = await responseHandler.formatPipelineResult(result, 'test query', {
          includeCitations: true,
          citationStyle: style
        });

        expect(response.content).toContain(style === 'inline' ? '[1]' :
          style === 'footnote' ? 'Footnotes:' : 'References:');
      }
    });

    it('should handle edge cases and invalid inputs', async () => {
      // Test empty query
      await expect(pipelineService.process('')).rejects.toThrow();

      // Test very long query
      const longQuery = 'a'.repeat(1000);
      await expect(pipelineService.process(longQuery)).rejects.toThrow();

      // Test invalid options
      await expect(pipelineService.process('test', {
        maxResults: -1
      })).rejects.toThrow();

      // Test with missing dependencies
      const invalidResult = {
        isValid: false,
        score: 0,
        sources: [],
        metadata: {},
        citations: [],
        errors: [{
          phase: 'validation',
          error: 'Invalid result'
        }]
      };

      await expect(responseHandler.formatPipelineResult(
        invalidResult as any,
        'test query'
      )).resolves.toBeDefined();
    });

    it('should maintain consistent state across requests', async () => {
      // Mock successful validation
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: '<html><head><title>Test Page</title></head><body><p>Test content</p></body></html>',
        headers: {
          'content-type': 'text/html',
          'last-modified': new Date().toUTCString()
        }
      });

      // Process multiple requests
      const results = await Promise.all([
        pipelineService.process('query 1'),
        pipelineService.process('query 2'),
        pipelineService.process('query 3')
      ]);

      // Verify each result
      results.forEach((result, index) => {
        expect(result.isValid).toBe(true);
        expect(result.metadata.query).toBe(`query ${index + 1}`);
      });

      // Verify cache state
      expect(messageCache.size).toBe(3);
    });
  });
}); 