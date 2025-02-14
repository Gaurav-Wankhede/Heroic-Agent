import { ChatMessage } from '../types/chat';
import { FileUploadData } from '@/types/chat';
import { analyzeNotebookContent, FileAnalysis } from '../../fileHandler';
import { getLatestDomainInfo } from './response';

const LATEST_INFO_PATTERNS: string[] = [
  'latest', 'new', 'recent', 'update', 'current', 'modern', 'trending', 'what\'s new'
];

// Helper function to determine file type
export function getFileType(mimeType: string): FileAnalysis['type'] {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.includes('pdf') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('csv') || mimeType.includes('excel')) return 'data';
  if (mimeType.includes('python') || mimeType.includes('javascript')) return 'code';
  if (mimeType.includes('notebook')) return 'notebook';
  return 'document';
}

// Build prompt with context
export async function buildPrompt(
  message: string, 
  domain: string, 
  systemPrompt: string, 
  chatHistory: ChatMessage[] = [], 
  files?: FileUploadData[]
): Promise<string> {
  let prompt = systemPrompt + '\n\n';
  
  // Add search instructions
  prompt += `SEARCH INSTRUCTIONS:
1. Use the Google Search tool to find relevant, up-to-date information about ${domain}-related topics
2. When searching, combine the user's query with domain-specific context
3. For technical questions, search for official documentation and reliable sources
4. For version-specific queries, include version numbers in search
5. Cite sources when providing information from search results\n\n`;
  
  // Check if asking for latest information
  const isAskingForLatest = LATEST_INFO_PATTERNS.some(pattern => 
    message.toLowerCase().includes(pattern)
  );

  if (isAskingForLatest) {
    const latestInfo = await getLatestDomainInfo(domain, chatHistory);
    prompt += `Latest Information Context:\n${latestInfo}\n\n`;
  }

  // Add domain context
  prompt += `Domain Context: ${domain}\n`;
  prompt += `Focus Area: Questions and answers should be specifically about ${domain}\n\n`;

  // Add file analysis if files are present
  if (files && files.length > 0) {
    for (const file of files) {
      const fileAnalysis: FileAnalysis = {
        type: getFileType(file.mimeType),
        analysis: '',
        metadata: {}
      };

      // Special handling for Jupyter notebooks
      if (file.name.endsWith('.ipynb')) {
        try {
          const notebook = JSON.parse(file.data);
          const analysis = analyzeNotebookContent(notebook);
          fileAnalysis.analysis = analysis.summary;
          fileAnalysis.metadata = analysis.details;
        } catch (error) {
          console.error('Error analyzing notebook:', error);
        }
      }

      prompt += `\nFile Analysis (${file.name}):\n${file.data}`;
    }
  }

  // Add chat history context with search refinement
  if (chatHistory.length > 0) {
    prompt += '\nConversation Context:\n';
    const recentHistory = chatHistory.slice(-3); // Use last 3 messages for context
    recentHistory.forEach(msg => {
      prompt += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}\n`;
    });
    
    // Add search refinement based on conversation
    if (recentHistory.length > 1) {
      prompt += '\nSearch Context: Consider the above conversation history when searching for information.\n';
    }
  }

  // Add the current query with search instruction
  prompt += `\nCurrent Query: ${message}\n`;
  prompt += `Use the Google Search tool to find relevant information about this ${domain}-related query.\n\n`;
  prompt += 'Assistant: ';
  
  return prompt;
} 