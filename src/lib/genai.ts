import { GoogleGenerativeAI } from '@google/generative-ai';

// Extend Window interface to include ENV
declare global {
  interface Window {
    ENV?: {
      GEMINI_API_KEY?: string;
    };
  }
}

// Cache for initialized AI instance
let cachedAI: GoogleGenerativeAI | null = null;

// Initialize Gemini AI with error handling and caching
export async function initializeGenAI(): Promise<GoogleGenerativeAI | null> {
  if (cachedAI) return cachedAI;

  const apiKey = process.env.GEMINI_API_KEY || 
                 process.env.NEXT_PUBLIC_GEMINI_API_KEY || 
                 window?.ENV?.GEMINI_API_KEY;

  if (!apiKey) {
    console.warn('GEMINI_API_KEY environment variable is not set.');
    return null;
  }

  try {
    cachedAI = new GoogleGenerativeAI(apiKey);
    return cachedAI;
  } catch (error) {
    console.error('Error initializing Gemini AI:', error);
    return null;
  }
}

// Export a function to check if Gemini AI is properly initialized
export async function isGenAIInitialized(): Promise<boolean> {
  const instance = await initializeGenAI();
  return instance !== null;
}

// Model configuration for Gemini 2.0 Flash with enhanced capabilities
const MODEL_CONFIG = {
  model: 'gemini-2.0-flash',
  temperature: 0.2,
  topK: 30,
  topP: 0.85,
  maxOutputTokens: 4096,
  systemInstruction: `You are an expert at analyzing and understanding documents, images, and text content.
For documents:
- Identify key sections, headers, and structure
- Extract main topics and themes
- Recognize formatting and styling
- Understand document hierarchy

For images:
- Describe visual elements in detail
- Identify objects, text, and symbols
- Analyze composition and layout
- Recognize patterns and relationships

For text:
- Perform semantic analysis
- Identify key concepts and entities
- Understand context and relationships
- Extract structured information`
};

// Get model instance with specific configuration
export async function getModel() {
  const instance = await initializeGenAI();
  if (!instance) {
    throw new Error('AI service not initialized');
  }
  
  return instance.getGenerativeModel({
    model: MODEL_CONFIG.model,
    generationConfig: {
      temperature: MODEL_CONFIG.temperature,
      topK: MODEL_CONFIG.topK,
      topP: MODEL_CONFIG.topP,
      maxOutputTokens: MODEL_CONFIG.maxOutputTokens
    }
  });
}

// File type configurations with analysis hints
const FILE_TYPE_CONFIG = {
  // SQL files
  'text/x-sql': {
    extensions: ['.sql'],
    contextBuilder: (content: string) => ({
      type: 'SQL',
      analysis: analyzeSQL(content)
    })
  },
  // Text files
  'text/plain': {
    extensions: ['.txt'],
    contextBuilder: (content: string) => ({
      type: 'Text',
      analysis: analyzeTextContent(content)
    })
  },
  'text/markdown': {
    extensions: ['.md'],
    contextBuilder: (content: string) => ({
      type: 'Markdown',
      analysis: analyzeMarkdown(content)
    })
  },
  'application/json': {
    extensions: ['.json'],
    contextBuilder: (content: string) => ({
      type: 'JSON',
      analysis: analyzeJSON(content)
    })
  },
  'text/csv': {
    extensions: ['.csv'],
    contextBuilder: (content: string) => ({
      type: 'CSV',
      analysis: analyzeCSV(content)
    })
  },
  // PDFs
  'application/pdf': {
    extensions: ['.pdf'],
    contextBuilder: (content: string) => ({
      type: 'PDF',
      analysis: analyzePDFContent(content)
    })
  },
  // Images
  'image/jpeg': {
    extensions: ['.jpg', '.jpeg'],
    contextBuilder: null
  },
  'image/png': {
    extensions: ['.png'],
    contextBuilder: null
  },
  'image/gif': {
    extensions: ['.gif'],
    contextBuilder: null
  },
  'image/webp': {
    extensions: ['.webp'],
    contextBuilder: null
  }
} as const;

