import { DomainLatestInfo } from '../../types/domain';
import { LatestInfoResponse } from '../../types/latestInfo';
import { DOMAIN_CONFIG } from '../../config/domains';
import { getLatestDomainInfo } from '../../handlers/response';
import { DomainError } from '../../utils/errorHandler';
import type { ScrapedSource } from '../webScraper';
import type { PipelineMetrics, PipelineResult } from '@/types/pipeline';

export class LatestInfoService {
  private static instance: LatestInfoService;

  private constructor() {}

  public static getInstance(): LatestInfoService {
    if (!LatestInfoService.instance) {
      LatestInfoService.instance = new LatestInfoService();
    }
    return LatestInfoService.instance;
  }

  /**
   * Structure the scraped information with AI context
   */
  public structureLatestInfo(
    sources: ScrapedSource[], 
    aiContext: string, 
    searchResults: Array<{ title: string; url: string; snippet: string; }>
  ): DomainLatestInfo {
    const keyDevelopments: string[] = [];
    const trendingTopics: string[] = [];
    const bestPractices: string[] = [];
    const resources: { title: string; url: string; description: string; }[] = [];

    // Add AI-generated context first
    const aiSections = aiContext.split('\n\n');
    aiSections.forEach(section => {
      if (section.includes('Key Development')) {
        keyDevelopments.push(...this.extractBulletPoints(section));
      } else if (section.includes('Trending')) {
        trendingTopics.push(...this.extractBulletPoints(section));
      } else if (section.includes('Best Practice')) {
        bestPractices.push(...this.extractBulletPoints(section));
      }
    });

    // Process each grounded source
    sources.forEach(source => {
      // Add to resources with relevance score
      resources.push({
        title: source.title,
        url: source.url,
        description: `[Relevance: ${Math.round((source.relevanceScore || 0) * 100)}%] ${source.description}`
      });

      // Extract key developments
      const firstParagraph = source.content?.split('\n')[0];
      if (firstParagraph && firstParagraph.length > 50) {
        keyDevelopments.push(firstParagraph);
      }

      // Extract trending topics
      const trendingMatches = source.content?.match(
        /(?:trending|popular|emerging|growing|rising).*?[.!?]/gi
      );
      if (trendingMatches) {
        trendingTopics.push(...trendingMatches);
      }

      // Extract best practices
      const practiceMatches = source.content?.match(
        /(?:best practice|recommend|should|must|important to).*?[.!?]/gi
      );
      if (practiceMatches) {
        bestPractices.push(...practiceMatches);
      }
    });

    return {
      keyDevelopments: [...new Set(keyDevelopments)].slice(0, 5),
      trendingTopics: [...new Set(trendingTopics)].slice(0, 5),
      bestPractices: [...new Set(bestPractices)].slice(0, 5),
      resources: resources.slice(0, 5),
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Format response when no sources are found
   */
  public formatEmptyResponse(
    domain: string, 
    description: string | undefined, 
    metrics: PipelineMetrics
  ): PipelineResult {
    const formattedDomain = domain.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    
    return {
      isValid: false,
      score: 0,
      sources: [],
      metadata: {
        query: '',
        timestamp: Date.now(),
        duration: 0,
        totalSources: 0,
        validSources: 0,
        averageScore: 0,
        cacheHits: 0,
        retries: 0,
        processingSteps: []
      },
      citations: [],
      errors: [
        {
          url: '',
          phase: 'processing',
          error: `No recent information found for ${formattedDomain}. ${description || ''}`,
          code: 'NO_SOURCES_FOUND'
        }
      ],
      content: '',
      groundingMetadata: {
        webSearchSources: []
      }
    };
  }

  /**
   * Format the response with proper structure and citations
   */
  public formatLatestInfoResponse(
    latestInfo: DomainLatestInfo,
    domain: string,
    domainDescription?: string
  ): LatestInfoResponse {
    const formattedDomain = domain.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    let content = `Here's the latest information about ${formattedDomain}:\n\n`;

    if (domainDescription) {
      content += `${domainDescription}\n\n`;
    }

    // Add sections with emojis and citations
    if (latestInfo.keyDevelopments?.length) {
      content += "🔑 Key Developments:\n";
      latestInfo.keyDevelopments.forEach(dev => {
        content += `• ${dev}\n`;
      });
      content += "\n";
    }

    if (latestInfo.trendingTopics?.length) {
      content += "📈 Trending Topics:\n";
      latestInfo.trendingTopics.forEach(topic => {
        content += `• ${topic}\n`;
      });
      content += "\n";
    }

    if (latestInfo.bestPractices?.length) {
      content += "✨ Current Best Practices:\n";
      latestInfo.bestPractices.forEach(practice => {
        content += `• ${practice}\n`;
      });
      content += "\n";
    }

    if (latestInfo.resources?.length) {
      content += "📚 Recommended Resources:\n";
      latestInfo.resources.forEach(resource => {
        content += `• ${resource.title} - ${resource.url}\n`;
      });
    }

    // Format sources for grounding
    const webSearchSources = latestInfo.resources?.map(resource => ({
      title: resource.title,
      url: resource.url,
      snippet: resource.description || ''
    })) || [];

    return {
      content,
      groundingMetadata: {
        webSearchSources
      }
    };
  }

  /**
   * Helper to extract bullet points from text
   */
  private extractBulletPoints(text: string): string[] {
    return text
      .split('\n')
      .filter(line => line.trim().startsWith('•'))
      .map(line => line.replace('•', '').trim());
  }
}

export const latestInfoService = LatestInfoService.getInstance(); 