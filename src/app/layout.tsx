import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "@fontsource-variable/manrope";
import "./globals.css";
import { ServiceWorker } from "@/components/app/service-worker";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Data Edge Finanzas · Tu dinero. Bajo control.", template: "%s · Data Edge Finanzas" },
  description:
    "Organiza tus finanzas personales y familiares, controla tus gastos, planifica tus metas y entiende hacia dónde va tu dinero.",
  applicationName: "Data Edge Finanzas",
  appleWebApp: { capable: true, title: "DE Finanzas", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#0A1F3C",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO">
      <body className="min-h-dvh">
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            classNames: {
              toast: "!rounded-2xl !border-line !font-sans !shadow-pop",
              title: "!font-semibold !text-ink",
            },
          }}
        />
        <ServiceWorker />
      </body>
    </html>
  );
}
