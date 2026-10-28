import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // On Windows, avoid the PostCSS child-process socket that can exit before
  // Turbopack connects. Other platforms retain Next's default runtime.
  ...(process.platform === "win32" ? {
    experimental: { turbopackPluginRuntimeStrategy: "workerThreads" as const },
  } : {}),
  // Server Function arguments can contain credentials and private document text.
  logging: { serverFunctions: false },
  serverExternalPackages: ["pdfjs-dist"],
  outputFileTracingIncludes: {
    "/api/projects/*/reinforcement-requests/*/analysis": ["./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"],
  },
};

export default nextConfig;
