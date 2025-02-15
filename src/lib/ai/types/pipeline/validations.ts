export interface LinkValidationResult {
  isValid: boolean;
  statusCode?: number;
  error?: string;
}

export interface WebValidationResult {
  isValid: boolean;
  contentType?: string;
  error?: string;
}

export interface ContentValidationResult {
  isValid: boolean;
  wordCount?: number;
  readingTime?: number;
  error?: string;
}

export interface ValidationResults {
  link?: LinkValidationResult;
  web?: WebValidationResult;
  content?: ContentValidationResult;
} 