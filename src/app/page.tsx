"use client";

import { ArrowRight, Brain, Code, Database, LineChart, Sparkles, Zap, Star, Send, Loader2, Linkedin, Github, Twitter } from 'lucide-react';
import Link from 'next/link';
import PageLayout from './page-layout';
import { DonateButton } from '@/components/donate-button/index';
import { useState } from 'react';
import LatestTestimonials from '@/components/LatestTestimonials';
import { ConfirmDialog } from '@/components/chat/ConfirmDialog';

const domains = [
  { id: 'excel', name: 'Excel', description: 'Master spreadsheet manipulation, formulas, and data analysis techniques' },
  { id: 'sql', name: 'SQL', description: 'Learn database querying, optimization, and management skills' },
  { id: 'power-bi', name: 'Power BI', description: 'Create powerful business intelligence dashboards and reports' },
  { id: 'python', name: 'Python', description: 'Build data science applications and automate analysis workflows' },
  { id: 'machine-learning', name: 'Machine Learning', description: 'Implement predictive models and advanced algorithms' },
  { id: 'deep-learning', name: 'Deep Learning', description: 'Master neural networks and AI model development' }
];

export default function Home() {
  const [selectedRating, setSelectedRating] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: '',
    content: '',
    linkedin: '',
    github: '',
    x: ''
  });

  const handleTestimonialSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    const testimonialData = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      content: formData.content,
      rating: selectedRating,
      socialProfiles: {
        linkedin: formData.linkedin || undefined,
        github: formData.github || undefined,
        x: formData.x || undefined
      },
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testimonialData),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          setError('A testimonial with this email already exists');
          setShowErrorDialog(true);
        } else {
          throw new Error(data.error || 'Failed to submit testimonial');
        }
        return;
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        role: '',
        content: '',
        linkedin: '',
        github: '',
        x: ''
      });
      setSelectedRating(5);
      setSuccess('Thank you for your testimonial! It will be visible on the site shortly.');
      
    } catch (error) {
      console.error('Error submitting testimonial:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit testimonial');
      setShowErrorDialog(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <div className="relative min-h-[calc(100vh-4rem)] overflow-x-hidden">
        {/* Gradient Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
          <div className="absolute top-0 right-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/3 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000" />
        </div>

        {/* Hero Section */}
        <section className="pt-16 md:pt-24 pb-8 md:pb-12 px-4 text-center">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 bg-clip-text text-transparent mb-4 md:mb-6">
            Your AI-Powered Data Science Assistant
          </h1>
          <p className="text-base md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-6 md:mb-8 px-4">
            Unlock the power of data science with our intelligent assistant. From Python to Machine Learning, we've got you covered.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 px-4">
            <Link
              href="/domains"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Get Started <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              href="features"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100 hover:bg-white/20 dark:hover:bg-white/10 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-12 md:py-16 px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12 text-gray-900 dark:text-gray-100">
            Powerful Features
          </h2>
          <div className="container mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 max-w-7xl">
            {domains.map((domain, index) => (
              <Link key={domain.id} href={`/domains/${domain.id}`}>
                <FeatureCard
                  icon={getIconForIndex(index)}
                  title={domain.name}
                  description={domain.description}
                />
              </Link>
            ))}
          </div>
        </section>

        {/* Latest Testimonials Section */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-transparent to-gray-50 dark:to-gray-900/50">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">
                What People Say About Us
              </h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
                Discover how our AI-powered assistant is helping data scientists and analysts around the world.
              </p>
              <Link
                href="/testimonials"
                className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                See More Testimonials <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>

            {/* Latest Testimonials Component */}
            <LatestTestimonials />

            {/* Testimonial Form */}
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Share Your Experience
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  We'd love to hear about your experience with our AI assistant.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
                </div>
              )}

              <form onSubmit={handleTestimonialSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                      placeholder="your.email@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <input
                    type="text"
                    id="role"
                    name="role"
                    required
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="Your role/profession"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Your Testimonial
                  </label>
                  <textarea
                    id="content"
                    name="content"
                    required
                    rows={4}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                    placeholder="Share your experience..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rating
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setSelectedRating(rating)}
                        className="p-1 hover:scale-110 transition-transform"
                      >
                        <Star
                          className={`h-6 w-6 ${
                            rating <= selectedRating
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray-300 dark:text-gray-600'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Social Profiles (Optional)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="linkedin" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Linkedin className="h-4 w-4" />
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        id="linkedin"
                        name="linkedin"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                        placeholder="https://linkedin.com/in/username"
                        pattern="https://(www\.)?linkedin\.com/.*"
                        value={formData.linkedin}
                        onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="github" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Github className="h-4 w-4" />
                        GitHub
                      </label>
                      <input
                        type="url"
                        id="github"
                        name="github"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                        placeholder="https://github.com/username"
                        pattern="https://github\.com/.*"
                        value={formData.github}
                        onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="x" className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        <Twitter className="h-4 w-4" />
                        X (formerly Twitter)
                      </label>
                      <input
                        type="url"
                        id="x"
                        name="x"
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400"
                        placeholder="https://x.com/username"
                        pattern="https://x\.com/.*"
                        value={formData.x}
                        onChange={(e) => setFormData({ ...formData, x: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full px-6 py-3 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5" />
                      Submit Testimonial
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>

        {/* Get Started Call to Action - At the bottom */}
        <section className="py-12 md:py-16 px-4 bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-900/50 dark:to-transparent">
          <div className="container mx-auto flex justify-center">  
            <div className="flex flex-col items-center gap-4 w-full max-w-lg">
              <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 md:mb-6 text-gray-900 dark:text-gray-100">
                Ready to Get Started?
              </h2>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 text-center mb-6 md:mb-8 px-4">
                If you find this tool helpful, consider buying me a coffee! Your support helps keep this project free and updated.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <DonateButton />
                <Link
                  href="/domains"
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Error Dialog */}
        <ConfirmDialog
          isOpen={showErrorDialog}
          onClose={() => setShowErrorDialog(false)}
          onConfirm={() => setShowErrorDialog(false)}
          title="Submission Error"
          message={error || 'An error occurred while submitting your testimonial. Please try again.'}
        />
      </div>
    </PageLayout>
  );
}

function getIconForIndex(index: number) {
  const icons = [
    () => <Brain className="h-6 w-6" />,
    () => <Code className="h-6 w-6" />,
    () => <LineChart className="h-6 w-6" />,
    () => <Database className="h-6 w-6" />,
    () => <Sparkles className="h-6 w-6" />,
    () => <Zap className="h-6 w-6" />
  ];
  return icons[index] ? icons[index]() : <Brain className="h-6 w-6" />;
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="group relative h-full">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500 to-violet-500 opacity-0 group-hover:opacity-10 transition-opacity" />
      <div className="relative p-4 md:p-6 rounded-2xl bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors h-full">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-4">
          <div className="text-blue-600 dark:text-blue-400">
            {icon}
          </div>
        </div>
        <h3 className="text-lg md:text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <p className="text-sm md:text-base text-gray-600 dark:text-gray-400">
          {description}
        </p>
      </div>
    </div>
  );
}
