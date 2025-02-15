import { pipelineService, PipelineOptions } from '../pipeline';
import { linkValidator } from '../../utils/linkValidator';
import { webValidator } from '../../utils/webValidator';
import { contentValidator } from '../../utils/contentValidator';
import axios from 'axios';

// Mock dependencies
jest.mock('axios');
jest.mock('../../utils/linkValidator');
jest.mock('../../utils/webValidator');
jest.mock('../../utils/contentValidator');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedLinkValidator = linkValidator as jest.Mocked<typeof linkValidator>;
const mockedWebValidator = webValidator as jest.Mocked<typeof webValidator>;
const mockedContentValidator = contentValidator as jest.Mocked<typeof contentValidator>;

describe('PipelineService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pipelineService.clearCache();
  });

  describe('process', () => {
    it('should process URLs and return valid results', async () => {
      // Mock successful link validation
      mockedLinkValidator.validateLink.mockResolvedValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          url: 'https://example.com',
          normalizedUrl: 'https://example.com',
          protocol: 'https:',
          domain: 'example.com',
          path: '/',
          query: '',
          fragment: '',
          redirectCount: 0,
          redirectChain: [],
          responseTime: 100,
          isCanonical: true
        }
      });

      // Mock successful web validation
      mockedWebValidator.validateWeb.mockResolvedValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          url: 'https://example.com',
          title: 'Test Page',
          description: 'A test page',
          language: 'en',
          charset: 'UTF-8',
          viewport: 'width=device-width',
          author: 'Test Author',
          keywords: ['test'],
          openGraph: {},
          twitter: {},
          schemaOrg: [],
          headers: { 'last-modified': new Date().toUTCString() },
          loadTime: 100,
          size: 1000,
          resourceCounts: {
            scripts: 1,
            styles: 1,
            images: 1,
            fonts: 0,
            iframes: 0
          },
          securityHeaders: {}
        },
        contentValidation: {
          isValid: true,
          score: 1,
          issues: [],
          metadata: {
            content: 'Test content',
            wordCount: 100,
            readingTime: 1,
            readabilityScore: 70,
            sentiment: 'positive',
            language: 'en',
            topics: ['test'],
            keywords: ['test']
          }
        }
      });

      // Mock successful content validation
      mockedContentValidator.validateContent.mockReturnValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          wordCount: 100,
          readingTime: 1,
          readabilityScore: 70,
          sentiment: 'positive',
          language: 'en',
          topics: ['test'],
          keywords: ['test']
        }
      });

      const result = await pipelineService.process(
        'test query',
        ['https://example.com'],
        {
          maxConcurrentRequests: 1,
          cacheResults: false
        }
      );

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.sources).toHaveLength(1);
      expect(result.citations).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.metadata.validSources).toBe(1);
    });

    it('should handle invalid link validation', async () => {
      mockedLinkValidator.validateLink.mockResolvedValue({
        isValid: false,
        score: 0,
        issues: [{
          type: 'status',
          message: 'HTTP 404 error',
          severity: 'error'
        }],
        metadata: {
          url: 'https://example.com',
          normalizedUrl: 'https://example.com',
          protocol: 'https:',
          domain: 'example.com',
          path: '/',
          query: '',
          fragment: '',
          redirectCount: 0,
          redirectChain: [],
          responseTime: 100,
          isCanonical: true
        }
      });

      const result = await pipelineService.process(
        'test query',
        ['https://example.com']
      );

      expect(result.sources).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].phase).toBe('link');
    });

    it('should handle invalid web validation', async () => {
      mockedLinkValidator.validateLink.mockResolvedValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          url: 'https://example.com',
          normalizedUrl: 'https://example.com',
          protocol: 'https:',
          domain: 'example.com',
          path: '/',
          query: '',
          fragment: '',
          redirectCount: 0,
          redirectChain: [],
          responseTime: 100,
          isCanonical: true
        }
      });

      mockedWebValidator.validateWeb.mockResolvedValue({
        isValid: false,
        score: 0,
        issues: [{
          type: 'security',
          message: 'Missing security headers',
          severity: 'error'
        }],
        metadata: {
          url: 'https://example.com',
          title: '',
          description: '',
          language: '',
          charset: '',
          viewport: '',
          author: '',
          keywords: [],
          openGraph: {},
          twitter: {},
          schemaOrg: [],
          headers: {},
          loadTime: 0,
          size: 0,
          resourceCounts: {
            scripts: 0,
            styles: 0,
            images: 0,
            fonts: 0,
            iframes: 0
          },
          securityHeaders: {}
        }
      });

      const result = await pipelineService.process(
        'test query',
        ['https://example.com']
      );

      expect(result.sources).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].phase).toBe('web');
    });

    it('should handle invalid content validation', async () => {
      mockedLinkValidator.validateLink.mockResolvedValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          url: 'https://example.com',
          normalizedUrl: 'https://example.com',
          protocol: 'https:',
          domain: 'example.com',
          path: '/',
          query: '',
          fragment: '',
          redirectCount: 0,
          redirectChain: [],
          responseTime: 100,
          isCanonical: true
        }
      });

      mockedWebValidator.validateWeb.mockResolvedValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          url: 'https://example.com',
          title: 'Test',
          description: 'Test',
          language: 'en',
          charset: 'UTF-8',
          viewport: '',
          author: '',
          keywords: [],
          openGraph: {},
          twitter: {},
          schemaOrg: [],
          headers: {},
          loadTime: 100,
          size: 1000,
          resourceCounts: {
            scripts: 0,
            styles: 0,
            images: 0,
            fonts: 0,
            iframes: 0
          },
          securityHeaders: {}
        },
        contentValidation: {
          isValid: false,
          score: 0,
          issues: [{
            type: 'quality',
            message: 'Low quality content',
            severity: 'error'
          }],
          metadata: {
            content: '',
            wordCount: 0,
            readingTime: 0,
            readabilityScore: 0,
            sentiment: 'neutral',
            language: 'en',
            topics: [],
            keywords: []
          }
        }
      });

      const result = await pipelineService.process(
        'test query',
        ['https://example.com']
      );

      expect(result.sources).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].phase).toBe('content');
    });

    it('should handle network errors', async () => {
      mockedLinkValidator.validateLink.mockRejectedValue(new Error('Network error'));

      const result = await pipelineService.process(
        'test query',
        ['https://example.com'],
        { retryCount: 1 }
      );

      expect(result.sources).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].phase).toBe('processing');
      expect(result.metadata.retries).toBeGreaterThan(0);
    });

    it('should use cache when enabled', async () => {
      // First call
      mockedLinkValidator.validateLink.mockResolvedValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          url: 'https://example.com',
          normalizedUrl: 'https://example.com',
          protocol: 'https:',
          domain: 'example.com',
          path: '/',
          query: '',
          fragment: '',
          redirectCount: 0,
          redirectChain: [],
          responseTime: 100,
          isCanonical: true
        }
      });

      await pipelineService.process(
        'test query',
        ['https://example.com'],
        { cacheResults: true }
      );

      // Second call
      const result = await pipelineService.process(
        'test query',
        ['https://example.com'],
        { cacheResults: true }
      );

      expect(result.metadata.cacheHits).toBe(1);
      expect(mockedLinkValidator.validateLink).toHaveBeenCalledTimes(1);
    });

    it('should filter duplicates when enabled', async () => {
      mockedLinkValidator.validateLink.mockResolvedValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          url: 'https://example.com',
          normalizedUrl: 'https://example.com',
          protocol: 'https:',
          domain: 'example.com',
          path: '/',
          query: '',
          fragment: '',
          redirectCount: 0,
          redirectChain: [],
          responseTime: 100,
          isCanonical: true
        }
      });

      mockedWebValidator.validateWeb.mockResolvedValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          url: 'https://example.com',
          title: 'Test',
          description: 'Test',
          language: 'en',
          charset: 'UTF-8',
          viewport: '',
          author: '',
          keywords: [],
          openGraph: {},
          twitter: {},
          schemaOrg: [],
          headers: {},
          loadTime: 100,
          size: 1000,
          resourceCounts: {
            scripts: 0,
            styles: 0,
            images: 0,
            fonts: 0,
            iframes: 0
          },
          securityHeaders: {}
        }
      });

      const result = await pipelineService.process(
        'test query',
        ['https://example.com', 'https://example.com/duplicate'],
        { filterDuplicates: true }
      );

      expect(result.sources.length).toBeLessThan(2);
    });

    it('should respect maxResults option', async () => {
      mockedLinkValidator.validateLink.mockResolvedValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          url: 'https://example.com',
          normalizedUrl: 'https://example.com',
          protocol: 'https:',
          domain: 'example.com',
          path: '/',
          query: '',
          fragment: '',
          redirectCount: 0,
          redirectChain: [],
          responseTime: 100,
          isCanonical: true
        }
      });

      mockedWebValidator.validateWeb.mockResolvedValue({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          url: 'https://example.com',
          title: 'Test',
          description: 'Test',
          language: 'en',
          charset: 'UTF-8',
          viewport: '',
          author: '',
          keywords: [],
          openGraph: {},
          twitter: {},
          schemaOrg: [],
          headers: {},
          loadTime: 100,
          size: 1000,
          resourceCounts: {
            scripts: 0,
            styles: 0,
            images: 0,
            fonts: 0,
            iframes: 0
          },
          securityHeaders: {}
        }
      });

      const result = await pipelineService.process(
        'test query',
        Array(20).fill('https://example.com'),
        { maxResults: 5 }
      );

      expect(result.sources).toHaveLength(5);
    });
  });
}); 