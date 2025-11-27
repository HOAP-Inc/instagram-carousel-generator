import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 画像の外部ホスト許可（Notionなど）
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.notion.so',
      },
      {
        protocol: 'https',
        hostname: 's3.us-west-2.amazonaws.com',
      },
    ],
  },
  // サーバーサイドでcanvasを使用するための設定
  serverExternalPackages: ['canvas'],
};

export default nextConfig;
