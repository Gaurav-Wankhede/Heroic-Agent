'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Loader2, ChevronDown, Trash2, Upload, Menu, X, Keyboard, Sun, ArrowLeft, Home } from 'lucide-react';
import type { Message, GroundingMetadata } from '@/types/chat';
import { Message as MessageComponent } from './Message';
import { FileUploader } from './FileUploader';
import { ConfirmDialog } from './ConfirmDialog';
import { StorageErrorDialog } from './StorageErrorDialog';
import { HamburgerMenu } from './HamburgerMenu';
import Link from 'next/link';
import { ThemeToggle } from '../theme-toggle';
// Add file type interfaces
interface FileAnalysis {
  type: 'image' | 'audio' | 'video' | 'document' | 'data' | 'code' | 'notebook';
  analysis: string;
  metadata: Record<string, any>;
}

interface UploadedFile {
  data: string;
  mimeType: string;
  name: string;
  size: number;
  timestamp: number;
  content?: string;
  analysis?: FileAnalysis;
}

// Add type for notebook cell
interface NotebookCell {
  cell_type: string;
  source: string[];
}

// Add type for notebook
interface Notebook {
  cells: NotebookCell[];
}

// Add domain-file type relationship mapping
const DOMAIN_FILE_RELATIONS: Record<string, {
  primaryTypes: string[];
  secondaryTypes: string[];
  description: string;
}> = {
  'python': {
    primaryTypes: ['code', 'notebook'],
    secondaryTypes: ['data'],
    description: 'Python code analysis and data processing'
  },
  'machine-learning': {
    primaryTypes: ['notebook', 'data'],
    secondaryTypes: ['code'],
    description: 'Machine learning model development and evaluation'
  },
  'deep-learning': {
    primaryTypes: ['notebook', 'data'],
    secondaryTypes: ['code'],
    description: 'Deep learning model implementation and training'
  },
  'data': {
    primaryTypes: ['data', 'notebook'],
    secondaryTypes: ['code'],
    description: 'Data analysis and visualization'
  },
  'excel': {
    primaryTypes: ['data'],
    secondaryTypes: ['notebook'],
    description: 'Spreadsheet analysis and data processing'
  },
  'sql': {
    primaryTypes: ['data'],
    secondaryTypes: ['code', 'notebook'],
    description: 'Database operations and data analysis'
  },
  'power-bi': {
    primaryTypes: ['data'],
    secondaryTypes: ['notebook'],
    description: 'Data visualization and reporting'
  }
};

