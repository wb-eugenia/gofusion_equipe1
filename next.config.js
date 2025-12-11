/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pour Cloudflare Pages - export statique
  output: 'export',
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://gamification-app.wbouzidane.workers.dev',
  },
  // Ignorer les routes dynamiques pour l'export statique
  generateBuildId: async () => {
    return 'build-' + Date.now();
  },
};

module.exports = nextConfig;
