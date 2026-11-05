import type { NextConfig } from 'next';
import path from 'path';

// 注意：禁止在此硬编码任何密钥/Token，全部通过环境变量注入

const nextConfig: NextConfig = {
  serverExternalPackages: ['coze-coding-dev-sdk'],
  webpack: (config, { dev }) => {
    if (dev && config.cache && config.cache.type === 'filesystem') {
      config.cache.cacheDirectory = path.resolve(
        'node_modules/.cache/next-webpack',
      );
    }
    return config;
  },
  allowedDevOrigins: ['*.dev.coze.site'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
