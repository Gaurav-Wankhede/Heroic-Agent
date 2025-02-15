'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Loader2, ChevronDown, Trash2, Upload, Menu, X, Keyboard, Sun, ArrowLeft, Home } from 'lucide-react';
import type { Message, GroundingMetadata } from '@/types/chat';
import { Message as MessageComponent } from './Message';
import { ConfirmDialog } from './ConfirmDialog';
import { HamburgerMenu } from './HamburgerMenu';
import Link from 'next/link';
import { ThemeToggle } from '../theme-toggle';

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

// Add this component after the imports
const FileTagPreview = ({ fileName, onClick }: { fileName: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 font-medium hover:bg-orange-200 dark:hover:bg-orange-800/60 transition-colors group"
  >
    <svg className="h-3.5 w-3.5 text-orange-500 dark:text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
    @{fileName}
  </button>
);

// Add this at the top of the file, after the imports
declare global {
  interface Window {
    handleFileClick?: (fileName: string) => void;
  }
}

export default function ChatInterface({ domain }: { domain: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const [userId] = useState(() => {
    // Only access localStorage on the client side
    if (typeof window === 'undefined') return '';
    
    // Generate or retrieve user ID
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) return storedUserId;
    
    const newUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('userId', newUserId);
    return newUserId;
  });

  // Enhanced scroll to bottom function - moved up
  const scrollToBottom = useCallback(() => {
    const container = messagesContainerRef.current;
    const messagesEnd = messagesEndRef.current;
    
    if (container && messagesEnd) {
      const { scrollHeight, clientHeight } = container;
      const maxScroll = scrollHeight - clientHeight;
      
      container.scrollTo({
        top: maxScroll,
        behavior: 'smooth'
      });
      
      // Hide scroll button when scrolling to bottom
      setShowScrollButton(false);
    }
  }, []);

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      try {
        const response = await fetch(`/api/chat?userId=${userId}&domain=${domain}`);
        if (!response.ok) {
          throw new Error('Failed to load chat history');
        }
        const history = await response.json();
        if (history.messages && Array.isArray(history.messages)) {
          const formattedMessages = history.messages.map((msg: any) => ({
            messageId: `${msg.role}-${msg.timestamp}`,
            content: msg.content,
            isAI: msg.role === 'assistant',
            timestamp: msg.timestamp,
            groundingMetadata: msg.groundingMetadata
          }));
          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error loading chat history:', error);
        setError(error instanceof Error ? error.message : 'Failed to load chat history');
      }
    };

    loadChatHistory();
  }, [userId, domain]);

  // Update the scroll tracking useEffect to be more sensitive
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      // Show button when scrolled up just 100 pixels from bottom
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

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
    
    let currentMessages = messages;
    if (messageToEdit) {
      const messageIndex = messages.findIndex(msg => msg.messageId === messageToEdit.messageId);
      if (messageIndex !== -1) {
        currentMessages = messages.slice(0, messageIndex);
      }
    }
    
    setMessages([...currentMessages, { 
      messageId: userMessageId,
      content: userMessage,
      isAI: false,
      timestamp: Date.now()
    }]);

    setIsLoading(true);
    let aiMessageId: string | null = null;

    try {
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
              
              // Enhanced error handling
              if (parsed.error) {
                console.error('Server error:', parsed.error);
                throw new Error(parsed.error);
              }

              // Validate parsed data structure
              if (!parsed || typeof parsed !== 'object') {
                throw new Error('Invalid response format');
              }

              if (parsed.messageId) {
                if (!aiMessageId) {
                  aiMessageId = parsed.messageId;
                  setMessages(prev => [...prev, { 
                    messageId: aiMessageId!,
                    content: typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content) || '',
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
                            content: typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content) || msg.content,
                            groundingMetadata: parsed.groundingMetadata || msg.groundingMetadata
                          }
                        : msg
                    )
                  );
                }
              } else {
                console.warn('Received message without messageId:', parsed);
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e, '\nChunk data:', data);
              throw new Error('Failed to process response data');
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage = error instanceof Error ? 
        error.message : 
        'An unexpected error occurred while processing your request';
      
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
                    content: typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content) || '',
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
                            content: typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content) || msg.content,
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
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isLoading, messages.length]);

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

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const input = e.target.value;
    setInput(input);
    adjustTextareaHeight();
  };

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
          {/* Domain Name with Capitalization */}
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              {domain.replace('-', ' ').replace(/\b\w/g, char => char.toUpperCase())}
            </h2>
          </div>
        </div>
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
            <kbd className="px-2 py-1 bg-white dark:bg-gray-700 rounded-md shadow-sm border border-gray-200 dark:border-gray-600">{shortcuts.clearChat}</kbd>
            <span className="ml-2">Clear chat</span>
          </div>
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
                timestamp={message.timestamp || Date.now()}
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
            className="fixed right-6 bottom-24 p-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all transform hover:scale-105 z-10 animate-in fade-in zoom-in-95 duration-200"
            aria-label="Scroll to bottom"
          >
            <ChevronDown className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Input area */}
      <div className="relative flex-shrink-0">
        <div className="relative">
          {/* Textarea for user input */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="w-full resize-none bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 dark:focus:ring-blue-500/40 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 min-h-[3rem] shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            rows={1}
            style={{ minHeight: '3rem' }}
            aria-label="Message input"
            aria-describedby="message-input-help"
            role="textbox"
            aria-multiline="true"
          />
          
          {/* Input actions */}
          <div className="absolute right-4 inset-y-0 flex items-center justify-center">
            <button
              onClick={handleSubmit}
              className="p-2 text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              aria-label="Send message"
            >
              <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

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