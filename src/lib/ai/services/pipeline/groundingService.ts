import { genAI } from '@/lib/genai';
import { calculateSimilarity } from '@/lib/ai/utils/similarity';
import type { ScrapedSource } from '../webScraper';
import type { SearchResult } from './searchService';

// Configure grounding model with higher precision
const groundingModel = genAI?.getGenerativeModel({
  model: "models/gemini-2.0-flash",
  generationConfig: {
    temperature: 0.2,
    topK: 30,
    topP: 0.85,
    maxOutputTokens: 4096
  }
});

export class GroundingService {
  private static instance: GroundingService;

  private constructor() {}

  public static getInstance(): GroundingService {
    if (!GroundingService.instance) {
      GroundingService.instance = new GroundingService();
    }
    return GroundingService.instance;
  }

  /**
   * Ground sources using search results
   */
  public async groundSourcesWithSearch(
    sources: ScrapedSource[],
    searchResults: SearchResult[],
    domain: string,
    query: string
  ): Promise<ScrapedSource[]> {
    const groundedSources: ScrapedSource[] = [];

    for (const source of sources) {
      try {
        // Check if source matches any search result
        const matchingResult = searchResults.find(result => 
          result.url === source.url || 
          calculateSimilarity(result.title, source.title) > 0.8
        );

        // Create grounding prompt with search context
        const prompt = `Verify and rate the relevance of this source for ${domain} and "${query}":
Title: ${source.title}
URL: ${source.url}
Content: ${source.content?.substring(0, 500)}...
${matchingResult ? `Search Match: ${matchingResult.title}` : ''}

Rate from 0-1 based on:
1. Source authority and credibility (0.3)
2. Content relevance to query (0.3)
3. Information recency (0.2)
4. Technical depth (0.1)
5. Domain expertise (0.1)

Return ONLY a number between 0 and 1.`;

        const result = await groundingModel?.generateContent(prompt);
        const relevanceScore = parseFloat(result?.response?.text() || '0');

        // Include sources with high relevance or matching search results
        if (!isNaN(relevanceScore) && (relevanceScore >= 0.7 || matchingResult)) {
          groundedSources.push({
            ...source,
            relevanceScore: matchingResult ? Math.max(relevanceScore, 0.8) : relevanceScore
          });
        }
      } catch (error) {
        console.warn(`Failed to ground source: ${source.url}`, error);
      }
    }

    // Sort by relevance score
    return groundedSources.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
  }
}

export const groundingService = GroundingService.getInstance(); 