// Add this function before the ChatInterface component
function getOSSpecificShortcuts() {
  if (typeof window === 'undefined') {
    return {
      send: 'Ctrl + Enter',
      newLine: 'Enter',
      cancelEdit: 'Esc',
      clearChat: 'Del',
      fileUpload: 'Alt + U'
    };
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();

  if (userAgent.includes('android') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return {
      send: 'Tap send',
      newLine: 'Enter',
      cancelEdit: 'Tap X',
      clearChat: 'Clear button',
      fileUpload: 'Upload button'
    };
  } else if (platform.includes('mac')) {
    return {
      send: '⌘ + Enter',
      newLine: 'Enter',
      cancelEdit: 'Esc',
      clearChat: 'Delete',
      fileUpload: '⌥ + U'
    };
  } else {
    return {
      send: 'Ctrl + Enter',
      newLine: 'Enter',
      cancelEdit: 'Esc',
      clearChat: 'Del',
      fileUpload: 'Alt + U'
    };
  }
}

export default function ChatInterface({ domain }: { domain: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFileUploader, setShowFileUploader] = useState(false);
  const [showStorageError, setShowStorageError] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{
    [key: string]: UploadedFile;
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [messageToEdit, setMessageToEdit] = useState<{
    messageId: string;
    content: string;
  } | null>(null);
  const [showClearChatDialog, setShowClearChatDialog] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = useMemo(() => {
    // Only access localStorage on the client side
    if (typeof window === 'undefined') return '';
    
    // Generate or retrieve user ID
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) return storedUserId;
    
    const newUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('userId', newUserId);
    return newUserId;
  }, []);

  // Constants for file management
  const MAX_TOTAL_FILES = 5;
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total
  const FILE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutes

  // Add supported file types
  const SUPPORTED_EXTENSIONS = [
    // Images
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    // Audio
    '.mp3', '.wav', '.ogg',
    // Video
    '.mp4', '.webm',
    // Documents
    '.pdf',
    // Data
    '.csv',
    // Code
    '.py',
    // Notebooks
    '.ipynb'
  ];

  // Add file type validation
  const isValidFileType = (file: File) => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    return SUPPORTED_EXTENSIONS.includes(extension);
  };

  // Load saved files on component mount
  useEffect(() => {
    // Only access localStorage on the client side
    if (typeof window === 'undefined') return;

    const savedFiles = localStorage.getItem('uploadedFiles');
    if (savedFiles) {
      try {
        const files = JSON.parse(savedFiles);
        // Clean up expired files
        const now = Date.now();
        const validFiles = Object.entries(files).reduce((acc, [id, file]) => {
          if (now - (file as UploadedFile).timestamp < FILE_EXPIRY_TIME) {
            acc[id] = file as UploadedFile;
          }
          return acc;
        }, {} as typeof uploadedFiles);
        setUploadedFiles(validFiles);
        localStorage.setItem('uploadedFiles', JSON.stringify(validFiles));
      } catch (error) {
        console.error('Error loading saved files:', error);
        localStorage.removeItem('uploadedFiles');
      }
    }
  }, []);

  // Enhanced cleanupFiles function
  const cleanupFiles = useCallback(() => {
    const now = Date.now();
    const validFiles = Object.entries(uploadedFiles).reduce((acc, [id, file]) => {
      if (now - file.timestamp < FILE_EXPIRY_TIME) {
        acc[id] = file;
      }
      return acc;
    }, {} as typeof uploadedFiles);
    
    try {
      setUploadedFiles(validFiles);
      localStorage.setItem('uploadedFiles', JSON.stringify(validFiles));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        setShowStorageError(true);
      } else {
        console.error('Error saving files:', error);
      }
    }
  }, [uploadedFiles]);

  // Function to handle storage quota error
  const handleStorageQuotaError = useCallback(() => {
    // Sort files by timestamp and keep only the most recent ones
    const sortedFiles = Object.entries(uploadedFiles)
      .sort(([, a], [, b]) => b.timestamp - a.timestamp)
      .slice(0, Math.max(1, Math.floor(Object.keys(uploadedFiles).length / 2)))
      .reduce((acc, [id, file]) => {
        acc[id] = file;
        return acc;
      }, {} as typeof uploadedFiles);

    try {
      setUploadedFiles(sortedFiles);
      localStorage.setItem('uploadedFiles', JSON.stringify(sortedFiles));
    } catch (error) {
      console.error('Error clearing old files:', error);
      // If still failing, clear all files
      setUploadedFiles({});
      localStorage.removeItem('uploadedFiles');
    }
  }, [uploadedFiles]);

  // Run cleanup periodically
  useEffect(() => {
    const interval = setInterval(cleanupFiles, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [cleanupFiles]);

  // Helper function to check if we can add more files
  const canAddFile = (fileSize: number) => {
    const totalSize = Object.values(uploadedFiles).reduce((sum, file) => sum + file.size, 0) + fileSize;
    return (
      Object.keys(uploadedFiles).length < MAX_TOTAL_FILES &&
      totalSize <= MAX_TOTAL_SIZE
    );
  };

  // Handle scroll button visibility
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollButton(!isNearBottom);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    }
  }, []);

  // Add scroll event listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  // Auto-scroll on new messages only if near bottom
  useEffect(() => {
    if (!showScrollButton && messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, showScrollButton, scrollToBottom]);

  // Auto-scroll when loading completes
  useEffect(() => {
    if (!isLoading) {
      scrollToBottom();
    }
  }, [isLoading, scrollToBottom]);

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  };

  const shortcuts = useMemo(() => getOSSpecificShortcuts(), []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      // Check for both Ctrl and Command (Meta) key
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        handleSubmit(e);
      }
      // Allow normal Enter for new line
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message to chat
    const userMessageId = `user-${Date.now()}`;
    
    // If we're editing a message, only keep messages up to the edited message
    let currentMessages = messages;
    if (messageToEdit) {
      const messageIndex = messages.findIndex(msg => msg.messageId === messageToEdit.messageId);
      if (messageIndex !== -1) {
        currentMessages = messages.slice(0, messageIndex);
      }
    }
    
    // Add the new user message
    setMessages([...currentMessages, { 
      messageId: userMessageId,
      content: userMessage,
      isAI: false,
      timestamp: Date.now()
    }]);

    setIsLoading(true);
    let aiMessageId: string | null = null;

    try {
      // Clean up expired files before sending
      cleanupFiles();

      // Get all valid files with their content
      const validFiles = Object.entries(uploadedFiles)
        .filter(([_, file]) => Date.now() - file.timestamp < FILE_EXPIRY_TIME)
        .map(([id, file]) => ({
          id,
          name: file.name,
          content: file.content || '',
          mimeType: file.mimeType,
          timestamp: file.timestamp
        }));

      // If we're editing a message, update the server-side chat history
      if (messageToEdit) {
        await fetch('/api/chat', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify({
            messageId: messageToEdit.messageId,
            content: userMessage,
            domain,
            userId
          })
        });
        setMessageToEdit(null);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          message: userMessage,
          domain,
          stream: true,
          files: validFiles.length > 0 ? validFiles : undefined,
          useWebSearch: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.messageId) {
                if (!aiMessageId) {
                  aiMessageId = parsed.messageId;
                  setMessages(prev => [...prev, { 
                    messageId: aiMessageId!,
                    content: parsed.content || '',
                    isAI: true,
                    groundingMetadata: parsed.groundingMetadata || null,
                    timestamp: Date.now()
                  }]);
                } else if (aiMessageId === parsed.messageId) {
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.messageId === aiMessageId
                        ? { 
                            ...msg, 
                            content: parsed.content || msg.content,
                            groundingMetadata: parsed.groundingMetadata || msg.groundingMetadata
                          }
                        : msg
                    )
                  );
                }
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e);
              throw e;
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessageId = `error-${Date.now()}`;
      setMessages(prev => [...prev, { 
        messageId: errorMessageId,
        content: error instanceof Error ? error.message : 'An unexpected error occurred',
        isAI: true,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const clearChat = async () => {
    try {
      const response = await fetch(`/api/chat?userId=${userId}&domain=${domain}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear chat history');
      }

      // Clear local messages
      setMessages([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear chat');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      
      // Validate file type and size
      if (!isValidFileType(file)) {
        throw new Error(
          `Unsupported file type. Supported types: ${SUPPORTED_EXTENSIONS.join(', ')}`
        );
      }
      
      if (!canAddFile(file.size)) {
        throw new Error(
          `Cannot upload file. Maximum ${MAX_TOTAL_FILES} files or ${MAX_TOTAL_SIZE / (1024 * 1024)}MB total allowed.`
        );
      }

      // Get file content
      const fileContent = await file.text();
      
      // Convert file to base64 and store it
      const fileData = await fileToBase64(file);
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const newFile: UploadedFile = {
        data: fileData.data,
        mimeType: fileData.mimeType,
        name: fileData.name,
        size: file.size,
        timestamp: Date.now(),
        content: fileContent
      };

      // Update uploaded files
      const updatedFiles = {
        ...uploadedFiles,
        [fileId]: newFile
      };
      
      try {
        localStorage.setItem('uploadedFiles', JSON.stringify(updatedFiles));
        setUploadedFiles(updatedFiles);
      } catch (error: unknown) {
        if (error instanceof Error && 
            (error.name === 'QuotaExceededError' || 
             'code' in error && (error.code === 22 || error.code === 1014))) {
          setShowStorageError(true);
          return;
        }
        throw error;
      }

      // Add user message about the file upload
      const userMessageId = `user-${Date.now()}`;
      setMessages(prev => [...prev, { 
        messageId: userMessageId,
        content: `Uploaded file: ${file.name}. Please provide your question or analysis request.`,
        isAI: false,
        timestamp: Date.now()
      }]);

    } catch (error) {
      console.error('Error uploading file:', error);
      setError(error instanceof Error ? error.message : 'Error uploading file');
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  // Helper function to convert File to base64
  const fileToBase64 = (file: File): Promise<{
    data: string;
    mimeType: string;
    name: string;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          // Extract base64 data from the result
          const base64Data = reader.result.split(',')[1];
          resolve({
            data: base64Data,
            mimeType: file.type,
            name: file.name
          });
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileDelete = (fileId: string) => {
    const updatedFiles = { ...uploadedFiles };
    delete updatedFiles[fileId];
    setUploadedFiles(updatedFiles);
    localStorage.setItem('uploadedFiles', JSON.stringify(updatedFiles));
  };

  // Helper function to get file category
  function getFileCategory(file: File): string {
    if (file.name.endsWith('.ipynb')) return 'notebook';
    if (file.type === 'text/csv') return 'data';
    if (file.name.endsWith('.py')) return 'code';
    return 'other';
  }

  // Helper function to get related domains
  function getRelatedDomains(fileCategory: string, currentDomain: string): string[] {
    const relatedDomains = new Set<string>();
    
    Object.entries(DOMAIN_FILE_RELATIONS).forEach(([domain, relation]) => {
      if (domain !== currentDomain && 
          (relation.primaryTypes.includes(fileCategory) || 
           relation.secondaryTypes.includes(fileCategory))) {
        relatedDomains.add(domain);
      }
    });
    
    return Array.from(relatedDomains);
  }

  // Domain-specific analysis functions
  async function analyzeNotebookForDomain(notebook: Notebook, domain: string): Promise<string> {
    const totalCells = notebook.cells.length;
    const codeCells = notebook.cells.filter(c => c.cell_type === 'code').length;
    const markdownCells = notebook.cells.filter(c => c.cell_type === 'markdown').length;
    
    const domainKeywords = getDomainKeywords(domain);
    const relevantCells = notebook.cells.filter(cell => 
      domainKeywords.some(keyword => 
        cell.source.join('').toLowerCase().includes(keyword)
      )
    ).length;

    return `${domain.charAt(0).toUpperCase() + domain.slice(1)} Notebook Analysis:
- Total Cells: ${totalCells}
- Code Cells: ${codeCells}
- Markdown Cells: ${markdownCells}
- Domain-Relevant Cells: ${relevantCells}

I can help analyze:
1. Implementation patterns specific to ${domain}
2. Code quality and best practices
3. Domain-specific optimizations
4. Integration with other tools and libraries
5. Documentation and reproducibility

Please let me know what aspects you'd like to explore.`;
  }

  async function analyzeDataForDomain(content: string, domain: string): Promise<string> {
    const lines = content.split('\n');
    const headers = lines[0].split(',');
    
    const domainRelevance = assessDataRelevance(headers, domain);

    return `${domain.charAt(0).toUpperCase() + domain.slice(1)} Data Analysis:
- Total Rows: ${lines.length - 1}
- Total Columns: ${headers.length}
- Headers: ${headers.join(', ')}
- Domain Relevance: ${domainRelevance}

I can help analyze:
1. Data quality and completeness
2. Domain-specific patterns and insights
3. Feature engineering opportunities
4. Visualization recommendations
5. Integration with ${domain} tools

Please let me know what aspects you'd like to explore.`;
  }

  async function analyzeCodeForDomain(content: string, domain: string): Promise<string> {
    const lines = content.split('\n');
    const imports = lines.filter(line => 
      line.trim().startsWith('import') || 
      line.trim().startsWith('from')
    );
    
    const domainKeywords = getDomainKeywords(domain);
    const relevantLines = lines.filter(line =>
      domainKeywords.some(keyword =>
        line.toLowerCase().includes(keyword)
      )
    ).length;

    return `${domain.charAt(0).toUpperCase() + domain.slice(1)} Code Analysis:
- Total Lines: ${lines.length}
- Import Statements: ${imports.length}
- Domain-Relevant Lines: ${relevantLines}
- Key Imports: ${imports.slice(0, 5).join(', ')}${imports.length > 5 ? '...' : ''}

I can help analyze:
1. Code structure and organization
2. Implementation patterns for ${domain}
3. Best practices and optimizations
4. Integration opportunities
5. Testing and documentation needs

Please let me know what aspects you'd like to explore.`;
  }

  // Helper function to get domain-specific keywords
  function getDomainKeywords(domain: string): string[] {
    const keywords: Record<string, string[]> = {
      'python': ['pandas', 'numpy', 'matplotlib', 'scikit', 'scipy'],
      'machine-learning': ['model', 'train', 'predict', 'accuracy', 'sklearn'],
      'deep-learning': ['neural', 'tensorflow', 'pytorch', 'keras', 'layer'],
      'data': ['data', 'analysis', 'visualization', 'statistics', 'plot'],
      'excel': ['excel', 'spreadsheet', 'workbook', 'pivot', 'formula'],
      'sql': ['sql', 'query', 'database', 'table', 'join'],
      'power-bi': ['powerbi', 'dax', 'measure', 'visual', 'report']
    };
    
    return keywords[domain] || [];
  }

  // Helper function to assess data relevance for domain
  function assessDataRelevance(headers: string[], domain: string): string {
    const keywords = getDomainKeywords(domain);
    const relevantHeaders = headers.filter(header =>
      keywords.some(keyword =>
        header.toLowerCase().includes(keyword)
      )
    ).length;
    
    const relevanceScore = relevantHeaders / headers.length;
    
    if (relevanceScore > 0.5) return 'High';
    if (relevanceScore > 0.2) return 'Medium';
    return 'Low';
  }

  const handleMessageEdit = async (messageId: string, newContent: string) => {
    // Find the message index
    const messageIndex = messages.findIndex(msg => msg.messageId === messageId);
    if (messageIndex === -1) return;

    setMessageToEdit({ messageId, content: newContent });
    setShowConfirmDialog(true);
  };

  const handleConfirmEdit = async () => {
    if (!messageToEdit) return;

    const messageIndex = messages.findIndex(msg => msg.messageId === messageToEdit.messageId);
    if (messageIndex === -1) return;

    setIsLoading(true);
    try {
      // Update the message content and mark as edited
      const updatedMessages = [...messages];
      updatedMessages[messageIndex] = {
        ...updatedMessages[messageIndex],
        content: messageToEdit.content,
        edited: true,
        timestamp: Date.now()
      };

      // Remove all messages after the edited message
      const revokedMessages = updatedMessages.slice(0, messageIndex + 1);
      setMessages(revokedMessages);

      // Update server-side chat history
      await fetch('/api/chat', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          messageId: messageToEdit.messageId,
          content: messageToEdit.content,
          domain,
          userId
        })
      });

      // Get AI response for the edited message
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          message: messageToEdit.content,
          domain,
          stream: true,
          useWebSearch: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let aiMessageId: string | null = null;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.messageId) {
                if (!aiMessageId) {
                  aiMessageId = parsed.messageId;
                  setMessages(prev => [...prev, { 
                    messageId: aiMessageId!,
                    content: parsed.content || '',
                    isAI: true,
                    groundingMetadata: parsed.groundingMetadata || null,
                    timestamp: Date.now()
                  }]);
                } else if (aiMessageId === parsed.messageId) {
                  setMessages(prev => 
                    prev.map(msg => 
                      msg.messageId === aiMessageId
                        ? { 
                            ...msg, 
                            content: parsed.content || msg.content,
                            groundingMetadata: parsed.groundingMetadata || msg.groundingMetadata
                          }
                        : msg
                    )
                  );
                }
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e);
              throw e;
            }
          }
        }
      }
    } catch (error) {
      console.error('Edit message error:', error);
      const errorMessageId = `error-${Date.now()}`;
      setMessages(prev => [...prev, { 
        messageId: errorMessageId,
        content: error instanceof Error ? error.message : 'An unexpected error occurred',
        isAI: true,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
      setMessageToEdit(null);
      scrollToBottom();
    }
  };

  // Add global keyboard shortcut handler
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Handle Delete key for clearing chat - only when there are messages
      if (e.key === 'Delete' && !isLoading && messages.length > 0) {
        e.preventDefault();
        setShowClearChatDialog(true);
      }
      
      // Handle Alt + U for file upload
      if (e.key === 'u' && e.altKey && !isLoading) {
        e.preventDefault();
        setShowFileUploader(true);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isLoading, messages.length]);

  // Add function to handle clearing old files
  const handleClearOldFiles = () => {
    try {
      // Keep only the most recent files
      const sortedEntries = Object.entries(uploadedFiles)
        .sort(([, a], [, b]) => b.timestamp - a.timestamp)
        .slice(0, Math.max(1, Math.floor(Object.keys(uploadedFiles).length / 2)));
      
      const recentFiles = sortedEntries.reduce((acc, [id, file]) => ({
        ...acc,
        [id]: file
      }), {} as typeof uploadedFiles);
      
      localStorage.setItem('uploadedFiles', JSON.stringify(recentFiles));
      setUploadedFiles(recentFiles);
    } catch (error) {
      console.error('Error clearing old files:', error);
      // If still failing, clear all files
      localStorage.removeItem('uploadedFiles');
      setUploadedFiles({});
    }
  };

  // Render welcome message
  const renderWelcomeMessage = () => {
    if (messages.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center p-4">
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Welcome to the {domain.replace('-', ' ')} Assistant!
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Start a conversation by typing a message below.
          </p>
        </div>
      );
    }
    return null;
  };

  // Add this useEffect to handle clicks outside the menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const menu = document.getElementById('mobile-menu');
      const hamburger = document.querySelector('[aria-controls="mobile-menu"]');
      
      if (isMobileMenuOpen && 
          menu && 
          !menu.contains(event.target as Node) && 
          hamburger && 
          !hamburger.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileMenuOpen]);

  return (
    <div className="flex flex-col h-full relative bg-gray-50 dark:bg-gray-900">
      {/* Header with hamburger menu */}
      <div className="sticky top-0 z-[99] flex items-center justify-between p-4 border-b border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {/* Hamburger Menu */}
          <HamburgerMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
            onToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            shortcuts={shortcuts}
            onFileUpload={() => setShowFileUploader(true)}
            onClearChat={() => setShowClearChatDialog(true)}
          />
          
          {/* Navigation Icons */}
          <div className="flex items-center gap-3">
            <Link 
              href="/domains"
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Back to domains"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            
            <Link 
              href="/"
              className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Home"
            >
              <Home className="h-5 w-5" />
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Chat Title */}
        <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
          Chat
        </h2>
      </div>

      {/* Keyboard shortcuts bar */}
      <div className="hidden md:flex items-center justify-between px-4 py-2.5 bg-white/50 dark:bg-gray-800/50 border-b border-gray-200/80 dark:border-gray-700/80 backdrop-blur-sm text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-4">
          <div>
            <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">{shortcuts.send}</kbd>
            <span className="ml-2">Send</span>
          </div>
          <div>
            <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">{shortcuts.newLine}</kbd>
            <span className="ml-2">New line</span>
          </div>
          <div>
            <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">{shortcuts.fileUpload}</kbd>
            <span className="ml-2">Upload file</span>
          </div>
        </div>
        <div>
          <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">Shift</kbd>
          <span className="ml-2">Hold for horizontal scroll</span>
        </div>
      </div>

      {/* Menu overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm z-[998]"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Slide-out menu */}
      <div 
        id="mobile-menu"
        className={`
          fixed inset-y-0 left-0 w-72 bg-white dark:bg-gray-800 shadow-xl 
          transform transition-all duration-300 ease-in-out z-[999]
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
        `}
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="sticky top-0 flex items-center justify-between p-4 border-b border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Menu</h3>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Keyboard Shortcuts Section */}
          <div className="p-4 border-b border-gray-200/80 dark:border-gray-700/80">
            <div className="flex items-center gap-2 mb-3">
              <Keyboard className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Keyboard Shortcuts</h4>
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Send message</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                  {shortcuts.send}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">New line</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                  {shortcuts.newLine}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Cancel edit</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                  {shortcuts.cancelEdit}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Clear chat</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                  {shortcuts.clearChat}
                </kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-300">Upload file</span>
                <kbd className="px-2 py-1 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                  {shortcuts.fileUpload}
                </kbd>
              </div>
            </div>
          </div>

          {/* Actions Section */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Menu className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Actions</h4>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowFileUploader(true);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Upload className="h-4 w-4" />
                <span>Upload File</span>
              </button>
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setShowClearChatDialog(true);
                }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 className="h-4 w-4" />
                <span>Clear Chat</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] relative"
      >
        <div className="h-full p-4 space-y-4">
          {messages.length === 0 ? (
            renderWelcomeMessage()
          ) : (
            messages.map((message) => (
              <MessageComponent
                key={message.messageId}
                messageId={message.messageId}
                content={message.content}
                isAI={message.isAI}
                groundingMetadata={message.groundingMetadata}
                timestamp={message.timestamp}
                edited={message.edited}
                onEdit={message.isAI ? undefined : (newContent) => handleMessageEdit(message.messageId, newContent)}
              />
            ))
          )}
          {isLoading && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Scroll to bottom button */}
        {showScrollButton && (
          <button
            onClick={scrollToBottom}
            className="absolute left-4 bottom-4 p-2 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm p-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              adjustTextareaHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 p-3 pr-24 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] backdrop-blur-sm transition-colors"
            rows={1}
          />
          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            {input && (
              <button
                onClick={() => setInput('')}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                title="Clear input"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setShowFileUploader(true)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              title="Upload file"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={!input.trim() && !Object.keys(uploadedFiles).length}
              className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = '';
        }}
        className="hidden"
        accept={SUPPORTED_EXTENSIONS.join(',')}
      />

      {/* File uploader dialog */}
      <FileUploader
        isOpen={showFileUploader}
        onClose={() => setShowFileUploader(false)}
        onUpload={handleFileUpload}
        onDelete={handleFileDelete}
        uploadedFiles={uploadedFiles}
        maxTotalFiles={MAX_TOTAL_FILES}
        maxTotalSize={MAX_TOTAL_SIZE}
        fileExpiryTime={FILE_EXPIRY_TIME}
      />

      {/* Storage error dialog */}
      <StorageErrorDialog
        isOpen={showStorageError}
        onClose={() => setShowStorageError(false)}
        onClearOldFiles={handleClearOldFiles}
      />

      <ConfirmDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmEdit}
        title="Edit Message"
        message="Are you sure you want to edit this message? This will remove all subsequent messages in the conversation."
      />

      <ConfirmDialog
        isOpen={showClearChatDialog}
        onClose={() => setShowClearChatDialog(false)}
        onConfirm={clearChat}
        title="Clear Chat"
        message="Are you sure you want to clear the chat? This action cannot be undone."
      />
    </div>
  );
} 