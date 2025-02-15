import { ValidationError } from './errorHandler';
import { calculateSimilarity, SimilarityAlgorithm } from './similarity';
import axios from 'axios';
import { URL } from 'url';

// Link validation options
export interface LinkValidationOptions {
  timeout?: number;
  maxRedirects?: number;
  validateSSL?: boolean;
  checkBlacklist?: boolean;
  checkWhitelist?: boolean;
  domainRelevanceThreshold?: number;
  allowedProtocols?: string[];
  allowedDomains?: string[];
  blockedDomains?: string[];
  maxResponseSize?: number;
  requireCanonical?: boolean;
  checkBrokenLinks?: boolean;
  validateRobotsTxt?: boolean;
  userAgent?: string;
}

// Link validation result
export interface LinkValidationResult {
  isValid: boolean;
  score: number;
  issues: LinkIssue[];
  metadata: LinkMetadata;
}

// Link issue
export interface LinkIssue {
  type: LinkIssueType;
  message: string;
  severity: IssueSeverity;
  code?: string;
  suggestion?: string;
}

// Link issue types
export enum LinkIssueType {
  PROTOCOL = 'protocol',
  DOMAIN = 'domain',
  STATUS = 'status',
  SSL = 'ssl',
  ROBOTS = 'robots',
  RELEVANCE = 'relevance',
  REDIRECT = 'redirect',
  RESPONSE = 'response',
  FORMAT = 'format'
}

// Issue severity levels
export enum IssueSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error'
}

// Link metadata
export interface LinkMetadata {
  url: string;
  normalizedUrl: string;
  protocol: string;
  domain: string;
  path: string;
  query: string;
  fragment: string;
  statusCode?: number;
  contentType?: string;
  contentLength?: number;
  lastModified?: string;
  redirectCount: number;
  redirectChain: string[];
  responseTime: number;
  isCanonical: boolean;
  robotsTxtStatus?: boolean;
}

// Default options
const DEFAULT_OPTIONS: Required<LinkValidationOptions> = {
  timeout: 10000,
  maxRedirects: 5,
  validateSSL: true,
  checkBlacklist: true,
  checkWhitelist: false,
  domainRelevanceThreshold: 0.6,
  allowedProtocols: ['http:', 'https:'],
  allowedDomains: [],
  blockedDomains: [],
  maxResponseSize: 10 * 1024 * 1024, // 10MB
  requireCanonical: false,
  checkBrokenLinks: true,
  validateRobotsTxt: true,
  userAgent: 'HeroicAgent/1.0'
};

/**
 * Link Validator class
 */
export class LinkValidator {
  private static instance: LinkValidator;
  private robotsTxtCache: Map<string, boolean> = new Map();

  private constructor() {}

  public static getInstance(): LinkValidator {
    if (!LinkValidator.instance) {
      LinkValidator.instance = new LinkValidator();
    }
    return LinkValidator.instance;
  }

