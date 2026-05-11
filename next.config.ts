import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10GB',
    },
    proxyClientMaxBodySize: '10GB',
  },
};

export default nextConfig;
