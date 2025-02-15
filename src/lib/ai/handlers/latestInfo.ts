import { DomainLatestInfo, LatestInfoResponse } from '@/lib/ai/types/latestInfo';
import { isGeneralGreeting } from '@/lib/ai/utils/messageUtils';
import { getLatestDomainInfo } from '@/lib/ai/handlers/response';
import { DOMAIN_CONFIG } from '@/lib/ai/config/domains';
import { 
  validateAndEnrichSources, 
  formatSourceCitation,
  type ScrapedSource 
} from '@/lib/ai/services/webScraper';

export async function handleLatestInfoRequest(message: string, domain: string): Promise<LatestInfoResponse | null> {
  // Check if it's a request for latest information
  const isLatestInfoRequest = /latest|recent|new|update|current/i.test(message) &&
    /information|info|news|development|update/i.test(message);

  // Also handle greetings as potential latest info requests
  const isGreeting = isGeneralGreeting(message);

  // Return null only if it's neither a latest info request nor a greeting
  if (!isLatestInfoRequest && !isGreeting) {
    return null;
  }

  try {
    // Get domain-specific latest information with grounding
    const latestInfoStr = await getLatestDomainInfo(domain);
    
    // Get validated and enriched sources using Google grounding
    const query = `latest developments in ${domain.replace(/-/g, ' ')}`;
    const validatedSources = await validateAndEnrichSources(query, domain);

    // Create citations for each section using validated sources
    const keyDevelopments = extractSectionWithCitations(latestInfoStr, 'Key Developments', validatedSources);
    const trendingTopics = extractSectionWithCitations(latestInfoStr, 'Trending Topics', validatedSources);
    const bestPractices = extractSectionWithCitations(latestInfoStr, 'Current Best Practices', validatedSources);
    
    const latestInfo: DomainLatestInfo = {
      keyDevelopments: keyDevelopments.items,
      trendingTopics: trendingTopics.items,
      bestPractices: bestPractices.items,
      resources: validatedSources.map(source => ({
        title: source.title,
        url: source.url,
        description: source.description
      })),
      lastUpdated: new Date().toISOString()
    };

    const domainConfig = DOMAIN_CONFIG.get(domain);
    if (!domainConfig) {
      throw new Error(`Invalid domain: ${domain}`);
    }

    // Format the response with latest information
    const response = formatLatestInfoResponse(
      latestInfo,
      domain,
      domainConfig.description,
      {
        keyDevelopments: keyDevelopments.citations,
        trendingTopics: trendingTopics.citations,
        bestPractices: bestPractices.citations
      }
    );

    return {
      content: response.content,
      groundingMetadata: {
        webSearchSources: validatedSources
          .filter(source => source.relevanceScore >= 70)
          .map(source => ({
            title: source.title,
            url: source.url,
            snippet: source.description
          }))
      }
    };
  } catch (error) {
    console.error('Error getting latest information:', error);
    throw error;
  }
}

interface SectionWithCitations {
  items: string[];
  citations: string[];
}

function extractSectionWithCitations(
  text: string,
  sectionName: string,
  sources: ScrapedSource[]
): SectionWithCitations {
  const regex = new RegExp(`${sectionName}:([^#]*?)(?=#|$)`, 's');
  const match = text.match(regex);
  if (!match) return { items: [], citations: [] };

  const items: string[] = [];
  const citations: string[] = [];

  const lines = match[1].split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('•'));

  lines.forEach(line => {
    const item = line.substring(1).trim();
    items.push(item);

    // Find best matching source based on content similarity
    const matchingSource = findBestMatchingSource(item, sources);
    if (matchingSource) {
      citations.push(formatSourceCitation(matchingSource));
    } else {
      citations.push('');
    }
  });

  return { items, citations };
}

function findBestMatchingSource(item: string, sources: ScrapedSource[]): ScrapedSource | null {
  let bestMatch: ScrapedSource | null = null;
  let bestScore = 0;

  for (const source of sources) {
    const score = calculateMatchScore(item, source);
    if (score > bestScore && score > 0.3) { // Minimum threshold
      bestScore = score;
      bestMatch = source;
    }
  }

  return bestMatch;
}

function calculateMatchScore(item: string, source: ScrapedSource): number {
  const itemLower = item.toLowerCase();
  const contentLower = source.content.toLowerCase();
  const titleLower = source.title.toLowerCase();

  // Check for exact matches
  if (contentLower.includes(itemLower)) return 1;
  if (titleLower.includes(itemLower)) return 0.9;

  // Calculate word overlap
  const itemWords = new Set(itemLower.split(/\W+/));
  const contentWords = new Set(contentLower.split(/\W+/));
  const titleWords = new Set(titleLower.split(/\W+/));

  const contentOverlap = [...itemWords].filter(word => contentWords.has(word)).length / itemWords.size;
  const titleOverlap = [...itemWords].filter(word => titleWords.has(word)).length / itemWords.size;

  return Math.max(contentOverlap * 0.7, titleOverlap * 0.8);
}

function formatLatestInfoResponse(
  latestInfo: DomainLatestInfo,
  domain: string,
  domainDescription?: string,
  citations?: {
    keyDevelopments: string[];
    trendingTopics: string[];
    bestPractices: string[];
  }
): {
  content: string;
  sources: { title: string; url: string; snippet: string; }[];
} {
  const formattedDomain = domain.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  
  let content = `Here's the latest information about ${formattedDomain}:\n\n`;

  if (domainDescription) {
    content += `${domainDescription}\n\n`;
  }

  // Add key developments with citations
  if (latestInfo.keyDevelopments && latestInfo.keyDevelopments.length > 0) {
    content += "🔑 Key Developments:\n";
    latestInfo.keyDevelopments.forEach((dev, index) => {
      content += `• ${dev}`;
      if (citations?.keyDevelopments[index]) {
        content += ` ${citations.keyDevelopments[index]}`;
      }
      content += '\n';
    });
    content += "\n";
  }

  // Add trending topics with citations
  if (latestInfo.trendingTopics && latestInfo.trendingTopics.length > 0) {
    content += "📈 Trending Topics:\n";
    latestInfo.trendingTopics.forEach((topic, index) => {
      content += `• ${topic}`;
      if (citations?.trendingTopics[index]) {
        content += ` ${citations.trendingTopics[index]}`;
      }
      content += '\n';
    });
    content += "\n";
  }

  // Add best practices with citations
  if (latestInfo.bestPractices && latestInfo.bestPractices.length > 0) {
    content += "✨ Current Best Practices:\n";
    latestInfo.bestPractices.forEach((practice, index) => {
      content += `• ${practice}`;
      if (citations?.bestPractices[index]) {
        content += ` ${citations.bestPractices[index]}`;
      }
      content += '\n';
    });
    content += "\n";
  }

  // Add resources
  if (latestInfo.resources && latestInfo.resources.length > 0) {
    content += "📚 Recommended Resources:\n";
    latestInfo.resources.forEach(resource => {
      content += `• ${resource.title} - ${resource.url}\n`;
    });
  }

  // Format sources for grounding
  const sources = latestInfo.resources?.map(resource => ({
    title: resource.title,
    url: resource.url,
    snippet: resource.description || ''
  })) || [];

  return {
    content,
    sources
  };
} 