/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['media1.giphy.com', 'media3.giphy.com', 'media2.giphy.com', 'media4.giphy.com', 'media0.giphy.com'],
  },
  // Add source directory configuration
  distDir: '.next',
  experimental: {
    appDir: true,
  },
};

export default nextConfig;