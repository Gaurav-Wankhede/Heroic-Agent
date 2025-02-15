"use client";

import { GroundingMetadata } from '@/types/chat';
import { ExternalLink, User, Bot, Edit2, Check, X, Copy, CheckCheck } from 'lucide-react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Highlight, themes } from 'prism-react-renderer';
import { useState, useEffect } from 'react';
import { Citation, CitationSource } from './Citation';
import { GoogleSearchSource } from '@/lib/ai/types/Citation';

interface MessageProps {
  content: string;
  isAI: boolean;
  groundingMetadata?: GroundingMetadata | null;
  onEdit?: (newContent: string) => void;
  messageId: string;
  edited?: boolean;
  timestamp?: number;
  onFileClick?: (fileName: string) => void;
}

// Custom components for ReactMarkdown
const MarkdownComponents: Components = {
  // Style paragraphs
  p: ({ children, ...props }) => (
    <p className="mb-3 last:mb-0 text-sm md:text-base" {...props}>{children}</p>
  ),
  
  // Style headings
  h1: ({ children, ...props }) => (
    <h1 className="text-xl md:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100" {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 className="text-lg md:text-xl font-bold mb-3 text-gray-900 dark:text-gray-100" {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 className="text-base md:text-lg font-bold mb-2 text-gray-900 dark:text-gray-100" {...props}>{children}</h3>
  ),
  
  // Style lists
  ul: ({ children, ...props }) => (
    <ul className="list-disc list-inside mb-4 space-y-1 text-sm md:text-base" {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }) => (
    <ol className="list-decimal list-inside mb-4 space-y-1 text-sm md:text-base" {...props}>{children}</ol>
  ),
  
  // Style code blocks and inline code
  code: ({ node, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    const isInline = node?.position?.start.line === node?.position?.end.line;
    const [isCopied, setIsCopied] = useState(false);
    
    const handleCopy = async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy text:', err);
      }
    };
    
    if (!isInline && language) {
      return (
        <div className="group/code relative rounded-md overflow-hidden my-2 text-sm md:text-base">
          {/* Language indicator - Top Right-20 */}
          <div className="absolute top-0 right-20 px-3 py-1.5 bg-gray-800/90 text-gray-300 text-xs font-medium rounded-br">
            {language}
          </div>

          {/* Copy button - Top Right */}
          <div className="absolute top-0 right-0 opacity-0 group-hover/code:opacity-100 transition-all duration-200">
            <button
              onClick={() => handleCopy(String(children).replace(/\n$/, ''))}
              className="px-3 py-1.5 text-gray-400 bg-gray-800/90 rounded-bl hover:text-gray-300 flex items-center gap-1.5 transition-colors"
              aria-label="Copy code"
            >
              {isCopied ? (
                <>
                  <CheckCheck className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-xs font-medium text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">Copy</span>
                </>
              )}
            </button>
          </div>

          <Highlight
            theme={themes.nightOwl}
            code={String(children).replace(/\n$/, '')}
            language={language}
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre className={`${className} pt-8 p-3 md:p-4 overflow-x-auto whitespace-pre-wrap break-words scrollbar-hide`} style={style}>
                {tokens.map((line, i) => (
                  <div key={i} {...getLineProps({ line })} className="break-words">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </div>
                ))}
              </pre>
            )}
          </Highlight>
        </div>
      );
    }
    
    return (
      <code
        className={`${isInline ? 'bg-gray-100 dark:bg-gray-800 text-red-500 dark:text-red-400 px-1.5 py-0.5 rounded text-sm break-all' : ''} ${className}`}
        {...props}
      >
        {children}
      </code>
    );
  },
  
  // Style blockquotes
  blockquote: ({ children, ...props }) => (
    <blockquote className="border-l-4 border-gray-200 dark:border-gray-700 pl-4 my-4 italic text-gray-700 dark:text-gray-300 break-words" {...props}>
      {children}
    </blockquote>
  ),
  
  // Style links
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline break-all group"
      {...props}
    >
      {children || href}
      <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  ),
  
  // Style tables
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto scrollbar-hide my-4 max-w-full">
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Hold Shift for horizontal scroll
      </div>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm md:text-base" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead className="bg-gray-50 dark:bg-gray-800" {...props}>{children}</thead>
  ),
  th: ({ children, ...props }) => (
    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider" {...props}>
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td className="px-4 py-2 whitespace-nowrap text-gray-700 dark:text-gray-300" {...props}>
      {children}
    </td>
  ),
  tr: ({ children, ...props }) => (
    <tr className="bg-white dark:bg-gray-900 even:bg-gray-50 even:dark:bg-gray-800" {...props}>{children}</tr>
  ),

  // Style images
  img: ({ src, alt, ...props }) => (
    <img src={src} alt={alt} {...props} className="max-w-full h-auto rounded-md" />
  ),

  // Style videos
  video: ({ src, ...props }) => (
    <video src={src} {...props} className="max-w-full h-auto rounded-md" />
  ),

  // Style audio
  audio: ({ src, ...props }) => (
    <audio src={src} {...props} className="max-w-full h-auto rounded-md" />
  ),

};

