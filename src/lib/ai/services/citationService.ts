import { Citation } from '../../../components/chat/Citation';

/**
 * Interface representing a source with its metadata and relevance information.
 * 
 * @interface Source
 * @property {string} url - The URL of the source
 * @property {string} title - The title of the source
 * @property {string} description - A brief description of the source content
 * @property {string} content - The full content of the source
 * @property {number} score - The quality score of the source (0-1)
 * @property {number} relevance - The relevance score of the source (0-1)
 * @property {object} metadata - Additional metadata about the source
 * @property {string} metadata.date - The publication date of the source
 * @property {string} [metadata.author] - The author of the source
 * @property {string} [metadata.language] - The language of the source
 * @property {number} [metadata.wordCount] - The word count of the source
 * @property {number} [metadata.readingTime] - The estimated reading time in minutes
 */
export interface Source {
  url: string;
  title: string;
  description: string;
  content: string;
  score: number;
  relevance: number;
  metadata: {
    date: string;
    author?: string;
    language?: string;
    wordCount?: number;
    readingTime?: number;
  };
}

/**
 * Type defining the available citation styles.
 * 
 * @typedef {('inline' | 'footnote' | 'endnote')} CitationStyle
 */
export type CitationStyle = 'inline' | 'footnote' | 'endnote';

/**
 * Interface for citation formatting options.
 * 
 * @interface CitationOptions
 * @property {number} [maxCitations] - Maximum number of citations to include
 * @property {CitationStyle} [style] - Style to use for citations
 * @property {boolean} [includeMetadata] - Whether to include metadata
 * @property {boolean} [formatMarkdown] - Whether to format as markdown
 */
export interface CitationOptions {
  maxCitations?: number;
  style?: CitationStyle;
  includeMetadata?: boolean;
  formatMarkdown?: boolean;
}

/**
 * Default options for citation formatting.
 * 
 * @constant DEFAULT_OPTIONS
 * @type {Required<CitationOptions>}
 */
const DEFAULT_OPTIONS: Required<CitationOptions> = {
  maxCitations: 10,
  style: 'inline',
  includeMetadata: true,
  formatMarkdown: true
};

/**
 * Service responsible for formatting citations and managing source metadata.
 * Implements the singleton pattern to ensure consistent formatting across the application.
 * 
 * @class CitationService
 */
export class CitationService {
  /** Singleton instance of the CitationService */
  private static instance: CitationService;

  /**
   * Private constructor to prevent direct instantiation.
   * Use {@link CitationService.getInstance} instead.
   * 
   * @private
   * @constructor
   */
  private constructor() {}

  /**
   * Gets the singleton instance of the CitationService.
   * Creates a new instance if one doesn't exist.
   * 
   * @static
   * @returns {CitationService} The singleton instance
   */
  public static getInstance(): CitationService {
    if (!CitationService.instance) {
      CitationService.instance = new CitationService();
    }
    return CitationService.instance;
  }

  /**
   * Formats sources with citations according to the specified options.
   * 
   * @public
   * @param {Source[]} sources - The sources to format
   * @param {Partial<CitationOptions>} [options] - Options for formatting
   * @returns {string} The formatted content with citations
   */
  public formatSourcesWithCitations(
    sources: Source[],
    options: Partial<CitationOptions> = {}
  ): string {
    const fullOptions = { ...DEFAULT_OPTIONS, ...options };
    let content = '';

    // Sort sources by relevance and score
    const sortedSources = this.sortSources(sources);

    // Limit citations
    const limitedSources = sortedSources.slice(0, fullOptions.maxCitations);

    // Format based on citation style
    switch (fullOptions.style) {
      case 'inline':
        content = this.formatInlineCitations(limitedSources);
        break;
      case 'footnote':
        content = this.formatFootnoteCitations(limitedSources);
        break;
      case 'endnote':
        content = this.formatEndnoteCitations(limitedSources);
        break;
      default:
        content = this.formatInlineCitations(limitedSources);
    }

    // Add metadata if requested
    if (fullOptions.includeMetadata) {
      content += this.formatMetadata(sources);
    }

    // Format markdown if requested
    if (fullOptions.formatMarkdown) {
      content = this.formatMarkdown(content);
    }

    return content;
  }

