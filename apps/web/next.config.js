/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@rekon/ui",
    "@rekon/utils",
    "@rekon/types",
    "@rekon/config",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "polymarket-upload.s3.us-east-2.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "polymarket.com",
        pathname: "/**",
      },
    ],
  },
};

module.exports = nextConfig;
