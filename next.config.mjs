/** @type {import('next').NextConfig} */
const nextConfig = {
  // Off so the intro timeline doesn't double-fire in dev
  reactStrictMode: false,
  output: 'export',
  assetPrefix: './',
  images: { unoptimized: true },
}

export default nextConfig
