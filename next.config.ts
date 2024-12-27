import type { NextConfig } from "next";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const appUrl = process.env.NEXT_PUBLIC_URL || "https://qg-frames.vercel.app"; // Make sure this matches your deployed URL

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  images: {
    domains: ['media1.giphy.com', 'media3.giphy.com', 'media2.giphy.com', 'media4.giphy.com', 'media0.giphy.com', 'https://qg-frames.vercel.app/'],
  }
};

export default nextConfig;