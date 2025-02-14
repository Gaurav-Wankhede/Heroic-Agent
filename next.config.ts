import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from "webpack";

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
  webpack: (config: WebpackConfig) => {
    config.experiments = {
      ...config.experiments,
      topLevelAwait: true,
      layers: true
    };

    return config;
  },
  serverExternalPackages: ["mongoose"],
  env: {
    MONGODB_URI: process.env.MONGODB_URI,
  }
};

export default nextConfig;
