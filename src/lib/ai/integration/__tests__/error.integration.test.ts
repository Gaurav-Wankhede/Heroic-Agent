import { pipelineService } from '../../services/pipeline';
import { responseHandler } from '../../handlers/responseHandler';
import { citationService } from '../../services/citationService';
import { messageCache } from '../../services/cache';
import { ErrorHandler } from '../../utils/errorHandler';
import axios from 'axios';

// Mock external dependencies
jest.mock('axios');

describe('Error Handling Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    messageCache.clear();
  });

  describe('Network Errors', () => {
    it('should handle network timeouts', async () => {
      // Mock network timeout
      (axios.get as jest.Mock).mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 1000);
        })
      );

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true,
        validateContent: true,
        validateWeb: true,
        timeout: 500
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].error).toContain('timeout');
    });

    it('should handle DNS resolution errors', async () => {
      // Mock DNS error
      (axios.get as jest.Mock).mockRejectedValue(new Error('getaddrinfo ENOTFOUND example.com'));

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].error).toContain('ENOTFOUND');
    });

    it('should handle SSL certificate errors', async () => {
      // Mock SSL error
      (axios.get as jest.Mock).mockRejectedValue(new Error('UNABLE_TO_VERIFY_LEAF_SIGNATURE'));

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].error).toContain('SSL');
    });
  });

  describe('HTTP Errors', () => {
    it('should handle 404 errors', async () => {
      // Mock 404 response
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      });

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].error).toContain('404');
    });

    it('should handle 429 rate limit errors', async () => {
      // Mock rate limit response
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'retry-after': '60'
          }
        }
      });

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].error).toContain('rate limit');
    });

    it('should handle 5xx server errors', async () => {
      // Mock server error response
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 500,
          statusText: 'Internal Server Error'
        }
      });

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].error).toContain('500');
    });
  });

  describe('Validation Errors', () => {
    it('should handle invalid HTML content', async () => {
      // Mock invalid HTML response
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: '<html><body>Invalid HTML',
        headers: { 'content-type': 'text/html' }
      });

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateWeb: true
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].phase).toBe('validation');
    });

    it('should handle content type mismatches', async () => {
      // Mock PDF response
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: '%PDF-1.7',
        headers: { 'content-type': 'application/pdf' }
      });

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateContent: true
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].error).toContain('content type');
    });

    it('should handle malformed URLs', async () => {
      const result = await pipelineService.process('invalid:url:format', {
        maxResults: 5,
        validateLinks: true
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].error).toContain('URL');
    });
  });

  describe('Resource Errors', () => {
    it('should handle out of memory errors', async () => {
      // Mock large response
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: 'a'.repeat(1e7), // 10MB string
        headers: { 'content-type': 'text/plain' }
      });

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateContent: true
      });

      expect(result.isValid).toBe(false);
      expect(result.errors[0].error).toContain('memory');
    });

    it('should handle concurrent request limits', async () => {
      // Create many concurrent requests
      const promises = Array(100).fill(null).map(() =>
        pipelineService.process('test query', {
          maxResults: 5,
          validateLinks: true
        })
      );

      const results = await Promise.all(promises);
      const errors = results.filter(r => !r.isValid);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].errors[0].error).toContain('concurrent');
    });
  });

  describe('Error Response Formatting', () => {
    it('should format network errors correctly', async () => {
      // Mock network error
      (axios.get as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await pipelineService.process('test query');
      const response = await responseHandler.formatPipelineResult(result, 'test query');

      expect(response.content).toContain('Error:');
      expect(response.content).toContain('Network error');
      expect(response.groundingMetadata).toBeNull();
    });

    it('should format validation errors correctly', async () => {
      const result = await pipelineService.process('', { // Empty query
        maxResults: 5
      });

      const response = await responseHandler.formatPipelineResult(result, '');

      expect(response.content).toContain('Error:');
      expect(response.content).toContain('validation');
      expect(response.groundingMetadata).toBeNull();
    });

    it('should include error details in metadata', async () => {
      // Mock complex error
      (axios.get as jest.Mock).mockRejectedValue({
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          headers: {
            'retry-after': '60'
          },
          data: {
            error: 'Rate limit exceeded',
            details: {
              limit: 100,
              remaining: 0,
              reset: Date.now() + 60000
            }
          }
        }
      });

      const result = await pipelineService.process('test query');
      const response = await responseHandler.formatPipelineResult(result, 'test query');

      expect(response.content).toContain('Details:');
      expect(response.content).toContain('limit');
      expect(response.content).toContain('remaining');
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary errors with retry', async () => {
      let attempts = 0;
      (axios.get as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts <= 2) {
          return Promise.reject(new Error('Temporary error'));
        }
        return Promise.resolve({
          status: 200,
          data: '<html><body>Valid content</body></html>',
          headers: { 'content-type': 'text/html' }
        });
      });

      const result = await pipelineService.process('test query', {
        retryCount: 3
      });

      expect(result.isValid).toBe(true);
      expect(result.metadata.retries).toBe(2);
    });

    it('should use cached results when available after error', async () => {
      // First request succeeds
      (axios.get as jest.Mock).mockResolvedValueOnce({
        status: 200,
        data: '<html><body>Valid content</body></html>',
        headers: { 'content-type': 'text/html' }
      });

      const result1 = await pipelineService.process('test query', {
        cacheResults: true
      });

      // Second request fails but uses cache
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result2 = await pipelineService.process('test query', {
        cacheResults: true
      });

      expect(result2.isValid).toBe(true);
      expect(result2.metadata.cacheHits).toBe(1);
    });

    it('should handle partial failures gracefully', async () => {
      // Mock mixed success/failure responses
      (axios.get as jest.Mock).mockImplementation((url: string) => {
        if (url.includes('success')) {
          return Promise.resolve({
            status: 200,
            data: '<html><body>Valid content</body></html>',
            headers: { 'content-type': 'text/html' }
          });
        }
        return Promise.reject(new Error('Failed request'));
      });

      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true,
        validateContent: true,
        validateWeb: true
      });

      expect(result.isValid).toBe(true);
      expect(result.sources.length).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
}); 