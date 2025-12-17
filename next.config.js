/** @type {import('next').NextConfig} */
const nextConfig = {
  // OpenAI APIキーがないため、完全静的エクスポートモードを有効化
  // これにより完全オフライン対応のPWAとして動作します
  output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
