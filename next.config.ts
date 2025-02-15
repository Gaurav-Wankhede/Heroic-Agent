import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";
import path from 'path';

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  },
  webpack: (config: WebpackConfig, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      layers: true
    };

    // Initialize resolve and alias if they don't exist
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }

    return config;
  },
  serverExternalPackages: ["mongoose"],
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  },
  // Add headers for PDF.js worker
  async headers() {
    return [
      {
        source: '/pdf.worker.min.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
