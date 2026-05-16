import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/sitemap.xml",
        has: [{ type: "host", value: "www.boldverseproperty.com" }],
        destination: "https://boldverseproperty.com/sitemap.xml",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
