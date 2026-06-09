import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    // Epingle la racine au projet : sinon Next remonte sur un lockfile parent
    // (~/package-lock.json) et le tracing des fichiers est fausse.
    root: import.meta.dirname,
  },
};

export default nextConfig;
