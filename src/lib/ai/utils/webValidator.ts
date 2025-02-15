import { ValidationError } from './errorHandler';
import { linkValidator, LinkValidationOptions, LinkValidationResult } from './linkValidator';
import { contentValidator, ContentValidationOptions, ContentValidationResult } from './contentValidator';
import axios from 'axios';
import { JSDOM } from 'jsdom';

// Web validation options
export interface WebValidationOptions {
  linkValidation?: Partial<LinkValidationOptions>;
  contentValidation?: Partial<ContentValidationOptions>;
  validateSecurity?: boolean;
  validateAccessibility?: boolean;
  validateSEO?: boolean;
  validatePerformance?: boolean;
  validateStructure?: boolean;
  minImageAltText?: boolean;
  requireMetaTags?: boolean;
  requireOpenGraph?: boolean;
  requireTwitterCards?: boolean;
  maxLoadTime?: number;
  minHeadingLevel?: number;
  maxHeadingLevel?: number;
  requireFavicon?: boolean;
  requireManifest?: boolean;
  requireServiceWorker?: boolean;
  validateSchemaOrg?: boolean;
  validateAMP?: boolean;
  validateCSP?: boolean;
  validateHSTS?: boolean;
  validateCORS?: boolean;
}

// Web validation result
export interface WebValidationResult {
  isValid: boolean;
  score: number;
  issues: WebIssue[];
  metadata: WebMetadata;
  linkValidation?: LinkValidationResult;
  contentValidation?: ContentValidationResult;
}

// Web issue
export interface WebIssue {
  type: WebIssueType;
  message: string;
  severity: IssueSeverity;
  code?: string;
  location?: {
    tag: string;
    line: number;
    column: number;
  };
  suggestion?: string;
}

// Web issue types
export enum WebIssueType {
  SECURITY = 'security',
  ACCESSIBILITY = 'accessibility',
  SEO = 'seo',
  PERFORMANCE = 'performance',
  STRUCTURE = 'structure',
  HEADERS = 'headers',
  METADATA = 'metadata',
  STANDARDS = 'standards'
}

// Issue severity levels
export enum IssueSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

// Web metadata
export interface WebMetadata {
  url: string;
  title: string;
  description: string;
  language: string;
  charset: string;
  viewport: string;
  author: string;
  keywords: string[];
  openGraph: {
    title?: string;
    description?: string;
    image?: string;
    url?: string;
    type?: string;
    siteName?: string;
  };
  twitter: {
    card?: string;
    site?: string;
    creator?: string;
    title?: string;
    description?: string;
    image?: string;
  };
  schemaOrg: any[];
  headers: Record<string, string>;
  loadTime: number;
  size: number;
  resourceCounts: {
    scripts: number;
    styles: number;
    images: number;
    fonts: number;
    iframes: number;
  };
  securityHeaders: {
    csp?: string;
    hsts?: string;
    xfo?: string;
    referrerPolicy?: string;
    permissions?: string;
  };
}

// Default options
const DEFAULT_OPTIONS: Required<WebValidationOptions> = {
  linkValidation: {},
  contentValidation: {},
  validateSecurity: true,
  validateAccessibility: true,
  validateSEO: true,
  validatePerformance: true,
  validateStructure: true,
  minImageAltText: true,
  requireMetaTags: true,
  requireOpenGraph: false,
  requireTwitterCards: false,
  maxLoadTime: 5000,
  minHeadingLevel: 1,
  maxHeadingLevel: 6,
  requireFavicon: true,
  requireManifest: false,
  requireServiceWorker: false,
  validateSchemaOrg: false,
  validateAMP: false,
  validateCSP: true,
  validateHSTS: true,
  validateCORS: true
};

/**
 * Web Validator class
 */
export class WebValidator {
  private static instance: WebValidator;

  private constructor() {}

  public static getInstance(): WebValidator {
    if (!WebValidator.instance) {
      WebValidator.instance = new WebValidator();
    }
    return WebValidator.instance;
  }

