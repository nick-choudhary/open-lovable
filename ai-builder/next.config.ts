import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for better debugging
  reactStrictMode: true,

  // Typescript configuration
  typescript: {
    ignoreBuildErrors: false,
  },

  // Experimental features
  experimental: {
    // Enable server actions if needed
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Webpack configuration
  webpack: (config) => {
    // Ignore node: protocol imports in browser bundles
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      child_process: false,
    };

    return config;
  },
};

export default nextConfig;
