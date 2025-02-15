import { Tool } from '@google/generative-ai';
import { getModel } from '@/lib/genai';

interface GoogleSearchTool {
  google_search: Record<string, never>;
}

// Configure search tool for grounding
const searchTool = {
  google_search: {}
} as Tool;

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export class SearchService {
  private static instance: SearchService;

  private constructor() {}

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Perform grounded search using Google Search
   */
  public async performGroundedSearch(
    query: string,
    domain: string,
    keywords: string[]
  ): Promise<SearchResult[]> {
    const searchPrompt = `Find the latest verified information about ${domain} focusing on:
1. Recent developments and updates
2. Current trends and innovations
3. Best practices and standards
4. Official documentation and reliable sources

Keywords: ${keywords.join(', ')}
Query: ${query}

Return results in this format:
URL: [url]
Title: [title]
Snippet: [brief description]

IMPORTANT:
- Only include results from the last 6 months
- Prioritize official documentation and verified sources
- Focus on technical and educational content
- Exclude social media and unreliable sources`;

    try {
      const model = await getModel('gemini-pro');
      if (!model) {
        console.error('Search model not available');
        return [];
      }

      const result = await model.generateContent(searchPrompt);
      const text = result?.response?.text() || '';
      
      return this.parseSearchResults(text);
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  /**
   * Parse search results from text
   */
  private parseSearchResults(text: string): SearchResult[] {
    const results: SearchResult[] = [];
    const lines = text.split('\n');
    let current: Partial<SearchResult> = {};

    for (const line of lines) {
      if (line.startsWith('URL:')) {
        if (current.url) {
          if (current.title && current.url && current.snippet) {
            results.push({
              title: current.title,
              url: current.url,
              snippet: current.snippet
            });
          }
          current = {};
        }
        current.url = line.replace('URL:', '').trim();
      } else if (line.startsWith('Title:')) {
        current.title = line.replace('Title:', '').trim();
      } else if (line.startsWith('Snippet:')) {
        current.snippet = line.replace('Snippet:', '').trim();
      }
    }

    if (current.title && current.url && current.snippet) {
      results.push({
        title: current.title,
        url: current.url,
        snippet: current.snippet
      });
    }

    return results;
  }
}

export const searchService = SearchService.getInstance(); 