import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Studio used to live in the lab; it is the home page now.
  async redirects() {
    return [{ source: "/lab/studio", destination: "/", permanent: true }];
  },
};

export default nextConfig;
