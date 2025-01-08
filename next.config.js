/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "connect-src 'self'",
              "https://*.google-analytics.com",
              "https://*.analytics.google.com",
              "https://*.googletagmanager.com",
              "https://firebase.googleapis.com",
              "https://firebaseinstallations.googleapis.com",
              "https://*.cloudfunctions.net",
              "https://www.googletagmanager.com",
              "https://localhost:*",
              "http://localhost:*",
              "https://www.google-analytics.com"
            ].join(' '),
          },
          {
            key: 'Content-Security-Policy',
            value: "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://www.google-analytics.com",
          }
        ],
      },
    ];
  },
  reactStrictMode: true,
  images: {
    domains: ['media1.giphy.com', 'media3.giphy.com', 'media2.giphy.com', 'media4.giphy.com', 'media0.giphy.com'],
  },
  distDir: '.next',
  experimental: {
    appDir: true,
  },
};

module.exports = nextConfig; 