export function Message({ 
  content, 
  isAI, 
  groundingMetadata, 
  onEdit, 
  edited, 
  timestamp,
}: MessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [selectedSource, setSelectedSource] = useState<number | null>(null);

  const handleSourceClick = (index: number) => {
    setSelectedSource(selectedSource === index ? null : index);
  };

  const handleEditSubmit = () => {
    if (onEdit && editedContent.trim() !== content) {
      onEdit(editedContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleEditSubmit();
    }
    // Allow normal Enter for new line
  };

  // Format sources with proper metadata
  const formatSources = (metadata?: GroundingMetadata | null): CitationSource[] => {
    if (!metadata?.webSearchSources?.length) return [];
    
    return metadata.webSearchSources.map(source => ({
      title: source.title,
      url: source.url,
      date: source.date || new Date().toISOString(),
      relevanceScore: source.relevanceScore || 0.5,
      description: source.snippet || source.description || 'No description available'
    }));
  };

  return (
    <div 
      className={`group/message flex items-start gap-3 px-4 py-2.5 md:py-3 animate-in fade-in-0 slide-in-from-bottom-4 ${isAI ? 'justify-start' : 'justify-end'}`}
      role="listitem"
      aria-label={`${isAI ? 'Assistant' : 'User'} message`}
    >
      {/* Assistant Avatar - Only shown for AI messages on the left */}
      {isAI && (
        <div className="flex-none mt-1">
          <div className="relative w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-sm">
            <Bot size={14} className="text-white" />
            <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white dark:border-gray-900" />
          </div>
        </div>
      )}

      {/* Message Content */}
      <div className={`group/content flex flex-col min-w-0 ${isAI ? 'flex-1 max-w-[85%] md:max-w-[75%]' : 'max-w-[75%] md:max-w-[65%]'}`}>
        {/* Message bubble */}
        <div className={`
          relative px-3.5 py-2.5 md:px-4 md:py-3 overflow-hidden
          ${isAI 
            ? 'bg-white dark:bg-gray-800 shadow-sm rounded-2xl rounded-tl-sm border border-gray-100 dark:border-gray-700' 
            : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-tr-sm shadow-md'
          }
        `}>
          {/* Message tail */}
          <div className={`
            absolute top-0 w-2 h-2 
            ${isAI 
              ? '-left-2 border-t border-l border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800' 
              : '-right-2 bg-blue-500'
            }
            transform rotate-45
          `} />

          {!isAI && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-2 right-2 p-1 rounded-full opacity-0 group-hover/content:opacity-100 transition-opacity hover:bg-blue-700"
              title="Edit message"
            >
              <Edit2 size={14} className="text-white" />
            </button>
          )}

          {isEditing ? (
            <div className="relative">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                onKeyDown={handleEditKeyDown}
                className="w-full resize-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-2 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 outline-none"
                rows={3}
                placeholder="Edit your message..."
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleEditCancel}
                  className="p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                  title="Cancel edit (Esc)"
                >
                  <X size={14} />
                </button>
                <button
                  onClick={handleEditSubmit}
                  className="p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                  title="Save edit (Ctrl + Enter)"
                >
                  <Check size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none break-words">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  ...MarkdownComponents,
                  // Add support for HTML in markdown for tagged files
                  span: ({ children, className }) => (
                    <span className={className}>{children}</span>
                  )
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Enhanced Citations Section */}
        {isAI && groundingMetadata?.webSearchSources && groundingMetadata.webSearchSources.length > 0 && (
          <div className="mt-4">
            <Citation
              sources={formatSources(groundingMetadata)}
              onSourceClick={handleSourceClick}
              selectedIndex={selectedSource}
              className="rounded-lg border border-gray-200 dark:border-gray-700"
              showTags={true}
            />
          </div>
        )}

        {/* Message metadata with timestamp */}
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          {timestamp && (
            <time dateTime={new Date(timestamp).toISOString()} className="flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </time>
          )}
          {edited && (
            <>
              <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
              <span>(edited)</span>
            </>
          )}
        </div>
      </div>

      {/* User Avatar - Only shown for user messages on the right */}
      {!isAI && (
        <div className="flex-none mt-1">
          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
            <User size={14} className="text-white" />
          </div>
        </div>
      )}
    </div>
  );
} 