import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10GB',
    },
    // @ts-ignore - property suggested by Next.js error log for middleware-related body limits
    middlewareClientMaxBodySize: '10GB',
  },
};

export default nextConfig;
