import { beforeEach } from 'node:test';
import { linkValidator, LinkValidationOptions } from '../linkValidator';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LinkValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    linkValidator.clearRobotsTxtCache();
  });

  describe('validateLink', () => {
    it('should validate a valid URL', async () => {
      // Mock successful response
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        headers: {
          'content-type': 'text/html',
          'content-length': '1000',
          'last-modified': new Date().toUTCString()
        },
        request: {
          _redirectable: {
            _redirectCount: 0,
            _redirects: []
          }
        },
        config: {
          url: 'https://example.com'
        }
      });

      const result = await linkValidator.validateLink(
        'https://example.com',
        'example.com'
      );

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.issues).toHaveLength(0);
      expect(result.metadata.statusCode).toBe(200);
    });

    it('should handle invalid URLs', async () => {
      await expect(
        linkValidator.validateLink('not-a-url', 'example.com')
      ).rejects.toThrow('Invalid URL format');
    });

    it('should handle HTTP errors', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 404,
        headers: {},
        request: {
          _redirectable: {
            _redirectCount: 0,
            _redirects: []
          }
        }
      });

      const result = await linkValidator.validateLink(
        'https://example.com/404',
        'example.com'
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('status');
      expect(result.issues[0].message).toContain('404');
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        message: 'Network Error',
        code: 'ECONNREFUSED'
      });

      const result = await linkValidator.validateLink(
        'https://example.com',
        'example.com'
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('response');
      expect(result.issues[0].code).toBe('ECONNREFUSED');
    });

    it('should validate protocols', async () => {
      const result = await linkValidator.validateLink(
        'ftp://example.com',
        'example.com'
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('protocol');
    });

    it('should handle redirects', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        headers: {},
        request: {
          _redirectable: {
            _redirectCount: 2,
            _redirects: [
              'http://example.com',
              'https://example.com',
              'https://example.com/final'
            ]
          }
        }
      });

      const result = await linkValidator.validateLink(
        'http://example.com',
        'example.com'
      );

      expect(result.isValid).toBe(true);
      expect(result.metadata.redirectCount).toBe(2);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('redirect');
    });

    it('should respect domain whitelist', async () => {
      const options: Partial<LinkValidationOptions> = {
        checkWhitelist: true,
        allowedDomains: ['allowed.com']
      };

      const result = await linkValidator.validateLink(
        'https://notallowed.com',
        'example.com',
        options
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('domain');
    });

    it('should respect domain blacklist', async () => {
      const options: Partial<LinkValidationOptions> = {
        checkBlacklist: true,
        blockedDomains: ['blocked.com']
      };

      const result = await linkValidator.validateLink(
        'https://blocked.com',
        'example.com',
        options
      );

      expect(result.isValid).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('domain');
    });

    it('should handle robots.txt', async () => {
      // Mock robots.txt response
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: `
            User-agent: *
            Disallow: /private/
          `
        })
        // Mock actual URL response
        .mockResolvedValueOnce({
          status: 200,
          headers: {},
          request: {
            _redirectable: {
              _redirectCount: 0,
              _redirects: []
            }
          }
        });

      const result = await linkValidator.validateLink(
        'https://example.com/private/page',
        'example.com',
        { validateRobotsTxt: true }
      );

      expect(result.metadata.robotsTxtStatus).toBe(false);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe('robots');
    });

    it('should cache robots.txt results', async () => {
      // Mock robots.txt response
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: `
            User-agent: *
            Allow: /
          `
        })
        // Mock actual URL responses
        .mockResolvedValueOnce({
          status: 200,
          headers: {},
          request: {
            _redirectable: {
              _redirectCount: 0,
              _redirects: []
            }
          }
        })
        .mockResolvedValueOnce({
          status: 200,
          headers: {},
          request: {
            _redirectable: {
              _redirectCount: 0,
              _redirects: []
            }
          }
        });

      // First request
      await linkValidator.validateLink(
        'https://example.com/page1',
        'example.com',
        { validateRobotsTxt: true }
      );

      // Second request to same domain
      await linkValidator.validateLink(
        'https://example.com/page2',
        'example.com',
        { validateRobotsTxt: true }
      );

      // Should only fetch robots.txt once
      expect(mockedAxios.get).toHaveBeenCalledTimes(3);
    });
  });
}); 