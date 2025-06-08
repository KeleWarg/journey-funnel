// next.config.js
const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    esmExternals: true,
    forceSwcTransforms: true,
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
  webpack: (config, { isServer, dev }) => {
    // Handle node modules that aren't compatible with webpack
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        child_process: false,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }
    
    // Improve cache reliability in development
    if (dev) {
      config.cache = {
        type: 'memory',
      };
    }
    
    // Add externals for server-side only modules
    if (!isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@modelcontextprotocol/sdk': 'commonjs @modelcontextprotocol/sdk',
        'cross-spawn': 'commonjs cross-spawn',
      });
    }
    
    return config;
  },
  // Configure allowed origins for CORS warnings
  async headers() {
    return [
      {
        source: '/_next/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;