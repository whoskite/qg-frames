import type { Configuration } from 'webpack';
import path from 'path';

/** @type {import('next').NextConfig} */
const config = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
  },
  webpack: (config: Configuration) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.join(__dirname, 'src'),
      '~': path.join(__dirname, 'src'),
    };
    return config;
  },
};

export default config;
