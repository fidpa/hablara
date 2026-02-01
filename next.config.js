// Next.js Configuration
// Guidelines: docs/reference/guidelines/CONFIG.md#nextconfigjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Tauri requires static export
  trailingSlash: true,
  // Disable ESLint during build (circular JSON structure error in react plugin)
  // ESLint still works via `pnpm lint`
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Webpack configuration for handling Node.js modules in browser
  webpack: (config, { isServer }) => {
    // Ignore Node.js modules that are not available in browser
    // (natural package has redis as dependency which requires 'net' module)
    // (@sqlite.org/sqlite-wasm requires path and crypto polyfills)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        dns: false,
        path: false,
        crypto: false,
      };
    }

    // Ignore .node binary files (onnxruntime-node for VAD)
    config.module.rules.push({
      test: /\.node$/,
      type: 'asset/resource',
    });

    return config;
  },
};

module.exports = nextConfig;
