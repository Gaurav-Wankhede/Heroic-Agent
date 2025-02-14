"use client";

import { useState, useEffect } from 'react';
import { Star, Loader2, Linkedin, Github, Twitter } from 'lucide-react';
import PageLayout from '../page-layout';

interface Testimonial {
  _id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  socialProfiles: {
    linkedin?: string;
    github?: string;
    x?: string;
  };
  timestamp: string;
}

export default function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTestimonials() {
      try {
        console.log('Fetching testimonials...');
        const response = await fetch('/api/testimonials/all', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });
        
        console.log('Response status:', response.status);
        const contentType = response.headers.get('content-type');
        console.log('Content-Type:', contentType);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Error response:', errorText);
          try {
            const errorJson = JSON.parse(errorText);
            throw new Error(errorJson.error || `HTTP error! status: ${response.status}`);
          } catch (e) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }

        const data = await response.json();
        console.log('Received testimonials:', data);
        
        if (!Array.isArray(data)) {
          console.error('Invalid data format:', data);
          throw new Error('Invalid response format');
        }

        setTestimonials(data);
        setDebugInfo(null);
      } catch (err) {
        console.error('Error fetching testimonials:', err);
        const errorMessage = err instanceof Error ? err.message : 'An error occurred';
        setError(errorMessage);
        setDebugInfo(process.env.NODE_ENV === 'development' ? `${err}` : null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTestimonials();
  }, []);

  if (isLoading) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-gray-600 dark:text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading testimonials...</span>
            <span className="text-sm text-gray-500">This may take a few seconds</span>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="flex flex-col items-center gap-2 max-w-md mx-auto text-center">
            <div className="text-red-600 dark:text-red-400 font-semibold">
              Error: {error}
            </div>
            {debugInfo && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded">
                {debugInfo}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="min-h-screen py-16 px-4">
        {/* Header Section */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-4">
            What Our Users Say
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Discover how our AI-powered assistant is helping data scientists and analysts around the world achieve their goals.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((testimonial) => (
            <TestimonialCard key={testimonial._id} testimonial={testimonial} />
          ))}
        </div>

        {testimonials.length === 0 && (
          <div className="text-center text-gray-600 dark:text-gray-400 mt-8">
            No testimonials found.
          </div>
        )}
      </div>
    </PageLayout>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="relative group">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 opacity-0 group-hover:opacity-10 transition-opacity" />
      <div className="relative p-6 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 rounded-2xl hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
            <span className="text-lg font-semibold text-white">
              {testimonial.name.charAt(0)}
            </span>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {testimonial.name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {testimonial.role}
            </p>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          "{testimonial.content}"
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < testimonial.rating
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-300 dark:text-gray-600'
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {testimonial.socialProfiles?.linkedin && (
              <a
                href={testimonial.socialProfiles.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            )}
            {testimonial.socialProfiles?.github && (
              <a
                href={testimonial.socialProfiles.github}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
              >
                <Github className="h-4 w-4" />
              </a>
            )}
            {testimonial.socialProfiles?.x && (
              <a
                href={testimonial.socialProfiles.x}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 hover:text-blue-400 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
            )}
          </div>
        </div>
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          {new Date(testimonial.timestamp).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>
    </div>
  );
} 