  /**
   * Validate link with options
   */
  public async validateLink(
    url: string,
    domain: string,
    options: Partial<LinkValidationOptions> = {}
  ): Promise<LinkValidationResult> {
    try {
      const fullOptions = { ...DEFAULT_OPTIONS, ...options };
      const issues: LinkIssue[] = [];
      
      // Parse and normalize URL
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch (error) {
        throw new ValidationError(`Invalid URL format: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Initialize metadata
      const metadata: LinkMetadata = {
        url: url,
        normalizedUrl: this.normalizeUrl(url),
        protocol: parsedUrl.protocol,
        domain: parsedUrl.hostname,
        path: parsedUrl.pathname,
        query: parsedUrl.search,
        fragment: parsedUrl.hash,
        redirectCount: 0,
        redirectChain: [],
        responseTime: 0,
        isCanonical: false
      };

      // Validate protocol
      if (!fullOptions.allowedProtocols.includes(parsedUrl.protocol)) {
        issues.push({
          type: LinkIssueType.PROTOCOL,
          message: `Protocol '${parsedUrl.protocol}' is not allowed`,
          severity: IssueSeverity.ERROR,
          suggestion: `Use one of: ${fullOptions.allowedProtocols.join(', ')}`
        });
      }

      // Validate domain
      if (fullOptions.checkWhitelist && fullOptions.allowedDomains.length > 0) {
        const isAllowed = fullOptions.allowedDomains.some(domain => 
          parsedUrl.hostname.endsWith(domain)
        );
        if (!isAllowed) {
          issues.push({
            type: LinkIssueType.DOMAIN,
            message: `Domain '${parsedUrl.hostname}' is not in whitelist`,
            severity: IssueSeverity.ERROR,
            suggestion: `Use one of: ${fullOptions.allowedDomains.join(', ')}`
          });
        }
      }

      if (fullOptions.checkBlacklist && fullOptions.blockedDomains.length > 0) {
        const isBlocked = fullOptions.blockedDomains.some(domain => 
          parsedUrl.hostname.endsWith(domain)
        );
        if (isBlocked) {
          issues.push({
            type: LinkIssueType.DOMAIN,
            message: `Domain '${parsedUrl.hostname}' is blacklisted`,
            severity: IssueSeverity.ERROR
          });
        }
      }

      // Check robots.txt if enabled
      if (fullOptions.validateRobotsTxt) {
        const robotsAllowed = await this.checkRobotsTxt(parsedUrl.origin, parsedUrl.pathname, fullOptions);
        metadata.robotsTxtStatus = robotsAllowed;
        if (!robotsAllowed) {
          issues.push({
            type: LinkIssueType.ROBOTS,
            message: 'URL is disallowed by robots.txt',
            severity: IssueSeverity.WARNING
          });
        }
      }

      // Make HTTP request if no blocking issues
      if (!issues.some(issue => issue.severity === IssueSeverity.ERROR)) {
        try {
          const startTime = Date.now();
          const response = await axios.get(url, {
            timeout: fullOptions.timeout,
            maxRedirects: fullOptions.maxRedirects,
            validateStatus: null,
            maxContentLength: fullOptions.maxResponseSize,
            headers: {
              'User-Agent': fullOptions.userAgent
            }
          });
          metadata.responseTime = Date.now() - startTime;
          metadata.statusCode = response.status;
          metadata.contentType = response.headers['content-type'];
          metadata.contentLength = parseInt(response.headers['content-length'] || '0');
          metadata.lastModified = response.headers['last-modified'];
          metadata.redirectCount = response.request._redirectable._redirectCount || 0;
          metadata.redirectChain = response.request._redirectable._redirects.map((r: any) => r.url);
          metadata.isCanonical = this.isCanonicalUrl(response);

          // Validate response
          if (response.status >= 400) {
            issues.push({
              type: LinkIssueType.STATUS,
              message: `HTTP ${response.status} error`,
              severity: response.status >= 500 ? IssueSeverity.ERROR : IssueSeverity.WARNING,
              code: response.status.toString()
            });
          }

          if (metadata.redirectCount > 0) {
            issues.push({
              type: LinkIssueType.REDIRECT,
              message: `URL has ${metadata.redirectCount} redirect(s)`,
              severity: IssueSeverity.INFO,
              suggestion: `Consider using final URL: ${metadata.redirectChain[metadata.redirectChain.length - 1]}`
            });
          }

          if (fullOptions.requireCanonical && !metadata.isCanonical) {
            issues.push({
              type: LinkIssueType.FORMAT,
              message: 'URL is not canonical',
              severity: IssueSeverity.WARNING,
              suggestion: 'Use the canonical URL specified in the page'
            });
          }

        } catch (error) {
          if (axios.isAxiosError(error)) {
            issues.push({
              type: LinkIssueType.RESPONSE,
              message: `Failed to fetch URL: ${error.message}`,
              severity: IssueSeverity.ERROR,
              code: error.code
            });
          } else {
            throw error;
          }
        }
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
      throw new ValidationError(`Failed to validate link: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check robots.txt rules
   */
  private async checkRobotsTxt(
    origin: string,
    path: string,
    options: Required<LinkValidationOptions>
  ): Promise<boolean> {
    const robotsUrl = `${origin}/robots.txt`;
    const cacheKey = `${robotsUrl}|${path}`;

    // Check cache first
    if (this.robotsTxtCache.has(cacheKey)) {
      return this.robotsTxtCache.get(cacheKey)!;
    }

    try {
      const response = await axios.get(robotsUrl, {
        timeout: options.timeout,
        headers: {
          'User-Agent': options.userAgent
        }
      });

      if (response.status === 200) {
        const rules = this.parseRobotsTxt(response.data);
        const allowed = this.checkRobotsTxtRules(rules, path, options.userAgent);
        this.robotsTxtCache.set(cacheKey, allowed);
        return allowed;
      }

      // If no robots.txt or error, assume allowed
      return true;

    } catch (error) {
      // If can't fetch robots.txt, assume allowed
      return true;
    }
  }

  /**
   * Parse robots.txt content
   */
  private parseRobotsTxt(content: string): Array<{ userAgent: string; rules: Array<{ allow: boolean; path: string }> }> {
    const rules: Array<{ userAgent: string; rules: Array<{ allow: boolean; path: string }> }> = [];
    let currentUserAgent: string | null = null;
    let currentRules: Array<{ allow: boolean; path: string }> = [];

    content.split('\n').forEach(line => {
      line = line.trim().toLowerCase();
      if (!line || line.startsWith('#')) return;

      const [directive, ...value] = line.split(':').map(s => s.trim());
      const path = value.join(':');

      if (directive === 'user-agent') {
        if (currentUserAgent && currentRules.length > 0) {
          rules.push({ userAgent: currentUserAgent, rules: [...currentRules] });
        }
        currentUserAgent = path;
        currentRules = [];
      } else if (currentUserAgent) {
        if (directive === 'allow') {
          currentRules.push({ allow: true, path });
        } else if (directive === 'disallow') {
          currentRules.push({ allow: false, path });
        }
      }
    });

    if (currentUserAgent && currentRules.length > 0) {
      rules.push({ userAgent: currentUserAgent, rules: currentRules });
    }

    return rules;
  }

  /**
   * Check if path is allowed by robots.txt rules
   */
  private checkRobotsTxtRules(
    rules: Array<{ userAgent: string; rules: Array<{ allow: boolean; path: string }> }>,
    path: string,
    userAgent: string
  ): boolean {
    // Find matching user agent section
    const userAgentRules = rules.find(r => 
      userAgent.toLowerCase().includes(r.userAgent) || r.userAgent === '*'
    );

    if (!userAgentRules) return true;

    // Find most specific matching rule
    const matchingRules = userAgentRules.rules
      .filter(rule => path.startsWith(rule.path))
      .sort((a, b) => b.path.length - a.path.length);

    return matchingRules.length === 0 || matchingRules[0].allow;
  }

  /**
   * Check if URL is canonical
   */
  private isCanonicalUrl(response: any): boolean {
    const canonical = response.headers['link']?.match(/<([^>]+)>;\s*rel="canonical"/)?.[1];
    return !canonical || canonical === response.config.url;
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return `${parsed.protocol}//${parsed.host}${parsed.pathname}${parsed.search}`.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Calculate overall score
   */
  private calculateOverallScore(
    metadata: LinkMetadata,
    issues: LinkIssue[]
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

    // Adjust for response time (penalize slow responses)
    if (metadata.responseTime > 2000) {
      score -= 0.1;
    }

    // Adjust for redirects
    score -= metadata.redirectCount * 0.05;

    // Bonus for canonical URLs
    if (metadata.isCanonical) {
      score += 0.1;
    }

    // Bonus for robots.txt compliance
    if (metadata.robotsTxtStatus) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Clear robots.txt cache
   */
  public clearRobotsTxtCache(): void {
    this.robotsTxtCache.clear();
  }
}

// Export singleton instance
export const linkValidator = LinkValidator.getInstance(); 