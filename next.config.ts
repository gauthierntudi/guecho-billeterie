import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Accès dev depuis le réseau local (ex. téléphone sur 192.168.x.x)
  allowedDevOrigins: ["192.168.1.70"],
  // Évite que Turbopack prenne /Users/mac/Documents comme racine
  // à cause du package-lock.json parent.
  turbopack: {
    root: path.resolve(__dirname),
  },
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