  /**
   * Sorts sources by their combined relevance and quality score.
   * 
   * @private
   * @param {Source[]} sources - The sources to sort
   * @returns {Source[]} The sorted sources
   */
  private sortSources(sources: Source[]): Source[] {
    return [...sources].sort((a, b) => {
      const scoreA = (a.score + a.relevance) / 2;
      const scoreB = (b.score + b.relevance) / 2;
      return scoreB - scoreA;
    });
  }

  /**
   * Formats sources using inline citation style.
   * Example: [1] Title\nDescription\nSource: URL
   * 
   * @private
   * @param {Source[]} sources - The sources to format
   * @returns {string} The formatted content
   */
  private formatInlineCitations(sources: Source[]): string {
    let content = '';
    sources.forEach((source, index) => {
      content += `[${index + 1}] ${source.title}\n`;
      content += `${source.description}\n`;
      content += `Source: ${source.url}\n\n`;
    });
    return content;
  }

  /**
   * Formats sources using footnote citation style.
   * Example: Title [1]\nDescription\n\nFootnotes:\n[1] URL
   * 
   * @private
   * @param {Source[]} sources - The sources to format
   * @returns {string} The formatted content
   */
  private formatFootnoteCitations(sources: Source[]): string {
    let content = '';
    let footnotes = '\nFootnotes:\n';
    sources.forEach((source, index) => {
      content += `${source.title} [${index + 1}]\n`;
      content += `${source.description}\n\n`;
      footnotes += `[${index + 1}] ${source.url}\n`;
    });
    return content + footnotes;
  }

  /**
   * Formats sources using endnote citation style.
   * Example: Title [1]\nDescription\n\nReferences:\n[1] Title. URL
   * 
   * @private
   * @param {Source[]} sources - The sources to format
   * @returns {string} The formatted content
   */
  private formatEndnoteCitations(sources: Source[]): string {
    let content = '';
    let endnotes = '\nReferences:\n';
    sources.forEach((source, index) => {
      content += `${source.title} [${index + 1}]\n`;
      content += `${source.description}\n\n`;
      endnotes += `[${index + 1}] ${source.title}. ${source.url}\n`;
    });
    return content + endnotes;
  }

  /**
   * Formats source metadata into a readable summary.
   * 
   * @private
   * @param {Source[]} sources - The sources to format metadata for
   * @returns {string} The formatted metadata
   */
  private formatMetadata(sources: Source[]): string {
    const totalSources = sources.length;
    const validSources = sources.filter(s => s.score >= 0.6).length;
    const averageScore = sources.reduce((acc, s) => acc + s.score, 0) / totalSources;

    return `\nMetadata:\n` +
      `- Total Sources: ${totalSources}\n` +
      `- Valid Sources: ${validSources}\n` +
      `- Average Score: ${(averageScore * 100).toFixed(1)}%\n`;
  }

  /**
   * Formats content with markdown syntax.
   * 
   * @private
   * @param {string} content - The content to format
   * @returns {string} The markdown formatted content
   */
  private formatMarkdown(content: string): string {
    return content
      .replace(/^# (.*$)/gm, '# $1')
      .replace(/^## (.*$)/gm, '## $1')
      .replace(/^### (.*$)/gm, '### $1')
      .replace(/\*\*(.*?)\*\*/g, '**$1**')
      .replace(/\*(.*?)\*/g, '*$1*')
      .replace(/`(.*?)`/g, '`$1`')
      .replace(/\[(.*?)\]\((.*?)\)/g, '[$1]($2)');
  }
}

// Export singleton instance
export const citationService = CitationService.getInstance(); 