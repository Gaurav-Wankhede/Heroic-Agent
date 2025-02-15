// Custom error types for different scenarios
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

export class ScrapingError extends Error {
  constructor(message: string, public url?: string) {
    super(message);
    this.name = 'ScrapingError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class FileOperationError extends Error {
  constructor(message: string, public path?: string) {
    super(message);
    this.name = 'FileOperationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string, public retryAfter?: number) {
    super(message);
    this.name = 'RateLimitError';
  }
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error metadata interface
export interface ErrorMetadata {
  timestamp: number;
  severity: ErrorSeverity;
  code?: string;
  source?: string;
  context?: Record<string, unknown>;
}

// Error response interface
export interface ErrorResponse {
  error: {
    message: string;
    type: string;
    severity: ErrorSeverity;
    code?: string;
    details?: Record<string, unknown>;
  };
  success: false;
}

// Error handler class
export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: Array<{ error: Error; metadata: ErrorMetadata }> = [];

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error and return a formatted error response
   */
  public handleError(error: Error, metadata: Partial<ErrorMetadata> = {}): ErrorResponse {
    const fullMetadata: ErrorMetadata = {
      timestamp: Date.now(),
      severity: metadata.severity || this.determineSeverity(error),
      ...metadata
    };

    // Log the error
    this.logError(error, fullMetadata);

    // Create error response
    return this.createErrorResponse(error, fullMetadata);
  }

  /**
   * Determine error severity based on error type and context
   */
  private determineSeverity(error: Error): ErrorSeverity {
    if (error instanceof RateLimitError) {
      return ErrorSeverity.HIGH;
    }
    if (error instanceof NetworkError) {
      return ErrorSeverity.MEDIUM;
    }
    if (error instanceof ValidationError) {
      return ErrorSeverity.LOW;
    }
    if (error instanceof FileOperationError) {
      return ErrorSeverity.MEDIUM;
    }
    if (error instanceof ScrapingError) {
      return ErrorSeverity.LOW;
    }
    if (error instanceof DomainError) {
      return ErrorSeverity.MEDIUM;
    }
    return ErrorSeverity.MEDIUM;
  }

  /**
   * Log error with metadata
   */
  private logError(error: Error, metadata: ErrorMetadata): void {
    // Add to in-memory log
    this.errorLog.push({ error, metadata });

    // Log to console with metadata
    console.error('Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      metadata
    });

    // Could add additional logging here (e.g., to a service)
  }

  /**
   * Create a formatted error response
   */
  private createErrorResponse(error: Error, metadata: ErrorMetadata): ErrorResponse {
    const baseResponse: ErrorResponse = {
      error: {
        message: error.message,
        type: error.name,
        severity: metadata.severity,
        code: metadata.code,
        details: {}
      },
      success: false
    };

    // Add error-specific details
    if (error instanceof ScrapingError && error.url) {
      baseResponse.error.details!.url = error.url;
    }
    if (error instanceof ValidationError && error.field) {
      baseResponse.error.details!.field = error.field;
    }
    if (error instanceof FileOperationError && error.path) {
      baseResponse.error.details!.path = error.path;
    }
    if (error instanceof NetworkError && error.statusCode) {
      baseResponse.error.details!.statusCode = error.statusCode;
    }
    if (error instanceof RateLimitError && error.retryAfter) {
      baseResponse.error.details!.retryAfter = error.retryAfter;
    }
    if (metadata.context) {
      baseResponse.error.details = {
        ...baseResponse.error.details,
        ...metadata.context
      };
    }

    return baseResponse;
  }

  /**
   * Get recent errors
   */
  public getRecentErrors(limit: number = 10): Array<{ error: Error; metadata: ErrorMetadata }> {
    return this.errorLog.slice(-limit);
  }

  /**
   * Clear error log
   */
  public clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Create a user-friendly error message
   */
  public createUserMessage(error: Error): string {
    if (error instanceof DomainError) {
      return `Sorry, there was an issue with the domain: ${error.message}`;
    }
    if (error instanceof ScrapingError) {
      return `Unable to fetch information${error.url ? ` from ${error.url}` : ''}: ${error.message}`;
    }
    if (error instanceof ValidationError) {
      return `Invalid input${error.field ? ` for ${error.field}` : ''}: ${error.message}`;
    }
    if (error instanceof FileOperationError) {
      return `File operation failed${error.path ? ` for ${error.path}` : ''}: ${error.message}`;
    }
    if (error instanceof NetworkError) {
      return `Network error${error.statusCode ? ` (${error.statusCode})` : ''}: ${error.message}`;
    }
    if (error instanceof RateLimitError) {
      return `Rate limit exceeded. ${error.retryAfter ? `Please try again in ${error.retryAfter} seconds.` : 'Please try again later.'}`;
    }
    return `An unexpected error occurred: ${error.message}`;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance(); 