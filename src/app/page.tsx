import Link from "next/link";
import {
  ArrowRight, CalendarDays, ChartLine, CreditCard, ExternalLink, LayoutDashboard, PiggyBank, Scale, ShieldCheck, Target,
  Waves, Zap,
} from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";

const DATA_EDGE_URL = process.env.NEXT_PUBLIC_DATA_EDGE_URL ?? "https://dataedgeconsulting.com";

/** Curva de saldo para el mock del hero (valores ilustrativos). */
const MOCK = [42, 40, 39, 39, 36, 35, 35, 33, 30, 30, 29, 27, 27, 58, 57, 52, 51, 49, 49, 47, 46, 44, 44, 43, 41, 40, 38, 38, 36, 66];

/** Saldo de cierre ilustrativo por día (millones). */
const MOCK_CAL = (() => {
  const moves: Record<number, number> = { 1: -2, 5: -0.85, 10: -0.5, 15: -0.6, 30: 8 };
  let b = 6.2;
  return Array.from({ length: 31 }, (_, i) => {
    b += (moves[i + 1] ?? 0) - 0.06;
    return b;
  });
})();

function Sparkline() {
  const w = 320;
  const h = 96;
  const max = 70;
  const pts = MOCK.map((v, i) => `${(i / (MOCK.length - 1)) * w},${h - (v / max) * h}`);
  // escalones: el saldo cambia de un día al otro
  const step = MOCK.map((v, i) => {
    const x = (i / (MOCK.length - 1)) * w;
    const y = h - (v / max) * h;
    return i === 0 ? `M0,${y}` : `H${x}V${y}`;
  }).join("");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-24 w-full" aria-hidden>
      <path d={`${step}V${h}H0Z`} fill="#3dd6c2" fillOpacity={0.12} />
      <path d={step} fill="none" stroke="#3dd6c2" strokeWidth={2} strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r={4} fill="#3dd6c2" stroke="#0a1f3c" strokeWidth={2} />
    </svg>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = !!data?.claims?.sub;

  return (
    <div className="bg-surface">
      {/* Hero */}
      <header className="relative overflow-hidden bg-navy-950 text-white">
        <div className="pointer-events-none absolute -top-48 right-[-10%] size-[640px] rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-[-30%] left-[-10%] size-[520px] rounded-full bg-navy-600/40 blur-3xl" />
        <nav className="relative mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <Logo tone="light" />
          <div className="flex items-center gap-2 sm:gap-6">
            <a href="#como-funciona" className="hidden text-sm font-semibold text-white/70 hover:text-white sm:block">
              Cómo funciona
            </a>
            <a href="#modulos" className="hidden text-sm font-semibold text-white/70 hover:text-white sm:block">
              Módulos
            </a>
            {signedIn ? (
              <ButtonLink href="/inicio" size="sm">
                Ir a mi tablero
              </ButtonLink>
            ) : (
              <>
                <Link href="/login" className="px-2 text-sm font-semibold text-white/80 hover:text-white">
                  Ingresar
                </Link>
                <ButtonLink href="/registro" size="sm">
                  Comenzar gratis
                </ButtonLink>
              </>
            )}
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pt-10 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-16 lg:pb-28">
          <div className="animate-fade-up">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-wide text-teal-300 ring-1 ring-white/15">
              <Zap className="size-3.5" /> Tu dinero. Tu familia. Tus decisiones.
            </p>
            <h1 className="mt-6 font-display text-[48px] leading-[1.02] font-semibold sm:text-[64px]">
              Tu dinero.
              <br />
              <span className="text-teal-300">Bajo control.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
              Organiza tus finanzas personales y familiares, controla tus gastos, planifica tus metas y entiende hacia dónde va tu dinero.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href={signedIn ? "/inicio" : "/registro"} size="lg">
                {signedIn ? "Ir a mi tablero" : "Comenzar gratis"} <ArrowRight className="size-4" />
              </ButtonLink>
              <a
                href="#como-funciona"
                className="inline-flex h-13 items-center rounded-xl px-6 text-base font-semibold text-white ring-1 ring-white/25 hover:bg-white/10"
              >
                Ver cómo funciona
              </a>
            </div>
            <a href={DATA_EDGE_URL} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-teal-300">
              Conoce Data Edge Consulting <ExternalLink className="size-3.5" />
            </a>
          </div>

          {/* Mock del producto (ilustrativo) */}
          <div className="relative animate-fade-up [animation-delay:120ms]" aria-label="Vista previa ilustrativa del tablero">
            <div className="rounded-[1.75rem] bg-white/[0.06] p-3 ring-1 ring-white/10 backdrop-blur">
              <div className="rounded-[1.35rem] bg-navy-900 p-5 ring-1 ring-white/10">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold text-white/50">Disponible hoy</p>
                    <p className="num text-3xl font-bold">$ 4.180.000</p>
                  </div>
                  <span className="rounded-full bg-teal-400/15 px-2 py-1 text-xs font-bold text-teal-300">+19,2% ahorro</span>
                </div>
                <Sparkline />
                <p className="text-xs text-white/50">Saldo proyectado · próximos 30 días</p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[
                  { l: "Ingresos", v: "$ 8,5 M", c: "text-teal-300" },
                  { l: "Gastos", v: "$ 5,2 M", c: "text-white" },
                  { l: "Ahorro", v: "$ 3,3 M", c: "text-white" },
                ].map((k) => (
                  <div key={k.l} className="rounded-2xl bg-navy-900 p-3 ring-1 ring-white/10">
                    <p className="text-[11px] text-white/50">{k.l}</p>
                    <p className={`num text-sm font-bold ${k.c}`}>{k.v}</p>
                  </div>
                ))}
              </div>
              <ul className="mt-3 space-y-2 rounded-2xl bg-navy-900 p-4 text-sm ring-1 ring-white/10">
                {[
                  { d: "30 sep", t: "Salario", v: "+ $ 8.000.000", c: "text-teal-300" },
                  { d: "1 oct", t: "Arriendo", v: "− $ 2.000.000", c: "text-white/90" },
                  { d: "5 oct", t: "Pago tarjeta Visa", v: "− $ 850.000", c: "text-white/90" },
                  { d: "10 oct", t: "Aporte inversión", v: "− $ 500.000", c: "text-white/90" },
                ].map((r) => (
                  <li key={r.t} className="flex items-center gap-3">
                    <span className="w-12 text-xs font-bold text-white/40">{r.d}</span>
                    <span className="flex-1 text-white/80">{r.t}</span>
                    <span className={`num font-semibold ${r.c}`}>{r.v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-2 text-center text-[11px] text-white/35">Cifras ilustrativas</p>
          </div>
        </div>
      </header>

      {/* Cómo funciona */}
      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-20 sm:px-8">
        <p className="text-sm font-bold tracking-[0.16em] text-teal-600 uppercase">Cómo funciona</p>
        <h2 className="mt-2 max-w-2xl font-display text-4xl font-semibold text-ink">De registrar gastos a saber cuánto tendrás mañana.</h2>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { n: "01", t: "Conecta tu realidad", d: "Agrega tus cuentas, billeteras y tarjetas con su saldo de hoy. En minutos, no en horas." },
            { n: "02", t: "Programa lo que viene", d: "Salario, arriendo, servicios, cuotas y tarjetas. Una vez, y se repiten solos." },
            { n: "03", t: "Mira hacia adelante", d: "El flujo de caja futuro te dice, día por día, cuánto dinero tendrás disponible." },
          ].map((s) => (
            <div key={s.n} className="card p-6">
              <p className="font-display text-4xl font-semibold text-teal-500">{s.n}</p>
              <p className="mt-4 text-lg font-bold text-ink">{s.t}</p>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Diferencial */}
      <section className="bg-canvas">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2">
          <div>
            <p className="text-sm font-bold tracking-[0.16em] text-teal-600 uppercase">Flujo de caja futuro</p>
            <h2 className="mt-2 font-display text-4xl font-semibold text-ink">Tu calendario también habla de tu dinero.</h2>
            <p className="mt-4 text-lg leading-relaxed text-muted">
              Abre cualquier día del mes y mira cuánto dinero tendrás disponible después de ingresos, gastos, tarjetas e inversiones. Si un día
              tu saldo quedaría en rojo, lo sabrás con semanas de anticipación.
            </p>
            <ul className="mt-6 space-y-3 text-[15px] text-ink-2">
              {["Pago estimado de tarjetas según su fecha límite", "Alertas cuando tu saldo proyectado baja de cero", "Vista diaria, semanal y mensual"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="grid size-6 place-items-center rounded-full bg-teal-500 text-navy-950">
                    <ArrowRight className="size-3.5" />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-5" aria-label="Calendario ilustrativo">
            <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-muted">
              {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - 1;
                const inMonth = day >= 1 && day <= 31;
                const bal = inMonth ? MOCK_CAL[day - 1] : 0;
                const events: Record<number, string> = { 1: "bg-series-out", 5: "bg-series-out", 10: "bg-navy-500", 15: "bg-series-out", 30: "bg-series-in" };
                return (
                  <div key={i} className={`flex h-16 flex-col justify-between rounded-lg p-1.5 text-left ${inMonth ? "bg-canvas" : ""}`}>
                    {inMonth && (
                      <>
                        <span className="flex items-center justify-between text-[11px] font-bold text-ink">
                          {day}
                          {events[day] && <span className={`size-1.5 rounded-full ${events[day]}`} />}
                        </span>
                        <span className="num text-right text-[10px] font-bold text-teal-700">{bal.toFixed(1).replace(".", ",")} M</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-center text-[11px] text-muted">Saldo estimado al cierre de cada día · cifras ilustrativas</p>
          </div>
        </div>
      </section>

      {/* Módulos */}
      <section id="modulos" className="mx-auto max-w-6xl scroll-mt-10 px-5 py-20 sm:px-8">
        <p className="text-sm font-bold tracking-[0.16em] text-teal-600 uppercase">Módulos</p>
        <h2 className="mt-2 font-display text-4xl font-semibold text-ink">Una plataforma que crece contigo.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { i: LayoutDashboard, t: "Dashboard", d: "Ingresos, gastos, ahorro y variación contra el mes anterior.", ready: true },
            { i: Waves, t: "Flujo de caja", d: "Saldo disponible proyectado día a día.", ready: true },
            { i: CalendarDays, t: "Calendario", d: "Pagos, cobros, cortes de tarjeta y eventos.", ready: true },
            { i: CreditCard, t: "Tarjetas", d: "Cupo, uso, fechas de corte y pago con alertas.", ready: true },
            { i: PiggyBank, t: "Presupuesto", d: "Por categoría con alertas al 50, 75, 90 y 100%.", ready: false },
            { i: Target, t: "Metas", d: "Cuánto ahorrar al mes para llegar a tiempo.", ready: false },
            { i: ChartLine, t: "Inversiones", d: "CDT, fondos, acciones y cripto en un solo lugar.", ready: false },
            { i: Scale, t: "Patrimonio", d: "Activos menos pasivos y su evolución.", ready: false },
            { i: ShieldCheck, t: "Mi familia", d: "Finanzas del hogar con roles y permisos.", ready: false },
          ].map((m) => (
            <div key={m.t} className="card flex gap-4 p-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-teal-300">
                <m.i className="size-5" />
              </span>
              <div>
                <p className="flex items-center gap-2 font-bold text-ink">
                  {m.t}
                  {!m.ready && <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted uppercase">Pronto</span>}
                </p>
                <p className="mt-1 text-sm text-muted">{m.d}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Ecosistema */}
      <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <div className="relative overflow-hidden rounded-[2rem] bg-navy-950 p-8 text-white sm:p-12">
          <div className="pointer-events-none absolute -right-20 -bottom-24 size-80 rounded-full bg-teal-500/20 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-bold tracking-[0.16em] text-teal-300 uppercase">Data Edge Consulting</p>
              <p className="mt-3 font-display text-2xl font-semibold">Ayuda al empresario a entender y administrar las finanzas de su empresa.</p>
            </div>
            <div>
              <p className="text-sm font-bold tracking-[0.16em] text-teal-300 uppercase">Data Edge Finanzas</p>
              <p className="mt-3 font-display text-2xl font-semibold">Ayuda a la persona y a su familia a entender y administrar su dinero.</p>
            </div>
          </div>
          <div className="relative mt-10 flex flex-wrap gap-3">
            <ButtonLink href={signedIn ? "/inicio" : "/registro"}>{signedIn ? "Ir a mi tablero" : "Comenzar gratis"}</ButtonLink>
            <a href={DATA_EDGE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold ring-1 ring-white/25 hover:bg-white/10">
              ¿Tienes un negocio? Conoce Data Edge Empresas <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-muted sm:px-8">
          <Logo />
          <p className="max-w-xl text-xs">
            Data Edge Finanzas ofrece herramientas de organización y análisis de tu propia información. No constituye asesoría financiera,
            tributaria ni de inversión. Tratamiento de datos conforme a la Ley 1581 de 2012.
          </p>
        </div>
      </footer>
    </div>
  );
}
