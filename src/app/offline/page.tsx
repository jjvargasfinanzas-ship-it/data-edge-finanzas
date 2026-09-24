import { WifiOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <Logo className="justify-center" />
        <div className="mx-auto mt-10 grid size-14 place-items-center rounded-2xl bg-teal-50 text-teal-600">
          <WifiOff className="size-7" />
        </div>
        <h1 className="mt-5 font-display text-3xl font-semibold text-ink">Sin conexión</h1>
        <p className="mt-2 max-w-sm text-muted">Por seguridad, tus datos financieros no se guardan en el dispositivo. Vuelve a intentarlo cuando tengas internet.</p>
      </div>
    </main>
  );
}
