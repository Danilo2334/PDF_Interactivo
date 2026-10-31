import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  headers() { return ["/read/:path*", "/api/read/:path*", "/projects/:projectId/reader-test/:path*", "/api/projects/:projectId/reader-test/:path*"].map(source => ({ source, headers: [
    { key: "Referrer-Policy", value: "no-referrer" }, { key: "X-Robots-Tag", value: "noindex, nofollow" },
    { key: "X-Content-Type-Options", value: "nosniff" }, { key: "Cache-Control", value: "private, no-store" },
    { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  ] })); },
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
