"use client";

import { Header } from '@/components/landing/Header';
import ChatInterface from '@/components/chat/ChatInterface';
import { Bot } from 'lucide-react';
import { memo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

interface DomainChatProps {
  domain: string;
}

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="text-red-500 mb-4">
        <Bot className="h-12 w-12" />
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Something went wrong
      </h2>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-4">
        {error.message}
      </p>
      <button
        onClick={resetErrorBoundary}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

const MemoizedChatInterface = memo(ChatInterface);

function DomainChat({ domain }: DomainChatProps) {
  const domainName = domain.replace('-', ' ');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-6 pt-20">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold capitalize bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                  {domainName} Assistant
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Powered by Gemini AI
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
            <ErrorBoundary
              FallbackComponent={ErrorFallback}
              onReset={() => {
                // Reset the chat state when recovering from an error
                window.location.reload();
              }}
            >
              <MemoizedChatInterface domain={domain} />
            </ErrorBoundary>
          </div>
        </div>
      </main>
    </div>
  );
}

export default memo(DomainChat); 