import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  compilerOptions: {
    baseUrl: ".",
    paths: {
      "@/components/*": ["./components/*"],
    },
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
    ],
  },
};

export default nextConfig;
