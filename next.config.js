/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    unoptimized: true,
  },
  basePath: "",
  assetPrefix: "",
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  // TypeScriptの設定
  typescript: {
    ignoreBuildErrors: false,
  },
  // ESLintの設定
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
