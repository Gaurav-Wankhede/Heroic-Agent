import { pipelineService } from '../../services/pipeline';
import { responseHandler } from '../../handlers/responseHandler';
import { citationService } from '../../services/citationService';
import { messageCache } from '../../services/cache';
import axios from 'axios';

// Mock external dependencies
jest.mock('axios');

describe('Performance Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    messageCache.clear();
  });

  describe('Response Time', () => {
    it('should process queries within acceptable time limits', async () => {
      // Mock successful response
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: '<html><body>Test content</body></html>',
        headers: { 'content-type': 'text/html' }
      });

      const startTime = Date.now();
      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true,
        validateContent: true,
        validateWeb: true
      });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.isValid).toBe(true);
    });

    it('should maintain performance under load', async () => {
      // Mock fast response
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: '<html><body>Test content</body></html>',
        headers: { 'content-type': 'text/html' }
      });

      const iterations = 10;
      const durations: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await pipelineService.process(`test query ${i}`, {
          maxResults: 5,
          validateLinks: true,
          validateContent: true,
          validateWeb: true
        });
        durations.push(Date.now() - startTime);
      }

      const averageDuration = durations.reduce((a, b) => a + b) / iterations;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);
      const variance = durations.reduce((a, b) => a + Math.pow(b - averageDuration, 2), 0) / iterations;

      expect(averageDuration).toBeLessThan(1000); // Average under 1 second
      expect(maxDuration).toBeLessThan(2000); // Max under 2 seconds
      expect(variance).toBeLessThan(250000); // Low variance
    });
  });

  describe('Memory Usage', () => {
    it('should handle large responses efficiently', async () => {
      // Mock large response
      const largeContent = '<html><body>' + 'a'.repeat(1e6) + '</body></html>';
      (axios.get as jest.Mock).mockResolvedValue({
        status: 200,
        data: largeContent,
        headers: { 'content-type': 'text/html' }
      });

      const initialMemory = process.memoryUsage().heapUsed;
      
      await pipelineService.process('test query', {
        maxResults: 5,
        validateContent: true
      });

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
    });

    it('should clean up resources after processing', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Process multiple requests
      for (let i = 0; i < 10; i++) {
        await pipelineService.process(`test query ${i}`, {
          maxResults: 5,
          validateLinks: true
        });
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Less than 10MB increase
    });
  });

  describe('Cache Performance', () => {
    it('should serve cached responses quickly', async () => {
      // First request (uncached)
      const uncachedStart = Date.now();
      await pipelineService.process('test query', {
        maxResults: 5,
        cacheResults: true
      });
      const uncachedDuration = Date.now() - uncachedStart;

      // Second request (cached)
      const cachedStart = Date.now();
      await pipelineService.process('test query', {
        maxResults: 5,
        cacheResults: true
      });
      const cachedDuration = Date.now() - cachedStart;

      expect(cachedDuration).toBeLessThan(uncachedDuration / 10); // Cached should be 10x faster
    });

    it('should maintain cache size within limits', async () => {
      const maxEntries = 1000;
      const initialSize = messageCache.size;

      // Add many entries
      for (let i = 0; i < maxEntries + 100; i++) {
        await pipelineService.process(`test query ${i}`, {
          maxResults: 5,
          cacheResults: true
        });
      }

      expect(messageCache.size - initialSize).toBeLessThanOrEqual(maxEntries);
    });
  });

  describe('Concurrent Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 10;
      const startTime = Date.now();

      const promises = Array(concurrentRequests).fill(null).map((_, i) =>
        pipelineService.process(`test query ${i}`, {
          maxResults: 5,
          validateLinks: true
        })
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => expect(result.isValid).toBe(true));
    });

    it('should maintain response quality under load', async () => {
      const requests = 20;
      const scores: number[] = [];

      // Process multiple requests concurrently
      const promises = Array(requests).fill(null).map(async (_, i) => {
        const result = await pipelineService.process(`test query ${i}`, {
          maxResults: 5,
          validateLinks: true,
          validateContent: true
        });
        scores.push(result.score);
        return result;
      });

      await Promise.all(promises);

      const averageScore = scores.reduce((a, b) => a + b) / scores.length;
      expect(averageScore).toBeGreaterThan(0.7); // Maintain quality above 70%
    });
  });

  describe('Resource Usage', () => {
    it('should limit network requests', async () => {
      const requestCount = jest.fn();
      (axios.get as jest.Mock).mockImplementation(() => {
        requestCount();
        return Promise.resolve({
          status: 200,
          data: '<html><body>Test content</body></html>',
          headers: { 'content-type': 'text/html' }
        });
      });

      await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true,
        validateWeb: true
      });

      expect(requestCount).toHaveBeenCalledTimes(expect.any(Number));
      expect(requestCount.mock.calls.length).toBeLessThanOrEqual(10);
    });

    it('should optimize response size', async () => {
      const result = await pipelineService.process('test query', {
        maxResults: 5,
        validateLinks: true,
        validateContent: true,
        validateWeb: true
      });

      const response = await responseHandler.formatPipelineResult(result, 'test query');
      const responseSize = Buffer.from(JSON.stringify(response)).length;

      expect(responseSize).toBeLessThan(100 * 1024); // Less than 100KB
    });
  });

  describe('Citation Performance', () => {
    it('should format citations efficiently', async () => {
      const sources = Array(100).fill(null).map((_, i) => ({
        url: `https://example${i}.com`,
        title: `Title ${i}`,
        description: `Description ${i}`,
        content: `Content ${i}`,
        score: 0.9,
        relevance: 0.8,
        metadata: {
          date: '2024-03-14',
          author: `Author ${i}`,
          language: 'en',
          wordCount: 100,
          readingTime: 1
        }
      }));

      const startTime = Date.now();
      const content = citationService.formatSourcesWithCitations(sources, {
        maxCitations: 50,
        style: 'inline',
        includeMetadata: true,
        formatMarkdown: true
      });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(100); // Should complete within 100ms
      expect(content).toBeDefined();
    });
  });
}); 