/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/types", "@repo/core"],
  reactStrictMode: true,
  // Suppress hydration warnings from browser extensions (like Grammarly)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;

