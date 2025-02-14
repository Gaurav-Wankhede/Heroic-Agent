import { Header } from '@/components/landing/Header';
import ChatInterface from '@/components/chat/ChatInterface';
import { Bot } from 'lucide-react';
import type { Metadata } from 'next';

type Props = {
  params: { domain: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

export function generateMetadata({ params }: Props): Metadata {
  const domainName = params.domain.replace('-', ' ');
  return {
    title: `${domainName} Assistant - Heroic Agent`,
    description: `Get expert help with ${domainName} from our AI-powered assistant.`
  };
}

export default function DomainChatPage({ params }: Props) {
  const domainName = params.domain.replace('-', ' ');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      <main className="container mx-auto px-4 py-6 pt-20">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold capitalize bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
                  {domainName} Assistant
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Powered by Gemini AI
                </p>
              </div>
            </div>
          </div>
          
          {/* Chat container with enhanced styling */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden backdrop-blur-sm">
            <ChatInterface domain={params.domain} />
          </div>
        </div>
      </main>
    </div>
  );
} 