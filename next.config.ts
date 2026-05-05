import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@remixicon/react", "recharts"],
  },
};

export default nextConfig;
