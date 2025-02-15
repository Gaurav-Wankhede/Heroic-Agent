import { webValidator, WebValidationOptions, WebIssueType, IssueSeverity } from '../webValidator';
import { linkValidator } from '../linkValidator';
import { contentValidator } from '../contentValidator';
import axios from 'axios';
import { JSDOM } from 'jsdom';

// Mock dependencies
jest.mock('axios');
jest.mock('../linkValidator');
jest.mock('../contentValidator');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedLinkValidator = linkValidator as jest.Mocked<typeof linkValidator>;
const mockedContentValidator = contentValidator as jest.Mocked<typeof contentValidator>;

describe('WebValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateWeb', () => {
    it('should validate a valid web page', async () => {
      // Mock successful link validation
      mockedLinkValidator.validateLink.mockResolvedValueOnce({
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

      // Mock successful content validation
      mockedContentValidator.validateContent.mockReturnValueOnce({
        isValid: true,
        score: 1,
        issues: [],
        metadata: {
          wordCount: 1000,
          readingTime: 5,
          readabilityScore: 70,
          sentiment: 'positive',
          language: 'en',
          topics: ['technology'],
          keywords: ['web', 'testing']
        }
      });

      // Mock successful HTTP response
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: `
          <!DOCTYPE html>
          <html lang="en">
            <head>
              <title>Test Page</title>
              <meta name="description" content="A test page">
              <meta name="viewport" content="width=device-width">
              <link rel="icon" href="/favicon.ico">
              <meta property="og:title" content="Test Page">
              <meta name="twitter:card" content="summary">
              <script type="application/ld+json">{"@type": "WebPage"}</script>
            </head>
            <body>
              <header>Header</header>
              <main>
                <h1>Test Page</h1>
                <p>Test content</p>
                <img src="test.jpg" alt="Test image">
              </main>
              <footer>Footer</footer>
            </body>
          </html>
        `,
        headers: {
          'content-security-policy': 'default-src self',
          'strict-transport-security': 'max-age=31536000',
          'x-frame-options': 'DENY'
        },
        config: {
          url: 'https://example.com'
        }
      });

      const result = await webValidator.validateWeb(
        'https://example.com',
        'example.com',
        {
          validateSecurity: true,
          validateAccessibility: true,
          validateSEO: true,
          validatePerformance: true,
          validateStructure: true
        }
      );

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0.8);
      expect(result.issues).toHaveLength(0);
      expect(result.metadata.title).toBe('Test Page');
      expect(result.metadata.description).toBe('A test page');
      expect(result.metadata.securityHeaders.csp).toBeDefined();
      expect(result.linkValidation).toBeDefined();
      expect(result.contentValidation).toBeDefined();
    });

    it('should handle invalid link validation', async () => {
      mockedLinkValidator.validateLink.mockResolvedValueOnce({
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

      const result = await webValidator.validateWeb(
        'https://example.com',
        'example.com'
      );

      expect(result.isValid).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0].type).toBe(WebIssueType.STANDARDS);
    });

    it('should validate security headers', async () => {
      mockedLinkValidator.validateLink.mockResolvedValueOnce({
        isValid: true,
        score: 1,
        issues: [],
        metadata: { url: 'https://example.com', normalizedUrl: 'https://example.com', protocol: 'https:', domain: 'example.com', path: '/', query: '', fragment: '', redirectCount: 0, redirectChain: [], responseTime: 100, isCanonical: true }
      });

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: '<html><head><title>Test</title></head><body>Test</body></html>',
        headers: {},
        config: { url: 'https://example.com' }
      });

      const result = await webValidator.validateWeb(
        'https://example.com',
        'example.com',
        { validateSecurity: true }
      );

      expect(result.issues.filter(i => i.type === WebIssueType.SECURITY)).toHaveLength(3);
    });

    it('should validate accessibility', async () => {
      mockedLinkValidator.validateLink.mockResolvedValueOnce({
        isValid: true,
        score: 1,
        issues: [],
        metadata: { url: 'https://example.com', normalizedUrl: 'https://example.com', protocol: 'https:', domain: 'example.com', path: '/', query: '', fragment: '', redirectCount: 0, redirectChain: [], responseTime: 100, isCanonical: true }
      });

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: `
          <html>
            <head><title>Test</title></head>
            <body>
              <img src="test.jpg">
              <input type="text">
              <h1>Title</h1>
              <h3>Subtitle</h3>
            </body>
          </html>
        `,
        headers: {},
        config: { url: 'https://example.com' }
      });

      const result = await webValidator.validateWeb(
        'https://example.com',
        'example.com',
        { validateAccessibility: true }
      );

      const accessibilityIssues = result.issues.filter(i => i.type === WebIssueType.ACCESSIBILITY);
      expect(accessibilityIssues.length).toBeGreaterThan(0);
      expect(accessibilityIssues.some(i => i.message.includes('alt text'))).toBe(true);
      expect(accessibilityIssues.some(i => i.message.includes('label'))).toBe(true);
      expect(accessibilityIssues.some(i => i.message.includes('heading level'))).toBe(true);
    });

    it('should validate SEO', async () => {
      mockedLinkValidator.validateLink.mockResolvedValueOnce({
        isValid: true,
        score: 1,
        issues: [],
        metadata: { url: 'https://example.com', normalizedUrl: 'https://example.com', protocol: 'https:', domain: 'example.com', path: '/', query: '', fragment: '', redirectCount: 0, redirectChain: [], responseTime: 100, isCanonical: true }
      });

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: '<html><head><title>T</title></head><body></body></html>',
        headers: {},
        config: { url: 'https://example.com' }
      });

      const result = await webValidator.validateWeb(
        'https://example.com',
        'example.com',
        { validateSEO: true }
      );

      const seoIssues = result.issues.filter(i => i.type === WebIssueType.SEO);
      expect(seoIssues.length).toBeGreaterThan(0);
      expect(seoIssues.some(i => i.message.includes('Title length'))).toBe(true);
      expect(seoIssues.some(i => i.message.includes('meta description'))).toBe(true);
      expect(seoIssues.some(i => i.message.includes('H1 heading'))).toBe(true);
    });

    it('should validate performance', async () => {
      mockedLinkValidator.validateLink.mockResolvedValueOnce({
        isValid: true,
        score: 1,
        issues: [],
        metadata: { url: 'https://example.com', normalizedUrl: 'https://example.com', protocol: 'https:', domain: 'example.com', path: '/', query: '', fragment: '', redirectCount: 0, redirectChain: [], responseTime: 100, isCanonical: true }
      });

      const largeContent = 'x'.repeat(6 * 1024 * 1024); // 6MB
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: `
          <html>
            <head>
              <title>Test</title>
              ${Array(25).fill('<script src="test.js"></script>').join('\n')}
              ${Array(15).fill('<link rel="stylesheet" href="test.css">').join('\n')}
            </head>
            <body>${largeContent}</body>
          </html>
        `,
        headers: {},
        config: { url: 'https://example.com' }
      });

      const result = await webValidator.validateWeb(
        'https://example.com',
        'example.com',
        { validatePerformance: true }
      );

      const performanceIssues = result.issues.filter(i => i.type === WebIssueType.PERFORMANCE);
      expect(performanceIssues.length).toBeGreaterThan(0);
      expect(performanceIssues.some(i => i.message.includes('scripts'))).toBe(true);
      expect(performanceIssues.some(i => i.message.includes('stylesheets'))).toBe(true);
      expect(performanceIssues.some(i => i.message.includes('page size'))).toBe(true);
    });

    it('should validate structure', async () => {
      mockedLinkValidator.validateLink.mockResolvedValueOnce({
        isValid: true,
        score: 1,
        issues: [],
        metadata: { url: 'https://example.com', normalizedUrl: 'https://example.com', protocol: 'https:', domain: 'example.com', path: '/', query: '', fragment: '', redirectCount: 0, redirectChain: [], responseTime: 100, isCanonical: true }
      });

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: `
          <html>
            <head><title>Test</title></head>
            <body>
              <h7>Invalid heading</h7>
              <div>Content</div>
            </body>
          </html>
        `,
        headers: {},
        config: { url: 'https://example.com' }
      });

      const result = await webValidator.validateWeb(
        'https://example.com',
        'example.com',
        {
          validateStructure: true,
          requireFavicon: true,
          requireManifest: true
        }
      );

      const structureIssues = result.issues.filter(i => i.type === WebIssueType.STRUCTURE);
      expect(structureIssues.length).toBeGreaterThan(0);
      expect(structureIssues.some(i => i.message.includes('header element'))).toBe(true);
      expect(structureIssues.some(i => i.message.includes('main element'))).toBe(true);
      expect(structureIssues.some(i => i.message.includes('footer element'))).toBe(true);
      expect(structureIssues.some(i => i.message.includes('favicon'))).toBe(true);
      expect(structureIssues.some(i => i.message.includes('manifest'))).toBe(true);
    });

    it('should handle network errors', async () => {
      mockedLinkValidator.validateLink.mockResolvedValueOnce({
        isValid: true,
        score: 1,
        issues: [],
        metadata: { url: 'https://example.com', normalizedUrl: 'https://example.com', protocol: 'https:', domain: 'example.com', path: '/', query: '', fragment: '', redirectCount: 0, redirectChain: [], responseTime: 100, isCanonical: true }
      });

      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        webValidator.validateWeb('https://example.com', 'example.com')
      ).rejects.toThrow('Failed to validate web page');
    });
  });
}); 