  /**
   * Validate web page with options
   */
  public async validateWeb(
    url: string,
    domain: string,
    options: Partial<WebValidationOptions> = {}
  ): Promise<WebValidationResult> {
    try {
      const fullOptions = { ...DEFAULT_OPTIONS, ...options };
      const issues: WebIssue[] = [];
      
      // Start timing
      const startTime = Date.now();

      // Validate link first
      const linkResult = await linkValidator.validateLink(url, domain, fullOptions.linkValidation);
      if (!linkResult.isValid) {
        return {
          isValid: false,
          score: 0,
          issues: [{
            type: WebIssueType.STANDARDS,
            message: 'Link validation failed',
            severity: IssueSeverity.ERROR
          }],
          metadata: await this.createEmptyMetadata(),
          linkValidation: linkResult
        };
      }

      // Fetch and parse web page
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'HeroicAgent/1.0'
        }
      });

      const loadTime = Date.now() - startTime;
      const dom = new JSDOM(response.data);
      const document = dom.window.document;

      // Extract metadata
      const metadata = await this.extractMetadata(document, response, loadTime);

      // Validate content if enabled
      let contentResult: ContentValidationResult | undefined;
      if (Object.keys(fullOptions.contentValidation).length > 0) {
        contentResult = contentValidator.validateContent(
          this.extractMainContent(document),
          domain,
          fullOptions.contentValidation
        );
        if (!contentResult.isValid) {
          issues.push({
            type: WebIssueType.STANDARDS,
            message: 'Content validation failed',
            severity: IssueSeverity.ERROR
          });
        }
      }

      // Validate security
      if (fullOptions.validateSecurity) {
        this.validateSecurity(metadata, issues);
      }

      // Validate accessibility
      if (fullOptions.validateAccessibility) {
        this.validateAccessibility(document, issues);
      }

      // Validate SEO
      if (fullOptions.validateSEO) {
        this.validateSEO(document, metadata, issues);
      }

      // Validate performance
      if (fullOptions.validatePerformance) {
        this.validatePerformance(metadata, loadTime, fullOptions.maxLoadTime, issues);
      }

      // Validate structure
      if (fullOptions.validateStructure) {
        this.validateStructure(document, fullOptions, issues);
      }

      // Calculate overall score
      const score = this.calculateOverallScore(metadata, issues);

      return {
        isValid: !issues.some(issue => issue.severity === IssueSeverity.ERROR),
        score,
        issues,
        metadata,
        linkValidation: linkResult,
        contentValidation: contentResult
      };

    } catch (error) {
      if (error instanceof ValidationError) throw error;
      throw new ValidationError(`Failed to validate web page: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract metadata from document
   */
  private async extractMetadata(
    document: Document,
    response: any,
    loadTime: number
  ): Promise<WebMetadata> {
    const head = document.head;
    const metaTags = head.getElementsByTagName('meta');

    // Extract basic metadata
    const metadata: WebMetadata = {
      url: response.config.url,
      title: document.title,
      description: this.getMetaContent(metaTags, 'description') || '',
      language: document.documentElement.lang || 'en',
      charset: document.characterSet || 'UTF-8',
      viewport: this.getMetaContent(metaTags, 'viewport') || '',
      author: this.getMetaContent(metaTags, 'author') || '',
      keywords: this.getMetaContent(metaTags, 'keywords')?.split(',').map(k => k.trim()) || [],
      openGraph: this.extractOpenGraph(metaTags),
      twitter: this.extractTwitterCards(metaTags),
      schemaOrg: this.extractSchemaOrg(document),
      headers: response.headers,
      loadTime,
      size: response.data.length,
      resourceCounts: this.countResources(document),
      securityHeaders: this.extractSecurityHeaders(response.headers)
    };

    return metadata;
  }

  /**
   * Create empty metadata for failed validations
   */
  private async createEmptyMetadata(): Promise<WebMetadata> {
    return {
      url: '',
      title: '',
      description: '',
      language: '',
      charset: '',
      viewport: '',
      author: '',
      keywords: [],
      openGraph: {},
      twitter: {},
      schemaOrg: [],
      headers: {},
      loadTime: 0,
      size: 0,
      resourceCounts: {
        scripts: 0,
        styles: 0,
        images: 0,
        fonts: 0,
        iframes: 0
      },
      securityHeaders: {}
    };
  }

  /**
   * Get meta tag content
   */
  private getMetaContent(metaTags: HTMLCollectionOf<HTMLMetaElement>, name: string): string | null {
    const tag = Array.from(metaTags).find(tag => 
      tag.getAttribute('name') === name || 
      tag.getAttribute('property') === name
    );
    return tag?.getAttribute('content') || null;
  }

  /**
   * Extract Open Graph metadata
   */
  private extractOpenGraph(metaTags: HTMLCollectionOf<HTMLMetaElement>) {
    const og: WebMetadata['openGraph'] = {};
    Array.from(metaTags).forEach(tag => {
      const property = tag.getAttribute('property');
      if (property?.startsWith('og:')) {
        const key = property.substring(3) as keyof typeof og;
        og[key] = tag.getAttribute('content') || undefined;
      }
    });
    return og;
  }

  /**
   * Extract Twitter Card metadata
   */
  private extractTwitterCards(metaTags: HTMLCollectionOf<HTMLMetaElement>) {
    const twitter: WebMetadata['twitter'] = {};
    Array.from(metaTags).forEach(tag => {
      const name = tag.getAttribute('name');
      if (name?.startsWith('twitter:')) {
        const key = name.substring(8) as keyof typeof twitter;
        twitter[key] = tag.getAttribute('content') || undefined;
      }
    });
    return twitter;
  }

  /**
   * Extract Schema.org metadata
   */
  private extractSchemaOrg(document: Document): any[] {
    const schemas: any[] = [];
    const scriptTags = document.getElementsByTagName('script');
    
    Array.from(scriptTags).forEach(tag => {
      if (tag.type === 'application/ld+json') {
        try {
          const schema = JSON.parse(tag.textContent || '');
          schemas.push(schema);
        } catch {
          // Ignore invalid JSON
        }
      }
    });
    
    return schemas;
  }

  /**
   * Count resources
   */
  private countResources(document: Document) {
    return {
      scripts: document.getElementsByTagName('script').length,
      styles: document.getElementsByTagName('link').length + document.getElementsByTagName('style').length,
      images: document.getElementsByTagName('img').length,
      fonts: Array.from(document.getElementsByTagName('link'))
        .filter(link => link.rel === 'stylesheet' && link.href.match(/fonts/)).length,
      iframes: document.getElementsByTagName('iframe').length
    };
  }

  /**
   * Extract security headers
   */
  private extractSecurityHeaders(headers: Record<string, string>) {
    return {
      csp: headers['content-security-policy'],
      hsts: headers['strict-transport-security'],
      xfo: headers['x-frame-options'],
      referrerPolicy: headers['referrer-policy'],
      permissions: headers['permissions-policy']
    };
  }

  /**
   * Extract main content
   */
  private extractMainContent(document: Document): string {
    // Try to find main content area
    const main = document.querySelector('main') ||
                document.querySelector('article') ||
                document.querySelector('#main') ||
                document.querySelector('#content') ||
                document.body;
    
    return main?.textContent?.trim() || '';
  }

  /**
   * Validate security
   */
  private validateSecurity(metadata: WebMetadata, issues: WebIssue[]) {
    const { securityHeaders } = metadata;

    if (!securityHeaders.csp) {
      issues.push({
        type: WebIssueType.SECURITY,
        message: 'Missing Content Security Policy header',
        severity: IssueSeverity.WARNING,
        suggestion: 'Add a Content-Security-Policy header to prevent XSS attacks'
      });
    }

    if (!securityHeaders.hsts) {
      issues.push({
        type: WebIssueType.SECURITY,
        message: 'Missing HTTP Strict Transport Security header',
        severity: IssueSeverity.WARNING,
        suggestion: 'Add a Strict-Transport-Security header to enforce HTTPS'
      });
    }

    if (!securityHeaders.xfo) {
      issues.push({
        type: WebIssueType.SECURITY,
        message: 'Missing X-Frame-Options header',
        severity: IssueSeverity.WARNING,
        suggestion: 'Add an X-Frame-Options header to prevent clickjacking'
      });
    }
  }

  /**
   * Validate accessibility
   */
  private validateAccessibility(document: Document, issues: WebIssue[]) {
    // Check for alt text on images
    const images = document.getElementsByTagName('img');
    Array.from(images).forEach((img, index) => {
      if (!img.alt) {
        issues.push({
          type: WebIssueType.ACCESSIBILITY,
          message: `Image missing alt text`,
          severity: IssueSeverity.WARNING,
          location: {
            tag: 'img',
            line: 0, // Would need source mapping for actual line numbers
            column: 0
          },
          suggestion: 'Add descriptive alt text to the image'
        });
      }
    });

    // Check for form labels
    const inputs = document.getElementsByTagName('input');
    Array.from(inputs).forEach((input, index) => {
      if (!input.id || !document.querySelector(`label[for="${input.id}"]`)) {
        issues.push({
          type: WebIssueType.ACCESSIBILITY,
          message: 'Form input missing associated label',
          severity: IssueSeverity.WARNING,
          location: {
            tag: 'input',
            line: 0,
            column: 0
          },
          suggestion: 'Add a label element with matching "for" attribute'
        });
      }
    });

    // Check heading hierarchy
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    let lastLevel = 0;
    headings.forEach(heading => {
      const level = parseInt(heading.tagName[1]);
      if (level - lastLevel > 1) {
        issues.push({
          type: WebIssueType.ACCESSIBILITY,
          message: `Skipped heading level from h${lastLevel} to h${level}`,
          severity: IssueSeverity.WARNING,
          location: {
            tag: heading.tagName.toLowerCase(),
            line: 0,
            column: 0
          },
          suggestion: 'Maintain a proper heading hierarchy'
        });
      }
      lastLevel = level;
    });
  }

  /**
   * Validate SEO
   */
  private validateSEO(document: Document, metadata: WebMetadata, issues: WebIssue[]) {
    // Check title
    if (!metadata.title) {
      issues.push({
        type: WebIssueType.SEO,
        message: 'Missing page title',
        severity: IssueSeverity.ERROR,
        suggestion: 'Add a descriptive title tag'
      });
    } else if (metadata.title.length < 10 || metadata.title.length > 60) {
      issues.push({
        type: WebIssueType.SEO,
        message: `Title length (${metadata.title.length}) outside recommended range (10-60)`,
        severity: IssueSeverity.WARNING,
        suggestion: 'Adjust title length to between 10 and 60 characters'
      });
    }

    // Check description
    if (!metadata.description) {
      issues.push({
        type: WebIssueType.SEO,
        message: 'Missing meta description',
        severity: IssueSeverity.WARNING,
        suggestion: 'Add a meta description tag'
      });
    } else if (metadata.description.length < 50 || metadata.description.length > 160) {
      issues.push({
        type: WebIssueType.SEO,
        message: `Description length (${metadata.description.length}) outside recommended range (50-160)`,
        severity: IssueSeverity.WARNING,
        suggestion: 'Adjust description length to between 50 and 160 characters'
      });
    }

    // Check headings
    if (!document.querySelector('h1')) {
      issues.push({
        type: WebIssueType.SEO,
        message: 'Missing H1 heading',
        severity: IssueSeverity.WARNING,
        suggestion: 'Add a primary H1 heading'
      });
    }

    // Check keywords
    if (metadata.keywords.length === 0) {
      issues.push({
        type: WebIssueType.SEO,
        message: 'Missing meta keywords',
        severity: IssueSeverity.INFO,
        suggestion: 'Consider adding meta keywords'
      });
    }
  }

  /**
   * Validate performance
   */
  private validatePerformance(
    metadata: WebMetadata,
    loadTime: number,
    maxLoadTime: number,
    issues: WebIssue[]
  ) {
    if (loadTime > maxLoadTime) {
      issues.push({
        type: WebIssueType.PERFORMANCE,
        message: `Load time (${loadTime}ms) exceeds maximum (${maxLoadTime}ms)`,
        severity: IssueSeverity.WARNING,
        suggestion: 'Optimize page load time'
      });
    }

    const { resourceCounts } = metadata;
    
    if (resourceCounts.scripts > 20) {
      issues.push({
        type: WebIssueType.PERFORMANCE,
        message: `High number of scripts (${resourceCounts.scripts})`,
        severity: IssueSeverity.WARNING,
        suggestion: 'Consider reducing the number of script tags'
      });
    }

    if (resourceCounts.styles > 10) {
      issues.push({
        type: WebIssueType.PERFORMANCE,
        message: `High number of stylesheets (${resourceCounts.styles})`,
        severity: IssueSeverity.WARNING,
        suggestion: 'Consider consolidating stylesheets'
      });
    }

    if (metadata.size > 5 * 1024 * 1024) { // 5MB
      issues.push({
        type: WebIssueType.PERFORMANCE,
        message: `Large page size (${Math.round(metadata.size / 1024 / 1024)}MB)`,
        severity: IssueSeverity.WARNING,
        suggestion: 'Optimize and compress page content'
      });
    }
  }

  /**
   * Validate structure
   */
  private validateStructure(
    document: Document,
    options: Required<WebValidationOptions>,
    issues: WebIssue[]
  ) {
    // Check document structure
    if (!document.querySelector('header')) {
      issues.push({
        type: WebIssueType.STRUCTURE,
        message: 'Missing header element',
        severity: IssueSeverity.INFO,
        suggestion: 'Add a semantic header element'
      });
    }

    if (!document.querySelector('main')) {
      issues.push({
        type: WebIssueType.STRUCTURE,
        message: 'Missing main element',
        severity: IssueSeverity.INFO,
        suggestion: 'Add a semantic main element'
      });
    }

    if (!document.querySelector('footer')) {
      issues.push({
        type: WebIssueType.STRUCTURE,
        message: 'Missing footer element',
        severity: IssueSeverity.INFO,
        suggestion: 'Add a semantic footer element'
      });
    }

    // Check heading levels
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      const level = parseInt(heading.tagName[1]);
      if (level < options.minHeadingLevel) {
        issues.push({
          type: WebIssueType.STRUCTURE,
          message: `Heading level ${level} below minimum (${options.minHeadingLevel})`,
          severity: IssueSeverity.WARNING,
          location: {
            tag: heading.tagName.toLowerCase(),
            line: 0,
            column: 0
          }
        });
      }
      if (level > options.maxHeadingLevel) {
        issues.push({
          type: WebIssueType.STRUCTURE,
          message: `Heading level ${level} above maximum (${options.maxHeadingLevel})`,
          severity: IssueSeverity.WARNING,
          location: {
            tag: heading.tagName.toLowerCase(),
            line: 0,
            column: 0
          }
        });
      }
    });

    // Check favicon
    if (options.requireFavicon && !document.querySelector('link[rel="icon"]')) {
      issues.push({
        type: WebIssueType.STRUCTURE,
        message: 'Missing favicon',
        severity: IssueSeverity.INFO,
        suggestion: 'Add a favicon link tag'
      });
    }

    // Check manifest
    if (options.requireManifest && !document.querySelector('link[rel="manifest"]')) {
      issues.push({
        type: WebIssueType.STRUCTURE,
        message: 'Missing web app manifest',
        severity: IssueSeverity.INFO,
        suggestion: 'Add a web app manifest for PWA support'
      });
    }
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(
    metadata: WebMetadata,
    issues: WebIssue[]
  ): number {
    let score = 1;

    // Penalize based on issues
    const penalties = {
      [IssueSeverity.ERROR]: 0.4,
      [IssueSeverity.WARNING]: 0.2,
      [IssueSeverity.INFO]: 0.1
    };

    issues.forEach(issue => {
      score -= penalties[issue.severity];
    });

    // Adjust for performance
    if (metadata.loadTime > 2000) {
      score -= 0.1;
    }

    // Bonus for good practices
    if (metadata.securityHeaders.csp) score += 0.1;
    if (metadata.securityHeaders.hsts) score += 0.1;
    if (metadata.openGraph.title) score += 0.05;
    if (metadata.twitter.card) score += 0.05;
    if (metadata.schemaOrg.length > 0) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }
}

// Export singleton instance
export const webValidator = WebValidator.getInstance(); 