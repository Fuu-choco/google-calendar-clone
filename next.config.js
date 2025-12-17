/** @type {import('next').NextConfig} */
const nextConfig = {
  // AI機能を使用するため、静的エクスポートモードを無効化
  // 静的エクスポートが必要な場合は、output: 'export' を有効にしてください
  // （ただし、その場合はAI機能は使用できません）
  // output: 'export',
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;
