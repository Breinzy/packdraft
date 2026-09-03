import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'tcgplayer-cdn.tcgplayer.com',
        pathname: '/product/**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/dashboard', destination: '/overview', permanent: false },
      { source: '/career', destination: '/sandbox', permanent: false },
      { source: '/career/leaderboard', destination: '/sandbox/leaderboard', permanent: false },
      { source: '/assets', destination: '/market', permanent: false },
      { source: '/predictions', destination: '/events', permanent: false },
      { source: '/predictions/:path*', destination: '/events/:path*', permanent: false },
      { source: '/asset/:id', destination: '/assets/:id', permanent: false },
    ];
  },
};

export default nextConfig;
