import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Incluir metadata en el HTML inicial (no streaming)
  // Necesario para que WhatsApp, opengraph.xyz y otros scrapers lean los OG tags
  htmlLimitedBots: /.*/,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zwvrutncspbqlsapsknd.supabase.co',
      },
    ],
  },
};

export default nextConfig;
