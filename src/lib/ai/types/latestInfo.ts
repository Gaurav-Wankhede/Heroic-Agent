export interface DomainLatestInfo {
  keyDevelopments?: string[];
  trendingTopics?: string[];
  bestPractices?: string[];
  resources?: {
    title: string;
    url: string;
    description?: string;
  }[];
  lastUpdated?: string;
}

export interface LatestInfoResponse {
  content: string;
  groundingMetadata: {
    webSearchSources: {
      title: string;
      url: string;
      snippet: string;
    }[];
  };
} 