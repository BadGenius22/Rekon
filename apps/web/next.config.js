/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@rekon/ui", "@rekon/utils", "@rekon/types", "@rekon/config"],
};

module.exports = nextConfig;

