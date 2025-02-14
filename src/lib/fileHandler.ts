import { Tool, Part } from '@google/generative-ai';
import { genAI } from './genai';
import type { GroundingMetadata } from '@/types/chat';

// File handling types
export interface FileUploadResponse {
  content: string;
  groundingMetadata: GroundingMetadata | null;
  fileAnalysis?: FileAnalysis;
}

export interface FileAnalysis {
  type: 'image' | 'audio' | 'video' | 'document' | 'data' | 'code' | 'notebook';
  analysis: string;
  metadata: Record<string, any>;
}

export interface GenerativePart {
  inlineData: {
    data: string;
    mimeType: string;
  };
}

export interface JupyterCell {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string[];
  metadata: any;
  execution_count?: number | null;
  outputs?: any[];
}

export interface JupyterNotebook {
  cells: JupyterCell[];
  metadata: any;
  nbformat: number;
  nbformat_minor: number;
}

// Enhanced file model configuration
export const FILE_MODEL_CONFIG = {
  text: {
    model: "models/gemini-2.0-flash",
    tools: [{
      google_search: {
        topK: 5,  // Limit search results for better relevance
        safeSearch: true
      }
    } as Tool],
    generationConfig: {
      maxOutputTokens: 4096,
      temperature: 0.4,  // Lower temperature for more precise analysis
      topK: 40,
      topP: 0.95,
    }
  },
  vision: {
    model: "models/gemini-2.0-flash",
    generationConfig: {
      temperature: 0.4,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 4096,
    },
    tools: [{
      google_search: {
        topK: 5,
        safeSearch: true
      }
    } as Tool]
  }
};

// Helper function to determine file type
function getFileType(mimeType: string): FileAnalysis['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('document')) return 'document';
  if (mimeType.includes('json') && mimeType.includes('notebook')) return 'notebook';
  if (mimeType.includes('json') || mimeType.includes('csv') || mimeType.includes('excel')) return 'data';
  return 'code';
}

// Enhanced file analysis utilities
export async function analyzeFileContent(file: File, domain: string): Promise<FileAnalysis> {
  const fileType = getFileType(file.type);
  const metadata: Record<string, any> = {
    name: file.name,
    size: file.size,
    type: file.type,
    lastModified: new Date(file.lastModified).toISOString()
  };

  // Specialized analysis based on file type
  switch (fileType) {
    case 'notebook':
      try {
        const content = await file.text();
        const notebook = JSON.parse(content);
        const notebookAnalysis = analyzeNotebookContent(notebook);
        return {
          type: fileType,
          analysis: notebookAnalysis.summary,
          metadata: {
            ...metadata,
            ...notebookAnalysis.details
          }
        };
      } catch (error) {
        console.error('Notebook analysis error:', error);
        throw new Error('Failed to analyze notebook file');
      }

    case 'code':
      try {
        const content = await file.text();
        const codeAnalysis = await analyzeCodeContent(content, domain);
        return {
          type: fileType,
          analysis: codeAnalysis.summary,
          metadata: {
            ...metadata,
            ...codeAnalysis.details
          }
        };
      } catch (error) {
        console.error('Code analysis error:', error);
        throw new Error('Failed to analyze code file');
      }

    case 'data':
      try {
        const content = await file.text();
        const dataAnalysis = await analyzeDataContent(content);
        return {
          type: fileType,
          analysis: dataAnalysis.summary,
          metadata: {
            ...metadata,
            ...dataAnalysis.details
          }
        };
      } catch (error) {
        console.error('Data analysis error:', error);
        throw new Error('Failed to analyze data file');
      }

    default:
      return {
        type: fileType,
        analysis: `Generic ${fileType} file analysis`,
        metadata
      };
  }
}

// New helper function for code analysis
async function analyzeCodeContent(content: string, domain: string) {
  const lines = content.split('\n');
  const imports = lines.filter(line => line.trim().startsWith('import') || line.trim().startsWith('from'));
  const functions = lines.filter(line => line.trim().startsWith('def ') || line.trim().startsWith('function '));
  const classes = lines.filter(line => line.trim().startsWith('class '));

  return {
    summary: `Code file analysis for ${domain}:\n` +
             `- ${imports.length} imports\n` +
             `- ${functions.length} functions\n` +
             `- ${classes.length} classes`,
    details: {
      lineCount: lines.length,
      imports: imports.map(imp => imp.trim()),
      functions: functions.length,
      classes: classes.length
    }
  };
}

