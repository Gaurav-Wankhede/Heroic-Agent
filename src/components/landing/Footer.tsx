"use client";

import Link from 'next/link';
import { Github, Twitter, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className="w-full border-t border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Heroic Agent
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Your AI-powered companion for all data science tasks.
            </p>
            <div className="flex space-x-4">
              <Link href="https://github.com/Gaurav-Wankhede" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                <Github className="h-5 w-5" />
              </Link>
              <Link href="https://x.com/GTechverse16703" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                <Twitter className="h-5 w-5" />
              </Link>
              <Link href="https://www.linkedin.com/in/wankhede-gaurav/" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                <Linkedin className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="https://gaurav-wankhede.vercel.app/" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Portfolio
                </Link>
              </li>
              <li>
                <Link href="/domains" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  All Domains
                </Link>
              </li>
              <li>
                <Link href="/features" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/testimonials" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Testimonials
                </Link>
              </li>
            </ul>
          </div>

          {/* Domains */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Popular Domains</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/domains/python" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Python
                </Link>
              </li>
              <li>
                <Link href="/domains/machine-learning" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Machine Learning
                </Link>
              </li>
              <li>
                <Link href="/domains/deep-learning" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  Deep Learning
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">Contact</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-gray-600 dark:text-gray-400">
                <Link href="mailto:pgywww@gmail.com">
                  Email: pgywww@gmail.com
                </Link>
              </li>
              <li className="text-gray-600 dark:text-gray-400">
              Address: 
                <Link href="https://www.google.com/maps/place/India+🧡🤍💚" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">
                  India 🧡🤍💚
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-800">
          <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear() === 2025 ? '2025' : new Date().getFullYear()} Heroic Agent. All rights reserved. Presented by <Link href="https://gaurav-wankhede.vercel.app/" className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400">💗Gaurav Wankhede</Link>
          </p>
        </div>
      </div>
    </footer>
  );
} 