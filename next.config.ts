import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";
import packageJson from "./package.json";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  workboxOptions: {
    skipWaiting: true,
    clientsClaim: true
  }
});

const nextConfig: NextConfig = {
  env: {
    APP_VERSION: packageJson.version
  }
};

export default withPWA(nextConfig);
