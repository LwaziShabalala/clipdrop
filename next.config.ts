import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/ingest/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ingest/array/:path*",
        destination: "https://us-assets.i.posthog.com/array/:path*",
      },
      {
        source: "/ingest/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
    ];
  },
  skipTrailingSlashRedirect: true,
  experimental: {
    // Default request body cap is 10MB, which was silently truncating video
    // uploads before they even reached /api/upload. Both names are set
    // together since Next.js has renamed this option across recent
    // versions (from "middleware" to "proxy" terminology).
    proxyClientMaxBodySize: "500mb",
    middlewareClientMaxBodySize: "500mb",
  },
};

export default nextConfig;