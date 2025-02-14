export type DomainInfo = {
  prompt: string;
  keywords: string[];
};

export type DomainConfig = {
  info: DomainInfo;
  url: string;
};

export interface DomainLatestInfo {
  features: Array<{ text: string; source?: string }>;
  tools: Array<{ text: string; source?: string }>;
  integrations: Array<{ text: string; source?: string }>;
  trends: Array<{ text: string; source?: string }>;
  news: Array<{ text: string; source: string; date: string }>;
} 