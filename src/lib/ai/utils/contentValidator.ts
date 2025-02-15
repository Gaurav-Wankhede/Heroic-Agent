import { ValidationError } from './errorHandler';
import { calculateSimilarity, SimilarityAlgorithm } from './similarity';
import { DOMAIN_CONFIG } from '../config/domains';

// Content validation options
export interface ContentValidationOptions {
  minLength?: number;
  maxLength?: number;
  minWords?: number;
  maxWords?: number;
  minSentences?: number;
  maxSentences?: number;
  minParagraphs?: number;
  maxParagraphs?: number;
  requiredKeywords?: string[];
  forbiddenKeywords?: string[];
  languageCode?: string;
  readabilityLevel?: ReadabilityLevel;
  contentType?: ContentType;
  qualityThreshold?: number;
  domainRelevanceThreshold?: number;
  allowHtml?: boolean;
  allowMarkdown?: boolean;
  allowEmoji?: boolean;
  maxConsecutiveChars?: number;
  maxLineLength?: number;
  spamThreshold?: number;
}

// Readability levels
export enum ReadabilityLevel {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  TECHNICAL = 'technical'
}

// Content types
export enum ContentType {
  ARTICLE = 'article',
  BLOG = 'blog',
  DOCUMENTATION = 'documentation',
  TUTORIAL = 'tutorial',
  NEWS = 'news',
  REFERENCE = 'reference'
}

// Default options
const DEFAULT_OPTIONS: Required<ContentValidationOptions> = {
  minLength: 100,
  maxLength: 100000,
  minWords: 20,
  maxWords: 10000,
  minSentences: 2,
  maxSentences: 1000,
  minParagraphs: 1,
  maxParagraphs: 100,
  requiredKeywords: [],
  forbiddenKeywords: [],
  languageCode: 'en',
  readabilityLevel: ReadabilityLevel.INTERMEDIATE,
  contentType: ContentType.ARTICLE,
  qualityThreshold: 0.7,
  domainRelevanceThreshold: 0.6,
  allowHtml: false,
  allowMarkdown: true,
  allowEmoji: true,
  maxConsecutiveChars: 3,
  maxLineLength: 120,
  spamThreshold: 0.3
};

// Content validation result
export interface ContentValidationResult {
  isValid: boolean;
  score: number;
  issues: ContentIssue[];
  metadata: ContentMetadata;
}

// Content issue
export interface ContentIssue {
  type: ContentIssueType;
  message: string;
  severity: IssueSeverity;
  location?: {
    line: number;
    column: number;
    length: number;
  };
  suggestion?: string;
}

// Content issue types
export enum ContentIssueType {
  LENGTH = 'length',
  WORDS = 'words',
  SENTENCES = 'sentences',
  PARAGRAPHS = 'paragraphs',
  KEYWORDS = 'keywords',
  LANGUAGE = 'language',
  READABILITY = 'readability',
  QUALITY = 'quality',
  RELEVANCE = 'relevance',
  FORMAT = 'format',
  SPAM = 'spam'
}

// Issue severity levels
export enum IssueSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

// Content metadata
export interface ContentMetadata {
  length: number;
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  readabilityScore: number;
  qualityScore: number;
  relevanceScore: number;
  spamScore: number;
  keywords: string[];
  language: string;
  readingTime: number;
}

/**
 * Content Validator class
 */
export class ContentValidator {
  private static instance: ContentValidator;

  private constructor() {}

  public static getInstance(): ContentValidator {
    if (!ContentValidator.instance) {
      ContentValidator.instance = new ContentValidator();
    }
    return ContentValidator.instance;
  }

