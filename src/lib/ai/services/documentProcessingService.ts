import { FileContext } from '../utils/fileContext';
import { getDocumentType } from '../utils/fileValidation';
import { FileHandlingService } from './fileHandlingService';
import { getModel } from '@/lib/genai';

export interface DocumentProcessingResult {
  success: boolean;
  content?: string;
  error?: string;
  metadata?: {
    type: string;
    pageCount?: number;
    wordCount?: number;
    language?: string;
    topics?: string[];
  };
}

export class DocumentProcessingService {
  private static instance: DocumentProcessingService;
  private fileHandler: FileHandlingService;

  private constructor() {
    this.fileHandler = FileHandlingService.getInstance();
  }

  public static getInstance(): DocumentProcessingService {
    if (!DocumentProcessingService.instance) {
      DocumentProcessingService.instance = new DocumentProcessingService();
    }
    return DocumentProcessingService.instance;
  }

  public async processDocument(fileContext: FileContext): Promise<DocumentProcessingResult> {
    try {
      const docType = getDocumentType(fileContext.type);
      let content = fileContext.content;

      // Get the model instance
      const model = await getModel('gemini-pro');
      if (!model) {
        return {
          success: false,
          error: 'AI model not available'
        };
      }

      // Process based on document type
      switch (docType) {
        case 'document':
          return this.processPDFDocument(content, model);
        case 'image':
          return this.processImageDocument(content, model);
        case 'text':
          return this.processTextDocument(content, model);
        default:
          return {
            success: false,
            error: 'Unsupported document type'
          };
      }
    } catch (error) {
      console.error('Error processing document:', error);
      return {
        success: false,
        error: 'Failed to process document'
      };
    }
  }

  private async processPDFDocument(content: string, model: any): Promise<DocumentProcessingResult> {
    const prompt = `Analyze this PDF document content and provide:
1. Main topics covered
2. Key points
3. Document structure
4. Relevant context

Content: ${content.substring(0, 1000)}...`;

    try {
      const result = await model?.generateContent(prompt);
      const analysis = result?.response?.text() || '';

      return {
        success: true,
        content: analysis,
        metadata: {
          type: 'pdf',
          pageCount: this.estimatePageCount(content),
          wordCount: content.split(/\s+/).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to process PDF document'
      };
    }
  }

  private async processImageDocument(content: string, model: any): Promise<DocumentProcessingResult> {
    const prompt = `Analyze this image and provide:
1. Main topics
2. Key points
3. Summary
4. Context
5. Important details

Image: ${content.substring(0, 1000)}...`;

    try {
      const result = await model?.generateContent(prompt);
      const analysis = result?.response?.text() || '';

      return {
        success: true,
        content: analysis,
        metadata: {
          type: 'image',
          wordCount: analysis.split(/\s+/).length,
          language: this.detectLanguage(analysis)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to process image document'
      };
    }
  }

  private async processTextDocument(content: string, model: any): Promise<DocumentProcessingResult> {
    const prompt = `Analyze this text document and provide:
1. Main topics
2. Key points
3. Summary
4. Context
5. Important details

Text: ${content.substring(0, 1000)}...`;

    try {
      const result = await model?.generateContent(prompt);
      const analysis = result?.response?.text() || '';

      return {
        success: true,
        content: analysis,
        metadata: {
          type: 'text',
          wordCount: content.split(/\s+/).length,
          language: this.detectLanguage(content)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to process text document'
      };
    }
  }

  private estimatePageCount(content: string): number {
    const CHARS_PER_PAGE = 3000;
    return Math.ceil(content.length / CHARS_PER_PAGE);
  }

  private detectLanguage(content: string): string {
    // Simple language detection - can be enhanced with a proper language detection library
    const commonPatterns = {
      python: /\b(def|class|import|from|if __name__ == ['"]__main__['"])\b/,
      javascript: /\b(function|const|let|var|import|export)\b/,
      html: /<[^>]*>/,
      css: /[.#][\w-]+\s*\{/,
      markdown: /^#+ |^[-*] |\[.*\]\(.*\)/m
    };

    for (const [lang, pattern] of Object.entries(commonPatterns)) {
      if (pattern.test(content)) return lang;
    }

    return 'unknown';
  }
} 