import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ray-ui ships TypeScript source and CSS modules. Next compiles them with the app.
  transpilePackages: ["ray-ui"],
};

export default nextConfig;
