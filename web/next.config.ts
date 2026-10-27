import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Function arguments can contain credentials and private document text.
  logging: { serverFunctions: false },
};

export default nextConfig;
