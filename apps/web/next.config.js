/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@repo/types", "@repo/core"],
};

module.exports = nextConfig;

