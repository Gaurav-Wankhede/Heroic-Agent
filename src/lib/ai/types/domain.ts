export interface DomainLatestInfo {
  keyDevelopments: string[];
  trendingTopics: string[];
  bestPractices: string[];
  resources: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
  lastUpdated: string;
}

export interface DomainConfig {
  name: string;
  description: string;
  capabilities: string[];
  examples: string[];
  relatedDomains?: string[];
  info: {
    prompt: string;
    keywords: string[];
  };
  url: string;
}

export interface ValidatedSource {
  title: string;
  url: string;
  description?: string;
  content?: string;
  relevanceScore: number;
  date?: string;
}

export interface DomainInfo extends DomainConfig {
  latestInfo?: DomainLatestInfo;
} 