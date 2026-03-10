import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for static export (for webDir in Capacitor)
  trailingSlash: true,

  // Disable image optimization (not needed with remote images)
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
