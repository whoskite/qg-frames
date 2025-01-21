/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self' https://*.vercel.app https://funquotes-test.vercel.app https://cdn.ngrok.com; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://*.googletagmanager.com https://www.google-analytics.com https://*.google-analytics.com; style-src 'self' 'unsafe-inline'; font-src 'self' data: https://fonts.gstatic.com https://*.ngrok.com https://assets.ngrok.com https://cdn.ngrok.com; img-src 'self' data: https: blob: https://*.google-analytics.com https://www.googletagmanager.com; connect-src 'self' data: https://*.vercel.app https://funquotes-test.vercel.app https://*.firebaseio.com https://*.googleapis.com https://*.ngrok.com https://*.google-analytics.com https://www.googletagmanager.com https://analytics.google.com; frame-src 'self' https://*.vercel.app https://funquotes-test.vercel.app; media-src 'self' https://*.vercel.app https://funquotes-test.vercel.app;"
          }
        ]
      }
    ];
  },
  images: {
    domains: ['media.giphy.com', 'i.giphy.com'],
  },
};

module.exports = nextConfig; 