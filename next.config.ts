import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    '@remotion/bundler',
    '@remotion/renderer',
    '@remotion/lambda',
    '@remotion/cli',
    '@google/generative-ai',
  ],
};

export default nextConfig;
