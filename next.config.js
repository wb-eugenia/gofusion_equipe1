/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pour Cloudflare Pages avec Workers
  // Le Worker sera accessible via un proxy ou directement
  reactStrictMode: true,
  swcMinify: true,
};

module.exports = nextConfig;
