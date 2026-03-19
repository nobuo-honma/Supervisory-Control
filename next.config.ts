import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/Supervisory-Control',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
