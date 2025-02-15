import { searchService } from '../searchService';
import { genAI } from '@/lib/genai';

jest.mock('@/lib/genai', () => ({
  genAI: {
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn()
    })
  }
}));

describe('SearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('performGroundedSearch', () => {
    it('should return search results when successful', async () => {
      const mockResponse = `URL: https://example.com
Title: Example Title
Snippet: Example snippet

URL: https://test.com
Title: Test Title
Snippet: Test snippet`;

      (genAI.getGenerativeModel().generateContent as jest.Mock).mockResolvedValueOnce({
        response: {
          text: () => mockResponse
        }
      });

      const results = await searchService.performGroundedSearch(
        'test query',
        'test-domain',
        ['keyword1', 'keyword2']
      );

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({
        url: 'https://example.com',
        title: 'Example Title',
        snippet: 'Example snippet'
      });
      expect(results[1]).toEqual({
        url: 'https://test.com',
        title: 'Test Title',
        snippet: 'Test snippet'
      });
    });

    it('should return empty array when search fails', async () => {
      (genAI.getGenerativeModel().generateContent as jest.Mock).mockRejectedValueOnce(
        new Error('Search failed')
      );

      const results = await searchService.performGroundedSearch(
        'test query',
        'test-domain',
        ['keyword1', 'keyword2']
      );

      expect(results).toHaveLength(0);
    });

    it('should handle malformed search results', async () => {
      const mockResponse = `Invalid format
Not following the expected structure`;

      (genAI.getGenerativeModel().generateContent as jest.Mock).mockResolvedValueOnce({
        response: {
          text: () => mockResponse
        }
      });

      const results = await searchService.performGroundedSearch(
        'test query',
        'test-domain',
        ['keyword1', 'keyword2']
      );

      expect(results).toHaveLength(0);
    });

    it('should handle partial search results', async () => {
      const mockResponse = `URL: https://example.com
Title: Example Title
Snippet: Example snippet

URL: https://test.com
Title: Test Title`;

      (genAI.getGenerativeModel().generateContent as jest.Mock).mockResolvedValueOnce({
        response: {
          text: () => mockResponse
        }
      });

      const results = await searchService.performGroundedSearch(
        'test query',
        'test-domain',
        ['keyword1', 'keyword2']
      );

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        url: 'https://example.com',
        title: 'Example Title',
        snippet: 'Example snippet'
      });
    });
  });
}); 