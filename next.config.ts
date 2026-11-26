import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin the app root to this folder. A cloned site in sites/<name>/ sits inside the
  // template, so without this Next.js would find the template's lockfile and treat the
  // template folder as the workspace root.
  outputFileTracingRoot: __dirname,
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
