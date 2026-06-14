import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true, //ビルド時のTypeScriptエラーを無視(ハッカソン提出用)
  },
};

export default nextConfig;
