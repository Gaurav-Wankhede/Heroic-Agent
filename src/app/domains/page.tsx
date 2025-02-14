"use client";

import { Header } from '@/components/landing/Header';
import { DomainCard } from '@/components/domains/DomainCard';

const DOMAINS = [
  {
    title: 'Excel',
    description: 'Master spreadsheet manipulation, formulas, and VBA automation',
    slug: 'excel'
  },
  {
    title: 'SQL',
    description: 'Learn database querying, manipulation, and optimization',
    slug: 'sql'
  },
  {
    title: 'Python',
    description: 'Explore data analysis with Pandas, NumPy, and visualization libraries',
    slug: 'python'
  },
  {
    title: 'Tableau', 
    description: 'Design effective visualizations and interactive dashboards',
    slug: 'tableau'
  },
  {
    title: 'Power BI',
    description: 'Create interactive dashboards with DAX and data modeling',  
    slug: 'power-bi'
  },
  {
    title: 'Machine Learning',
    description: 'Build predictive models, implement clustering, and use neural networks',
    slug: 'machine-learning'
  },
  {
    title: 'Deep Learning',
    description: 'Implement deep neural networks, convolutional neural networks, and recurrent neural networks',
    slug: 'deep-learning'
  },
  {
    title: 'NLP',
    description: 'Implement natural language processing, sentiment analysis, and text classification',
    slug: 'nlp'
  },
  {
    title: 'Generative AI',
    description: 'Implement generative AI, text generation, and image generation',
    slug: 'generative-ai'
  },
  {
    title: 'LinkedIn',
    description: 'Build your professional network, connect with industry experts, and find job opportunities',
    slug: 'linkedin-optimization'
  },
  {
    title: 'Resume',
    description: 'Create a professional resume, cover letter, and LinkedIn profile',
    slug: 'resume-creation'
  },
  {
    title: 'Online Credibility',
    description: 'Build your online presence, manage your reputation, and engage with your audience',
    slug: 'online-credibility'
  },
];

export default function DomainsPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-24">
        <h1 className="text-3xl font-bold mb-8">Choose Your Domain</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {DOMAINS.map((domain) => (
            <DomainCard key={domain.slug} {...domain} />
          ))}
        </div>
      </main>
    </>
  );
} 