// Content analysis functions
function analyzeSQL(content: string) {
  const analysis = {
    type: 'SQL',
    operations: [] as string[],
    tables: new Set<string>(),
    hasTransactions: false,
    hasJoins: false,
    hasSubqueries: false
  };

  // Detect SQL operations
  if (content.match(/SELECT/i)) analysis.operations.push('SELECT');
  if (content.match(/INSERT/i)) analysis.operations.push('INSERT');
  if (content.match(/UPDATE/i)) analysis.operations.push('UPDATE');
  if (content.match(/DELETE/i)) analysis.operations.push('DELETE');
  if (content.match(/CREATE/i)) analysis.operations.push('CREATE');
  if (content.match(/ALTER/i)) analysis.operations.push('ALTER');

  // Detect tables
  const tableMatches = content.match(/(?:FROM|JOIN|UPDATE|INTO)\s+(\w+)/gi);
  if (tableMatches) {
    tableMatches.forEach(match => {
      const table = match.split(/\s+/)[1];
      analysis.tables.add(table);
    });
  }

  // Detect other features
  analysis.hasTransactions = /BEGIN|COMMIT|ROLLBACK/i.test(content);
  analysis.hasJoins = /JOIN/i.test(content);
  analysis.hasSubqueries = /\(\s*SELECT/i.test(content);

  return analysis;
}

function analyzeTextContent(content: string) {
  const lines = content.split('\n');
  const words = content.split(/\s+/);
  
  return {
    type: 'Text',
    structure: {
      lineCount: lines.length,
      wordCount: words.length,
      paragraphCount: content.split(/\n\s*\n/).length,
      averageLineLength: words.length / lines.length
    },
    semantics: {
      hasCode: /[{};()=]/.test(content),
      hasList: /^[-*•]\s/m.test(content),
      hasNumbers: /\d+/.test(content),
      hasUrls: /https?:\/\/[^\s]+/.test(content)
    },
    format: detectTextFormat(content),
    language: detectLanguage(content),
    complexity: analyzeTextComplexity(content)
  };
}

function analyzeMarkdown(content: string) {
  return {
    type: 'Markdown',
    structure: {
      headers: {
        h1: (content.match(/^# .+$/gm) || []).length,
        h2: (content.match(/^## .+$/gm) || []).length,
        h3: (content.match(/^### .+$/gm) || []).length
      },
      codeBlocks: {
        total: (content.match(/```[\s\S]*?```/g) || []).length,
        languages: extractCodeLanguages(content)
      },
      lists: {
        unordered: (content.match(/^[-*] .+$/gm) || []).length,
        ordered: (content.match(/^\d+\. .+$/gm) || []).length
      }
    },
    elements: {
      links: extractLinks(content),
      images: extractImages(content),
      tables: (content.match(/\|.*\|/g) || []).length > 0
    },
    metadata: extractFrontMatter(content)
  };
}

function analyzeJSON(content: string) {
  try {
    const parsed = JSON.parse(content);
    return {
      type: 'JSON',
      validation: {
        isValid: true,
        schema: inferJSONSchema(parsed)
      },
      structure: {
        depth: getJSONDepth(parsed),
        keyCount: countKeys(parsed),
        arrayLengths: getArrayLengths(parsed)
      },
      patterns: {
        hasNesting: hasNestedObjects(parsed),
        hasArrays: hasArrayStructures(parsed),
        dataTypes: getUniqueDataTypes(parsed)
      }
    };
  } catch (e) {
    return {
      type: 'JSON',
      validation: {
        isValid: false,
        error: e instanceof Error ? e.message : 'Invalid JSON'
      }
    };
  }
}

function analyzeCSV(content: string) {
  const lines = content.trim().split('\n');
  return {
    type: 'CSV',
    headers: lines[0]?.split(',').map(h => h.trim()),
    rowCount: lines.length - 1,
    columnCount: lines[0]?.split(',').length
  };
}

function analyzePDFContent(content: string) {
  return {
    type: 'PDF',
    textContent: content,
    hasText: content.length > 0
  };
}

// Helper functions
function detectTextFormat(content: string) {
  if (/^[\s\S]*?(?:SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER)[\s\S]*$/i.test(content)) return 'SQL';
  if (/^[\s\S]*?<[^>]+>[\s\S]*$/i.test(content)) return 'HTML/XML';
  if (/^[\s\S]*?function[\s\S]*$/i.test(content)) return 'Code';
  return 'Plain Text';
}

function detectLanguage(content: string): string {
  // Simple language detection based on common patterns
  if (/^(const|let|var|function|class|import|export)\s/.test(content)) return 'JavaScript/TypeScript';
  if (/^(def|class|import|from|print)\s/.test(content)) return 'Python';
  if (/^(public|private|class|interface|package)\s/.test(content)) return 'Java';
  if (/^(#include|int|void|struct)\s/.test(content)) return 'C/C++';
  return 'Plain Text';
}

function analyzeTextComplexity(content: string) {
  const sentences = content.split(/[.!?]+/);
  const words = content.split(/\s+/);
  
  return {
    averageWordLength: words.reduce((sum, word) => sum + word.length, 0) / words.length,
    averageSentenceLength: words.length / sentences.length,
    uniqueWords: new Set(words.map(w => w.toLowerCase())).size
  };
}

function extractCodeLanguages(content: string): string[] {
  const languages = new Set<string>();
  const matches = content.match(/```(\w+)\n/g);
  if (matches) {
    matches.forEach(match => {
      const lang = match.replace(/```|\n/g, '').trim();
      if (lang) languages.add(lang);
    });
  }
  return Array.from(languages);
}

function extractLinks(content: string): { text: string, url: string }[] {
  const links: { text: string, url: string }[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = linkPattern.exec(content)) !== null) {
    links.push({
      text: match[1],
      url: match[2]
    });
  }
  
  return links;
}

function extractImages(content: string): { alt: string, src: string }[] {
  const images: { alt: string, src: string }[] = [];
  const imagePattern = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  
  while ((match = imagePattern.exec(content)) !== null) {
    images.push({
      alt: match[1],
      src: match[2]
    });
  }
  
  return images;
}

function extractFrontMatter(content: string): Record<string, any> {
  const frontMatterPattern = /^---\n([\s\S]*?)\n---/;
  const match = content.match(frontMatterPattern);
  
  if (match) {
    try {
      const lines = match[1].split('\n');
      const frontMatter: Record<string, any> = {};
      
      lines.forEach(line => {
        const [key, ...values] = line.split(':');
        if (key && values.length) {
          frontMatter[key.trim()] = values.join(':').trim();
        }
      });
      
      return frontMatter;
    } catch (e) {
      return {};
    }
  }
  
  return {};
}

// JSON Analysis Helper Functions
function inferJSONSchema(obj: any, depth = 0): any {
  if (depth > 10) return { type: 'unknown', note: 'max depth exceeded' };
  
  if (Array.isArray(obj)) {
    const sampleItem = obj[0];
    return {
      type: 'array',
      items: sampleItem ? inferJSONSchema(sampleItem, depth + 1) : { type: 'unknown' },
      length: obj.length
    };
  }
  
  if (obj === null) return { type: 'null' };
  
  if (typeof obj === 'object') {
    const properties: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      properties[key] = inferJSONSchema(value, depth + 1);
    }
    return {
      type: 'object',
      properties
    };
  }
  
  return { type: typeof obj };
}

function getJSONDepth(obj: any, current = 0): number {
  if (!obj || typeof obj !== 'object') return current;
  
  let maxDepth = current;
  if (Array.isArray(obj)) {
    obj.forEach(item => {
      maxDepth = Math.max(maxDepth, getJSONDepth(item, current + 1));
    });
  } else {
    Object.values(obj).forEach(value => {
      maxDepth = Math.max(maxDepth, getJSONDepth(value, current + 1));
    });
  }
  
  return maxDepth;
}

function countKeys(obj: any): number {
  if (!obj || typeof obj !== 'object') return 0;
  
  let count = Object.keys(obj).length;
  Object.values(obj).forEach(value => {
    if (typeof value === 'object' && value !== null) {
      count += countKeys(value);
    }
  });
  
  return count;
}

function getArrayLengths(obj: any): number[] {
  const lengths: number[] = [];
  
  function traverse(value: any) {
    if (Array.isArray(value)) {
      lengths.push(value.length);
      value.forEach(traverse);
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(traverse);
    }
  }
  
  traverse(obj);
  return lengths;
}

function hasNestedObjects(obj: any): boolean {
  if (Array.isArray(obj)) {
    return obj.some(item => typeof item === 'object' && item !== null);
  }
  
  return Object.values(obj).some(value => 
    typeof value === 'object' && value !== null
  );
}

function hasArrayStructures(obj: any): boolean {
  if (Array.isArray(obj)) return true;
  
  if (typeof obj === 'object' && obj !== null) {
    return Object.values(obj).some(hasArrayStructures);
  }
  
  return false;
}

function getUniqueDataTypes(obj: any): Set<string> {
  const types = new Set<string>();
  
  function traverse(value: any) {
    if (value === null) {
      types.add('null');
    } else if (Array.isArray(value)) {
      types.add('array');
      value.forEach(traverse);
    } else if (typeof value === 'object') {
      types.add('object');
      Object.values(value).forEach(traverse);
    } else {
      types.add(typeof value);
    }
  }
  
  traverse(obj);
  return types;
}
