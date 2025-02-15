export interface GroundingMetadata {
  webSearchSources?: Array<{
    title: string;
    url: string;
    snippet?: string;
    relevanceScore?: number;
    date?: string;
  }>;
  citations?: string[];
  score?: number;
  temporalContext?: {
    currentDate: string;
    domain: string;
    lastInteraction?: string;
    priority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    categories?: string[];
    includesDate?: boolean;
    lastUpdate?: string;
    newsCategories?: Array<'features' | 'security' | 'performance' | 'api' | 'community' | 'ecosystem' | 'trends'>;
    timeframe?: 'immediate' | 'recent' | 'weekly' | 'monthly';
  };
} 