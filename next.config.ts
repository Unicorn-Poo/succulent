import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  generateBuildId: async () => {
    // Force cache invalidation for growth engine updates
    return `growth-engine-v2-${Date.now()}`;
  },
  typescript: {
    // Allow production builds to successfully complete even if
    // your project has TypeScript errors.
    ignoreBuildErrors: true,
  },
  eslint: {
    // Allow production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        
      },
      {
        protocol: "https",
        hostname: "instagram.ffab1-1.fna.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "pbs.twimg.com",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
      {
        protocol: "https",
        hostname: "scontent.facebook.com",
      },
      {
        protocol: "https",
        hostname: "media.licdn.com",
      },
      {
        protocol: "https",
        hostname: "*.fbcdn.net",
      },
       {
        protocol: "https",
        hostname: "*.cdninstagram.com",
      },
      {
        protocol: "https",
        hostname: "*.lunary.app",
      }
    ],
  },
};

export default nextConfig;