  /**
   * Validate content with options
   */
  public validateContent(
    content: string,
    domain: string,
    options: Partial<ContentValidationOptions> = {}
  ): ContentValidationResult {
    try {
      const fullOptions = { ...DEFAULT_OPTIONS, ...options };
      const issues: ContentIssue[] = [];
      
      // Get domain config
      const domainConfig = DOMAIN_CONFIG.get(domain);
      if (!domainConfig) {
        throw new ValidationError(`Invalid domain: ${domain}`);
      }

      // Extract metadata
      const metadata = this.extractMetadata(content, domain);

      // Validate length
      if (metadata.length < fullOptions.minLength) {
        issues.push({
          type: ContentIssueType.LENGTH,
          message: `Content is too short (${metadata.length} chars). Minimum is ${fullOptions.minLength} chars.`,
          severity: IssueSeverity.ERROR
        });
      }
      if (metadata.length > fullOptions.maxLength) {
        issues.push({
          type: ContentIssueType.LENGTH,
          message: `Content is too long (${metadata.length} chars). Maximum is ${fullOptions.maxLength} chars.`,
          severity: IssueSeverity.ERROR
        });
      }

      // Validate word count
      if (metadata.wordCount < fullOptions.minWords) {
        issues.push({
          type: ContentIssueType.WORDS,
          message: `Too few words (${metadata.wordCount}). Minimum is ${fullOptions.minWords} words.`,
          severity: IssueSeverity.ERROR
        });
      }
      if (metadata.wordCount > fullOptions.maxWords) {
        issues.push({
          type: ContentIssueType.WORDS,
          message: `Too many words (${metadata.wordCount}). Maximum is ${fullOptions.maxWords} words.`,
          severity: IssueSeverity.ERROR
        });
      }

      // Validate sentence count
      if (metadata.sentenceCount < fullOptions.minSentences) {
        issues.push({
          type: ContentIssueType.SENTENCES,
          message: `Too few sentences (${metadata.sentenceCount}). Minimum is ${fullOptions.minSentences} sentences.`,
          severity: IssueSeverity.ERROR
        });
      }
      if (metadata.sentenceCount > fullOptions.maxSentences) {
        issues.push({
          type: ContentIssueType.SENTENCES,
          message: `Too many sentences (${metadata.sentenceCount}). Maximum is ${fullOptions.maxSentences} sentences.`,
          severity: IssueSeverity.ERROR
        });
      }

      // Validate paragraph count
      if (metadata.paragraphCount < fullOptions.minParagraphs) {
        issues.push({
          type: ContentIssueType.PARAGRAPHS,
          message: `Too few paragraphs (${metadata.paragraphCount}). Minimum is ${fullOptions.minParagraphs} paragraphs.`,
          severity: IssueSeverity.ERROR
        });
      }
      if (metadata.paragraphCount > fullOptions.maxParagraphs) {
        issues.push({
          type: ContentIssueType.PARAGRAPHS,
          message: `Too many paragraphs (${metadata.paragraphCount}). Maximum is ${fullOptions.maxParagraphs} paragraphs.`,
          severity: IssueSeverity.ERROR
        });
      }

      // Validate required keywords
      const missingKeywords = fullOptions.requiredKeywords.filter(
        keyword => !content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (missingKeywords.length > 0) {
        issues.push({
          type: ContentIssueType.KEYWORDS,
          message: `Missing required keywords: ${missingKeywords.join(', ')}`,
          severity: IssueSeverity.ERROR
        });
      }

      // Validate forbidden keywords
      const foundForbiddenKeywords = fullOptions.forbiddenKeywords.filter(
        keyword => content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (foundForbiddenKeywords.length > 0) {
        issues.push({
          type: ContentIssueType.KEYWORDS,
          message: `Found forbidden keywords: ${foundForbiddenKeywords.join(', ')}`,
          severity: IssueSeverity.ERROR
        });
      }

      // Validate readability
      const readabilityThresholds = {
        [ReadabilityLevel.BASIC]: 80,
        [ReadabilityLevel.INTERMEDIATE]: 60,
        [ReadabilityLevel.ADVANCED]: 40,
        [ReadabilityLevel.TECHNICAL]: 30
      };
      if (metadata.readabilityScore < readabilityThresholds[fullOptions.readabilityLevel]) {
        issues.push({
          type: ContentIssueType.READABILITY,
          message: `Readability score (${metadata.readabilityScore}) is below threshold for ${fullOptions.readabilityLevel} level`,
          severity: IssueSeverity.WARNING
        });
      }

      // Validate quality
      if (metadata.qualityScore < fullOptions.qualityThreshold) {
        issues.push({
          type: ContentIssueType.QUALITY,
          message: `Content quality score (${metadata.qualityScore}) is below threshold (${fullOptions.qualityThreshold})`,
          severity: IssueSeverity.WARNING
        });
      }

      // Validate domain relevance
      if (metadata.relevanceScore < fullOptions.domainRelevanceThreshold) {
        issues.push({
          type: ContentIssueType.RELEVANCE,
          message: `Domain relevance score (${metadata.relevanceScore}) is below threshold (${fullOptions.domainRelevanceThreshold})`,
          severity: IssueSeverity.WARNING
        });
      }

      // Validate format
      if (!fullOptions.allowHtml && /<[^>]*>/g.test(content)) {
        issues.push({
          type: ContentIssueType.FORMAT,
          message: 'HTML tags are not allowed',
          severity: IssueSeverity.ERROR
        });
      }

      // Validate consecutive characters
      const consecutiveCharsRegex = new RegExp(`(.)\\1{${fullOptions.maxConsecutiveChars},}`);
      if (consecutiveCharsRegex.test(content)) {
        issues.push({
          type: ContentIssueType.QUALITY,
          message: `Found more than ${fullOptions.maxConsecutiveChars} consecutive identical characters`,
          severity: IssueSeverity.WARNING
        });
      }

      // Validate line length
      const longLines = content.split('\n').filter(line => line.length > fullOptions.maxLineLength);
      if (longLines.length > 0) {
        issues.push({
          type: ContentIssueType.FORMAT,
          message: `Found ${longLines.length} lines exceeding maximum length of ${fullOptions.maxLineLength} characters`,
          severity: IssueSeverity.WARNING
        });
      }

      // Validate spam score
      if (metadata.spamScore > fullOptions.spamThreshold) {
        issues.push({
          type: ContentIssueType.SPAM,
          message: `Spam score (${metadata.spamScore}) exceeds threshold (${fullOptions.spamThreshold})`,
          severity: IssueSeverity.ERROR
        });
      }

      // Calculate overall score
      const score = this.calculateOverallScore(metadata, issues);

      return {
        isValid: !issues.some(issue => issue.severity === IssueSeverity.ERROR),
        score,
        issues,
        metadata
      };

    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError(`Failed to validate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract content metadata
   */
  private extractMetadata(content: string, domain: string): ContentMetadata {
    const cleanContent = content.trim();
    const words = cleanContent.split(/\s+/);
    const sentences = cleanContent.split(/[.!?]+/);
    const paragraphs = cleanContent.split(/\n\s*\n/);
    
    // Calculate readability score (Flesch-Kincaid)
    const readabilityScore = this.calculateReadabilityScore(cleanContent);
    
    // Calculate quality score
    const qualityScore = this.calculateQualityScore(cleanContent);
    
    // Calculate domain relevance
    const relevanceScore = this.calculateDomainRelevance(cleanContent, domain);
    
    // Calculate spam score
    const spamScore = this.calculateSpamScore(cleanContent);
    
    // Extract keywords
    const keywords = this.extractKeywords(cleanContent);
    
    // Detect language (simple implementation)
    const language = this.detectLanguage(cleanContent);
    
    // Calculate reading time (words per minute)
    const WPM = 200;
    const readingTime = Math.ceil(words.length / WPM);

    return {
      length: cleanContent.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      paragraphCount: paragraphs.length,
      readabilityScore,
      qualityScore,
      relevanceScore,
      spamScore,
      keywords,
      language,
      readingTime
    };
  }

  /**
   * Calculate readability score (Flesch-Kincaid)
   */
  private calculateReadabilityScore(content: string): number {
    const words = content.split(/\s+/);
    const sentences = content.split(/[.!?]+/);
    const syllables = this.countSyllables(content);
    
    const wordsPerSentence = words.length / sentences.length;
    const syllablesPerWord = syllables / words.length;
    
    // Flesch-Kincaid formula
    const score = 206.835 - (1.015 * wordsPerSentence) - (84.6 * syllablesPerWord);
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Count syllables in text
   */
  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    return words.reduce((count, word) => {
      return count + this.countWordSyllables(word);
    }, 0);
  }

  /**
   * Count syllables in a word
   */
  private countWordSyllables(word: string): number {
    word = word.toLowerCase().replace(/[^a-z]/g, '');
    if (word.length <= 3) return 1;
    
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    
    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  }

  /**
   * Calculate quality score
   */
  private calculateQualityScore(content: string): number {
    let score = 1;
    
    // Penalize for excessive punctuation
    const punctuationRatio = (content.match(/[!?.,;:]/g) || []).length / content.length;
    if (punctuationRatio > 0.1) {
      score -= 0.1;
    }
    
    // Penalize for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.3) {
      score -= 0.1;
    }
    
    // Penalize for repetitive words
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    const maxFreq = Math.max(...wordFreq.values());
    if (maxFreq > words.length * 0.1) {
      score -= 0.1;
    }
    
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate domain relevance
   */
  private calculateDomainRelevance(content: string, domain: string): number {
    const domainConfig = DOMAIN_CONFIG.get(domain);
    if (!domainConfig) return 0;

    const contentLower = content.toLowerCase();
    const keywordMatches = domainConfig.info.keywords.filter(keyword => 
      contentLower.includes(keyword.toLowerCase())
    );

    return keywordMatches.length / domainConfig.info.keywords.length;
  }

  /**
   * Calculate spam score
   */
  private calculateSpamScore(content: string): number {
    let score = 0;
    
    // Check for excessive punctuation
    const punctuationRatio = (content.match(/[!?.,;:]/g) || []).length / content.length;
    score += punctuationRatio;
    
    // Check for excessive capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    score += capsRatio;
    
    // Check for repetitive words
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });
    const maxFreq = Math.max(...wordFreq.values());
    score += maxFreq / words.length;
    
    // Check for spam keywords
    const spamKeywords = ['buy now', 'click here', 'free', 'guarantee', 'limited time'];
    const spamKeywordCount = spamKeywords.filter(keyword => 
      content.toLowerCase().includes(keyword)
    ).length;
    score += spamKeywordCount * 0.1;
    
    return Math.min(1, score / 4);
  }

  /**
   * Extract keywords from content
   */
  private extractKeywords(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    
    // Count word frequencies
    const wordFreq = new Map<string, number>();
    words.forEach(word => {
      if (!stopWords.has(word) && word.length > 2) {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      }
    });
    
    // Sort by frequency
    return Array.from(wordFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Detect language (simple implementation)
   */
  private detectLanguage(content: string): string {
    // This is a very basic implementation
    // In a real application, you would use a proper language detection library
    return 'en';
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(
    metadata: ContentMetadata,
    issues: ContentIssue[]
  ): number {
    let score = 1;
    
    // Weight different factors
    score *= metadata.qualityScore * 0.3;
    score *= metadata.relevanceScore * 0.3;
    score *= (1 - metadata.spamScore) * 0.2;
    score *= (metadata.readabilityScore / 100) * 0.2;
    
    // Penalize for issues
    const issuePenalties = {
      [IssueSeverity.ERROR]: 0.3,
      [IssueSeverity.WARNING]: 0.1,
      [IssueSeverity.INFO]: 0.05
    };
    
    issues.forEach(issue => {
      score -= issuePenalties[issue.severity];
    });
    
    return Math.max(0, Math.min(1, score));
  }
}

// Export singleton instance
export const contentValidator = ContentValidator.getInstance(); 