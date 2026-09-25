import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Solo para pruebas locales: backend simulado en memoria (tests/fake)
  ...(process.env.DE_FAKE_BACKEND === "1"
    ? { turbopack: { resolveAlias: { "@supabase/ssr": "./tests/fake/supabase-ssr.ts" } }, distDir: ".next-fake" }
    : {}),
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
    // Reutiliza páginas ya visitadas al navegar (30 s): menos esperas entre secciones
    staleTimes: { dynamic: 30, static: 180 },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
