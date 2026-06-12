import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    // Epingle la racine au projet : sinon Next remonte sur un lockfile parent
    // (~/package-lock.json) et le tracing des fichiers est fausse.
    root: import.meta.dirname,
  },
  // En-têtes de sécurité applicatifs (défense en profondeur). La CSP/COOP est
  // gérée au bord par Traefik en prod ; ici on pose les bases non conflictuelles.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];
  },
};

export default nextConfig;