// New helper function for data analysis
async function analyzeDataContent(content: string) {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const dataRows = lines.slice(1);
  
  // Sample data types from first row
  const dataTypes = dataRows[0].split(',').map(cell => {
    if (!isNaN(Number(cell))) return 'number';
    if (Date.parse(cell)) return 'date';
    return 'string';
  });

  return {
    summary: `Data file analysis:\n` +
             `- ${headers.length} columns\n` +
             `- ${dataRows.length} rows\n` +
             `- Data types: ${[...new Set(dataTypes)].join(', ')}`,
    details: {
      headers,
      rowCount: dataRows.length,
      dataTypes,
      sampleSize: Math.min(dataRows.length, 5)
    }
  };
}

// Enhanced file to generative part conversion
export async function fileToGenerativePart(file: File): Promise<GenerativePart> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64Content = reader.result.split(',')[1];
        resolve({
          inlineData: {
            data: base64Content,
            mimeType: file.type
          }
        });
      } else {
        reject(new Error('Failed to read file content'));
      }
    };

    reader.onerror = () => reject(new Error('File reading failed'));
    reader.readAsDataURL(file);
  });
}

// File analysis utilities
export function analyzeNotebookContent(notebook: JupyterNotebook): {
  summary: string;
  details: {
    imports: string[];
    dataProcessing: string[];
    modelDefinitions: string[];
    training: string[];
    evaluation: string[];
    visualization: string[];
  };
} {
  const details = {
    imports: [] as string[],
    dataProcessing: [] as string[],
    modelDefinitions: [] as string[],
    training: [] as string[],
    evaluation: [] as string[],
    visualization: [] as string[]
  };

  const keywords = {
    imports: ['import', 'from'],
    dataProcessing: ['pd.', 'numpy', 'preprocessing', 'transform', 'clean', 'drop', 'fillna'],
    modelDefinitions: ['class', 'def', 'model', 'sklearn', 'keras', 'torch'],
    training: ['fit', 'train', 'compile', 'optimizer', 'loss'],
    evaluation: ['score', 'accuracy', 'precision', 'recall', 'f1', 'confusion_matrix', 'classification_report'],
    visualization: ['plt.', 'seaborn', 'sns.', 'plot', 'figure', 'subplot']
  };

  notebook.cells.forEach(cell => {
    if (cell.cell_type === 'code') {
      const code = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      
      Object.entries(keywords).forEach(([category, categoryKeywords]) => {
        if (categoryKeywords.some(keyword => code.includes(keyword))) {
          details[category as keyof typeof details].push(code);
        }
      });
    }
  });

  const summary = `This notebook appears to be a machine learning project with:
${details.imports.length > 0 ? '- Library imports and setup\n' : ''}${
details.dataProcessing.length > 0 ? '- Data preprocessing and cleaning steps\n' : ''}${
details.modelDefinitions.length > 0 ? '- Model architecture definition\n' : ''}${
details.training.length > 0 ? '- Model training process\n' : ''}${
details.evaluation.length > 0 ? '- Model evaluation and metrics\n' : ''}${
details.visualization.length > 0 ? '- Data visualization and results analysis\n' : ''}`;

  return { summary, details };
}

export function extractCodeContext(notebook: JupyterNotebook, query: string): string {
  const relevantCells: string[] = [];
  const queryLower = query.toLowerCase();

  notebook.cells.forEach((cell, index) => {
    if (cell.cell_type === 'code') {
      const code = Array.isArray(cell.source) ? cell.source.join('') : cell.source;
      const codeLower = code.toLowerCase();

      const isRelevant = 
        codeLower.includes(queryLower) ||
        (queryLower.includes('model') && codeLower.includes('model')) ||
        (queryLower.includes('train') && codeLower.includes('fit')) ||
        (queryLower.includes('accuracy') && codeLower.includes('score')) ||
        (queryLower.includes('data') && codeLower.includes('pd.'));

      if (isRelevant) {
        if (index > 0 && notebook.cells[index - 1].cell_type === 'markdown') {
          const markdown = notebook.cells[index - 1].source;
          relevantCells.push(`# ${Array.isArray(markdown) ? markdown.join('') : markdown}\n`);
        }
        relevantCells.push(code);
      }
    }
  });

  return relevantCells.join('\n\n');
}

