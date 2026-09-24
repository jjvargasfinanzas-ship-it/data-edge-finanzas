import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { CalendarDays, ShieldCheck, Waves } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden bg-navy-950 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -top-40 -right-40 size-[520px] rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-52 -left-24 size-[480px] rounded-full bg-navy-600/40 blur-3xl" />
        <Link href="/" className="relative">
          <Logo tone="light" />
        </Link>
        <div className="relative mt-auto max-w-md">
          <p className="font-display text-[44px] leading-[1.05] font-semibold">
            Tu dinero.
            <br />
            <span className="text-teal-300">Bajo control.</span>
          </p>
          <p className="mt-5 text-[15px] leading-relaxed text-white/70">
            Mira hoy cuánto dinero tendrás cada día del próximo mes, después de ingresos, pagos y tarjetas.
          </p>
          <ul className="mt-10 space-y-4 text-sm text-white/80">
            {[
              { i: Waves, t: "Flujo de caja futuro día a día" },
              { i: CalendarDays, t: "Calendario que conecta fechas y dinero" },
              { i: ShieldCheck, t: "Tus datos aislados y protegidos con RLS" },
            ].map(({ i: I, t }) => (
              <li key={t} className="flex items-center gap-3">
                <span className="grid size-8 place-items-center rounded-lg bg-white/10 text-teal-300">
                  <I className="size-4" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <Link href="/" className="lg:hidden">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10 animate-fade-up">{children}</div>
      </main>
    </div>
  );
}
