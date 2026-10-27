import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Function arguments can contain credentials and private document text.
  logging: { serverFunctions: false },
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/projects/*/reinforcement-requests/*/analysis": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
