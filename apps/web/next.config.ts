import type { NextConfig } from 'next';

const api = process.env.API_URL ?? 'http://localhost:3001';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    // Dev only: Caddy does this routing in production.
    return [
      { source: '/api/:path*', destination: `${api}/api/:path*` },
      { source: '/f/:path*', destination: `${api}/f/:path*` },
    ];
  },
};

export default nextConfig;
