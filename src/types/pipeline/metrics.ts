export interface PipelineMetrics {
  startTime: number;
  searchTime: number;
  linkScrapingTime: number;
  contentScrapingTime: number;
  processingTime: number;
  groundingTime: number;
  totalTime: number;
  searchResults: number;
  linksFound: number;
  validLinks: number;
  sourcesProcessed: number;
  groundedSources: number;
  errors: {
    search?: string;
    linkScraping?: string;
    contentScraping?: string;
    grounding?: string;
    processing?: string;
  };
} 