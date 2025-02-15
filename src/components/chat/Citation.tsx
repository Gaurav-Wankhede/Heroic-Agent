"use client";

import { ExternalLink, ChevronDown, ChevronUp, Clock, Percent, Tag } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export interface CitationSource {
  title: string;
  url: string;
  date: string;
  relevanceScore: number;
  description?: string;
  tags?: string[];
  domain?: string;
}

interface CitationProps {
  sources: CitationSource[];
  onSourceClick?: (index: number) => void;
  selectedIndex?: number | null;
  className?: string;
  showTags?: boolean;
}

export function Citation({ 
  sources, 
  onSourceClick, 
  selectedIndex, 
  className,
  showTags = true 
}: CitationProps) {
  if (!sources.length) return null;

  return (
    <div className={cn('divide-y divide-gray-100 dark:divide-gray-700/50 rounded-lg overflow-hidden', className)}>
      {sources.map((source, index) => {
        const isSelected = selectedIndex === index;
        const relevancePercentage = Math.round(source.relevanceScore * 100);
        
        return (
          <div
            key={`${source.url}-${index}`}
            className={cn(
              'transition-colors duration-200',
              isSelected ? 'bg-gray-100/80 dark:bg-gray-700/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700/20'
            )}
          >
            <button
              onClick={() => onSourceClick?.(index)}
              className="w-full text-left px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-800 rounded-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                    <span className="truncate">{source.title}</span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={14} className="text-gray-500 dark:text-gray-400" />
                    </a>
                  </div>
                  
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      <span>{formatDistanceToNow(new Date(source.date))} ago</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Percent size={12} />
                      <div 
                        className={cn(
                          'w-2 h-2 rounded-full',
                          relevancePercentage >= 75 ? 'bg-green-500' :
                          relevancePercentage >= 50 ? 'bg-yellow-500' :
                          'bg-red-500'
                        )} 
                      />
                      <span>{relevancePercentage}% relevant</span>
                    </div>

                    {source.domain && (
                      <div className="flex items-center gap-1">
                        <Tag size={12} />
                        <span>{source.domain}</span>
                      </div>
                    )}
                  </div>

                  {showTags && source.tags && source.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {source.tags.map((tag, tagIndex) => (
                        <span
                          key={tagIndex}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex-shrink-0 pt-1">
                  {isSelected ? (
                    <ChevronUp size={16} className="text-gray-400 dark:text-gray-500" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              </div>
              
              {isSelected && source.description && (
                <div className="px-1 py-3 mt-3 text-sm text-gray-600 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700/50">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    {source.description}
                  </div>
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
} 