// Prompt generation for file analysis
export function generateFileAnalysisPrompt(file: File, domain: string, fileAnalysis: FileAnalysis) {
  const domainContext = getDomainContext(domain);
  
  return {
    parts: [{
      text: `As an expert in ${domain} and data analysis, analyze the uploaded file "${file.name}" with the following context:

File Analysis:
Type: ${fileAnalysis.type}
Analysis Summary: ${fileAnalysis.analysis}

Domain Context:
${domainContext}

Cross-Domain Relations:
${getCrossDomainRelations(fileAnalysis.type, domain)}

${getFileTypeSpecificPrompt(fileAnalysis.type, domain, fileAnalysis.metadata)}

Please provide:
1. Comprehensive analysis of the file content
2. Domain-specific insights and recommendations
3. Cross-domain applications and opportunities
4. Potential improvements or optimizations
5. Related domains that could benefit from this analysis

Format your response with clear sections and use markdown for better readability.`
    }]
  };
}

function getDomainContext(domain: string): string {
  const domainContexts: Record<string, string> = {
    'python': 'Focus on code quality, best practices, and data science applications',
    'machine-learning': 'Emphasize model architecture, training process, and evaluation metrics',
    'deep-learning': 'Focus on neural network design, optimization, and performance analysis',
    'data': 'Emphasize data quality, preprocessing, and statistical analysis',
    'excel': 'Focus on spreadsheet organization, formulas, and data analysis techniques',
    'sql': 'Emphasize query optimization, database design, and data relationships',
    'power-bi': 'Focus on data modeling, DAX formulas, and visualization best practices'
  };
  
  return domainContexts[domain] || 'Provide general analysis and recommendations';
}

function getCrossDomainRelations(fileType: string, primaryDomain: string): string {
  const relations: Record<string, Record<string, string[]>> = {
    'notebook': {
      'python': ['code quality', 'package usage', 'documentation'],
      'machine-learning': ['model implementation', 'training process', 'evaluation'],
      'deep-learning': ['neural network architecture', 'optimization techniques'],
      'data': ['data preprocessing', 'exploratory analysis', 'visualization']
    },
    'data': {
      'python': ['data manipulation', 'analysis scripts', 'automation'],
      'excel': ['spreadsheet analysis', 'pivot tables', 'formulas'],
      'sql': ['data querying', 'database operations'],
      'power-bi': ['data modeling', 'visualization', 'reporting']
    },
    'code': {
      'python': ['code structure', 'best practices', 'optimization'],
      'machine-learning': ['algorithm implementation', 'model deployment'],
      'deep-learning': ['neural network implementation', 'training scripts']
    }
  };

  const relatedDomains = relations[fileType]?.[primaryDomain] || [];
  return relatedDomains.length > 0 
    ? `Consider these aspects for cross-domain analysis:\n- ${relatedDomains.join('\n- ')}`
    : 'Provide general cross-domain insights and applications';
}

function getFileTypeSpecificPrompt(fileType: string, domain: string, metadata: any): string {
  switch (fileType) {
    case 'notebook':
      return `
Notebook-Specific Analysis:
- Total Cells: ${metadata.cells || 0}
- Code Sections: ${Object.keys(metadata.details || {}).join(', ')}
- Key Components: ${metadata.keyComponents || 'N/A'}

Focus Areas:
1. Code implementation quality and best practices
2. Data processing and analysis workflow
3. Model development and evaluation
4. Documentation and reproducibility
5. Visualization and result presentation`;

    case 'data':
      return `
Data-Specific Analysis:
- Rows: ${metadata.rowCount || 'N/A'}
- Columns: ${metadata.headers?.length || 0}
- Data Types: ${metadata.dataTypes || 'N/A'}

Focus Areas:
1. Data quality and completeness
2. Statistical insights and patterns
3. Feature engineering opportunities
4. Visualization recommendations
5. Analysis techniques specific to ${domain}`;

    case 'code':
      return `
Code-Specific Analysis:
- Total Lines: ${metadata.lineCount || 'N/A'}
- Key Imports: ${metadata.imports?.join(', ') || 'N/A'}
- Functions: ${metadata.functions || 'N/A'}

Focus Areas:
1. Code structure and organization
2. Implementation patterns and best practices
3. Performance optimization opportunities
4. Integration with ${domain} tools and libraries
5. Testing and documentation needs`;

    default:
      return `
General Analysis:
1. Content overview and structure
2. Quality assessment
3. Domain-specific applications
4. Improvement opportunities
5. Cross-domain integration possibilities`;
  }
}

// Content generation with file data
export async function generateFileContent(model: any, prompt: any, fileData: Part) {
  return await model.generateContent([...prompt.parts, fileData as unknown as Part]);
}

// Initialize file analysis model
export const fileModel = genAI?.getGenerativeModel({
  model: "models/gemini-2.0-flash",
  tools: [{ google_search: {} } as Tool]
}); 