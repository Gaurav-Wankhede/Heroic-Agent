"use client";

import { useState, useEffect } from 'react';
import { Star, Loader2, ArrowRight, Linkedin, Github, Twitter } from 'lucide-react';
import Link from 'next/link';

interface Testimonial {
  _id: string;
  name: string;
  role: string;
  content: string;
  rating: number;
  socialProfiles?: {
    linkedin?: string;
    github?: string;
    x?: string;
  };
  timestamp: string;
}

export default function LatestTestimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLatestTestimonials() {
      try {
        const response = await fetch('/api/testimonials');
        if (!response.ok) throw new Error('Failed to fetch testimonials');
        const data = await response.json();
        setTestimonials(data);
      } catch (error) {
        console.error('Error fetching testimonials:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLatestTestimonials();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600 dark:text-gray-400" />
      </div>
    );
  }

  if (testimonials.length === 0) {
    return (
      <div className="text-center text-gray-600 dark:text-gray-400">
        No testimonials yet. Be the first to share your experience!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {testimonials.map((testimonial) => (
        <div key={testimonial._id} className="relative group">
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
          </div>
        </div>
      ))}
    </div>
  );
} 