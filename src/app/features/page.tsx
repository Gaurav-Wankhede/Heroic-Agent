"use client";

import { Bot, Brain, Code, Database, LineChart, Sparkles, Zap, Search, Globe, Lock, Cpu, MessageSquare } from 'lucide-react';
import PageLayout from '../page-layout';

const features = [
  {
    title: "Domain-Specific Expertise",
    description: "Get expert assistance across multiple domains including Excel, SQL, Python, Machine Learning, and more.",
    icon: Brain,
    gradient: "from-blue-500 to-violet-500"
  },
  {
    title: "Real-Time AI Responses",
    description: "Experience instant, streaming responses powered by Google's Gemini AI technology.",
    icon: Zap,
    gradient: "from-purple-500 to-pink-500"
  },
  {
    title: "Smart Context Awareness",
    description: "AI maintains context within each domain, ensuring relevant and focused assistance.",
    icon: Bot,
    gradient: "from-green-500 to-teal-500"
  },
  {
    title: "Latest Information Updates",
    description: "Stay current with the latest developments, features, and best practices in your chosen domain.",
    icon: Search,
    gradient: "from-orange-500 to-red-500"
  }
];

const workflowSteps = [
  {
    title: "Choose Your Domain",
    description: "Select from a wide range of specialized domains tailored to your needs.",
    icon: Globe,
    gradient: "from-blue-600 to-indigo-600"
  },
  {
    title: "Ask Your Question",
    description: "Get instant, domain-specific answers from our AI assistant.",
    icon: MessageSquare,
    gradient: "from-violet-600 to-purple-600"
  },
  {
    title: "Receive Expert Guidance",
    description: "Obtain detailed explanations, code examples, and best practices.",
    icon: Cpu,
    gradient: "from-pink-600 to-rose-600"
  }
];


export default function FeaturesPage() {
  return (
    <PageLayout>
      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
            <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
          </div>

          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-6">
                Powerful Features for Data Science Excellence
              </h1>
              <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400">
                Experience the next generation of AI-powered assistance with our comprehensive suite of features.
              </p>
            </div>
          </div>
        </section>

        {/* Core Features Grid */}
        <section className="py-16 bg-gray-50/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
              Core Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
              {features.map((feature, index) => (
                <div key={index} className="group relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                  <div className="relative p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
                    <div className={`w-12 h-12 mb-4 rounded-lg bg-gradient-to-r ${feature.gradient} flex items-center justify-center`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">
              How It Works
            </h2>
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {workflowSteps.map((step, index) => (
                  <div key={index} className="relative group">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                    <div className="relative p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors h-full">
                      <div className={`w-12 h-12 mb-4 rounded-lg bg-gradient-to-r ${step.gradient} flex items-center justify-center`}>
                        <step.icon className="h-6 w-6 text-white" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
                        {step.title}
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        {step.description}
                      </p>
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-8 text-gray-400 dark:text-gray-600">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-8 h-8">
                          <path d="M9 5l7 7-7 7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

      </div>
    </PageLayout>
  );
} 