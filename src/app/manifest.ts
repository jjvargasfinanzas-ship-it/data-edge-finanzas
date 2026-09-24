import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Data Edge Finanzas",
    short_name: "DE Finanzas",
    description: "Tu dinero. Bajo control. Finanzas personales y familiares con flujo de caja futuro.",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F6FA",
    theme_color: "#0A1F3C",
    lang: "es-CO",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nuevo gasto", url: "/movimientos", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Flujo de caja", url: "/flujo-de-caja", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
