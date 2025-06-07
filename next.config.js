// next.config.js
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    esmExternals: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Disable ESLint during build
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@components": path.join(__dirname, "components"),
      "@hooks":      path.join(__dirname, "hooks"),
      "@lib":        path.join(__dirname, "lib"),
      "@styles":     path.join(__dirname, "styles"),
    };
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.tsx'],
    };
    return config;
  },
};

module.exports = nextConfig;