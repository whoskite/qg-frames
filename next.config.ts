import type { NextConfig } from "next";

const appUrl = "https://example.com"; // Replace with your actual URL

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    domains: ['media1.giphy.com', 'media3.giphy.com', 'media2.giphy.com', 'media4.giphy.com', 'media0.giphy.com'],
  }
};

export default nextConfig;