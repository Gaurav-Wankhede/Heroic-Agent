import { Header } from '@/components/landing/Header';
import { Bot, AlertTriangle } from 'lucide-react';
import { Metadata } from 'next';
import { isGenAIInitialized } from '@/lib/genai';
import DomainChat from './domain-chat';
import { notFound } from 'next/navigation';
import ChatInterface from '@/components/chat/ChatInterface';

// Define valid domains
const VALID_DOMAINS = [
  'python',
  'machine-learning',
  'deep-learning',
  'data',
  'excel',
  'sql',
  'power-bi',
  'tableau',
  'nlp',
  'generative-ai',
  'linkedin-optimization',
  'resume-creation',
  'online-credibility'
  
] as const;

type DomainType = typeof VALID_DOMAINS[number];

interface Props {
  params: {
    domain: string;
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = params;
  
  if (!VALID_DOMAINS.includes(domain as DomainType)) {
    return {
      title: 'Invalid Domain - Heroic Agent',
      description: 'This domain is not supported.'
    };
  }

  const domainName = domain.replace('-', ' ');
  return {
    title: `${domainName} Assistant - Heroic Agent`,
    description: `Get expert help with ${domainName} from our AI-powered assistant.`,
    openGraph: {
      title: `${domainName} Assistant - Heroic Agent`,
      description: `Get expert help with ${domainName} from our AI-powered assistant.`,
    },
  };
}

function ErrorDisplay({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 md:p-8 text-center">
      <AlertTriangle className="h-10 w-10 md:h-12 md:w-12 text-yellow-500 mb-4" />
      <h2 className="text-lg md:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
        Service Unavailable
      </h2>
      <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 max-w-md">
        {message}
      </p>
      <p className="text-xs md:text-sm text-gray-500 dark:text-gray-500 mt-4">
        Please try again later or contact support if the issue persists.
      </p>
    </div>
  );
}

// Add generateStaticParams to define valid paths at build time
export async function generateStaticParams() {
  return VALID_DOMAINS.map((domain) => ({
    domain: domain,
  }));
}

export default async function DomainChatPage({ params }: Props) {
  const { domain } = params;

  // Validate domain against exact list of valid domains
  if (!VALID_DOMAINS.includes(domain as DomainType)) {
    notFound();
  }

  // Check if Gemini AI is initialized
  if (!isGenAIInitialized()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="max-w-4xl mx-auto">
            <ErrorDisplay message="AI service is currently unavailable. Please check your API key configuration." />
          </div>
        </main>
      </div>
    );
  }

  try {
    return <ChatInterface domain={domain} />;
  } catch (error) {
    console.error('Error rendering DomainChat:', error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <main className="container mx-auto px-4 py-6 pt-20">
          <div className="max-w-4xl mx-auto">
            <ErrorDisplay message="An error occurred while loading the chat interface. Please try again later." />
          </div>
        </main>
      </div>
    );
  }
} 