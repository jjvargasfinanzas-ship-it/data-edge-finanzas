import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Landmark } from "lucide-react";
import { NewObligationButton } from "@/components/app/open-buttons";
import { BarRow, ObligationCard } from "@/components/app/obligations/cards";
import { ObligationTimeline } from "@/components/app/obligations/timeline";
import { Card, EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { StatTile, TileGrid } from "@/components/ui/tiles";
import { cn } from "@/components/ui/cn";
import { formatMoney } from "@/lib/money";
import { byPriority, HORIZONS, loadObligations } from "./load";

export const metadata: Metadata = { title: "Obligaciones" };

const DIST = {
  acreedor: { label: "Acreedor", param: "acreedor" },
  tipo: { label: "Tipo", param: "tipo" },
  clase: { label: "Persona / entidad", param: "clase" },
} as const;
type DistKey = keyof typeof DIST;

function SectionTitle({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export default async function ObligacionesPage({ searchParams }: { searchParams: Promise<{ horizonte?: string; dist?: string }> }) {
  const sp = await searchParams;
  const horizon = HORIZONS.find((h) => String(h) === sp.horizonte) ?? 90;
  const dist: DistKey = sp.dist && sp.dist in DIST ? (sp.dist as DistKey) : "acreedor";
  const { today, currency, summaries, portfolio: p } = await loadObligations(horizon);
  /** Enlace a esta pantalla conservando filtros y omitiendo los valores por defecto. */
  const href = (next: { horizonte?: number; dist?: DistKey }) => {
    const h = next.horizonte ?? horizon;
    const d = next.dist ?? dist;
    const u = new URLSearchParams();
    if (h !== 90) u.set("horizonte", String(h));
    if (d !== "acreedor") u.set("dist", d);
    const s = u.toString();
    return `/obligaciones${s ? `?${s}` : ""}`;
  };

  if (!summaries.length)
    return (
      <>
        <PageHeader title="Obligaciones" subtitle="Tus deudas y compromisos de pago en un solo lugar." />
        <Card>
          <EmptyState
            icon={<Landmark className="size-6" />}
            title="Aún no tienes obligaciones registradas"
            description="Registra créditos, impuestos, deudas con personas o cualquier compromiso de pago. Verás cuánto debes, a quién, cuánto has pagado y qué viene."
            action={<NewObligationButton>Nueva obligación</NewObligationButton>}
          />
        </Card>
      </>
    );

  const open = summaries.filter((s) => s.state !== "paid" && s.state !== "cancelled").sort(byPriority);
  const rows = dist === "acreedor" ? p.byCreditor : dist === "tipo" ? p.byKind : p.byCreditorType;
  const distTotal = rows.reduce((s, r) => s + r.pending, 0);
  const top = p.byCreditor.slice(0, 3);
  const bottom = p.byCreditor.length > 3 ? [...p.byCreditor].reverse().slice(0, 3) : [];
  const maxCred = p.byCreditor[0]?.pending ?? 0;
  const DIST_COLORS = ["bg-teal-500/70", "bg-navy-500/55", "bg-teal-300", "bg-navy-500/30", "bg-teal-700/50", "bg-line-strong"];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Obligaciones"
        subtitle="Cuánto debes, a quién, cuánto has pagado y qué viene."
        actions={
          <>
            <Link href="/obligaciones/lista" className="inline-flex h-8 items-center rounded-xl border border-card-border bg-card px-3 text-xs font-semibold text-ink-2 hover:bg-pastel-teal">
              Ver todas
            </Link>
            <NewObligationButton size="sm">Nueva obligación</NewObligationButton>
          </>
        }
      />

      {/* Nivel de endeudamiento */}
      <Card className="overflow-hidden">
        <div className="grid gap-4 bg-pastel-mix px-4 py-4 sm:grid-cols-[1fr_1.4fr] sm:items-center sm:px-5">
          <div>
            <p className="text-xs font-medium text-ink-2">Saldo pendiente por pagar</p>
            <p className="num mt-0.5 text-2xl leading-tight font-semibold text-ink">{formatMoney(p.pending, currency)}</p>
            <p className="mt-0.5 text-xs text-ink-2/80">
              {p.activeCount} obligaci{p.activeCount === 1 ? "ón activa" : "ones activas"}
              {p.overdueCount > 0 && <span className="font-semibold text-negative"> · {p.overdueCount} cuota{p.overdueCount > 1 ? "s" : ""} vencida{p.overdueCount > 1 ? "s" : ""}</span>}
            </p>
          </div>
          <div>
            <div className="flex items-baseline justify-between text-xs text-ink-2">
              <span>Avance de pago</span>
              <span className="num font-semibold text-ink">{Math.round(p.paidPct)}%</span>
            </div>
            <Progress value={p.paidPct} className="mt-1.5 h-2.5 bg-card" label="Avance de pago total" />
            <p className="mt-1.5 text-xs text-ink-2/80">
              Has pagado <span className="num font-semibold text-ink">{formatMoney(p.paid, currency)}</span> de{" "}
              <span className="num font-semibold text-ink">{formatMoney(p.totalDebt, currency)}</span>
            </p>
          </div>
        </div>
      </Card>

      {/* Indicadores */}
      <TileGrid cols={6}>
        <StatTile label="Deuda total" value={p.totalDebt} currency={currency} accent="mix" hint="Valor total a pagar" href="/obligaciones/lista" />
        <StatTile label="Total pagado" value={p.paid} currency={currency} accent="teal" tone="positive" hint={`${Math.round(p.paidPct)}% de la deuda`} href="/obligaciones/lista?estado=todas" />
        <StatTile label="Saldo pendiente" value={p.pending} currency={currency} accent="navy" hint="Lo que falta por pagar" href="/obligaciones/lista?estado=activas" />
        <StatTile
          label="Vencidas"
          value={p.overdueAmount}
          currency={currency}
          accent={p.overdueCount ? "alert" : "card"}
          tone={p.overdueCount ? "negative" : "neutral"}
          hint={p.overdueCount ? `${p.overdueCount} cuota${p.overdueCount > 1 ? "s" : ""} sin pagar` : "Nada vencido"}
          href="/obligaciones/lista?estado=vencidas"
        />
        <StatTile
          label="Próximas 30 días"
          value={p.soonAmount}
          currency={currency}
          accent={p.soonCount ? "warn" : "card"}
          hint={p.soonCount ? `${p.soonCount} pago${p.soonCount > 1 ? "s" : ""} por vencer` : "Sin pagos cercanos"}
          href="/obligaciones/lista?estado=por-vencer"
        />
        <StatTile
          label="Obligaciones activas"
          value={p.activeCount}
          currency={currency}
          valueText={String(p.activeCount)}
          accent="sky"
          hint={p.paidCount ? `${p.paidCount} ya pagada${p.paidCount > 1 ? "s" : ""}` : "En curso"}
          href="/obligaciones/lista?estado=activas"
        />
      </TileGrid>

      {/* Línea de tiempo */}
      <Card>
        <SectionTitle
          title="Línea de tiempo de pagos"
          hint="Qué debes pagar, cuánto y cuándo. Toca un periodo o un pago."
          action={
            <nav className="flex shrink-0 rounded-xl bg-canvas p-0.5 ring-1 ring-card-border" aria-label="Horizonte">
              {HORIZONS.map((h) => (
                <Link
                  key={h}
                  href={href({ horizonte: h })}
                  scroll={false}
                  aria-current={h === horizon ? "true" : undefined}
                  className={cn("rounded-lg px-2 py-1 text-[11px] font-semibold", h === horizon ? "bg-tint text-teal-700 shadow-sm" : "text-muted hover:text-ink")}
                >
                  {h === 365 ? "1 año" : `${h} d`}
                </Link>
              ))}
            </nav>
          }
        />
        <div className="pt-3">
          <ObligationTimeline items={p.upcoming} today={today} currency={currency} horizonDays={horizon} />
        </div>
      </Card>

      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
        {/* Distribución */}
        <Card className="flex flex-col">
          <SectionTitle title="Distribución de la deuda" hint="Saldo pendiente agrupado." />
          <div className="px-4 pt-3 sm:px-5">
            <nav className="grid grid-cols-3 rounded-xl bg-canvas p-0.5 ring-1 ring-card-border" aria-label="Agrupar por">
              {(Object.keys(DIST) as DistKey[]).map((k) => (
                <Link
                  key={k}
                  href={href({ dist: k })}
                  scroll={false}
                  aria-current={k === dist ? "true" : undefined}
                  className={cn("truncate rounded-lg px-2 py-1.5 text-center text-xs font-semibold", k === dist ? "bg-tint text-teal-700 shadow-sm" : "text-muted hover:text-ink")}
                >
                  {DIST[k].label}
                </Link>
              ))}
            </nav>
            {distTotal > 0 && (
              <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-tint-2" aria-hidden>
                {rows.slice(0, 6).map((r, i) => (
                  <span key={r.key} className={cn("h-full border-r-2 border-card last:border-r-0", DIST_COLORS[i])} style={{ width: `${(r.pending / distTotal) * 100}%` }} />
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 px-2 py-2 sm:px-3">
            {rows.length ? (
              rows.slice(0, 6).map((r, i) => (
                <div key={r.key} className="flex items-center gap-1">
                  <span className={cn("ml-2 size-2.5 shrink-0 rounded-full", DIST_COLORS[i])} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <BarRow
                      label={r.label}
                      hint={`${distTotal ? Math.round((r.pending / distTotal) * 100) : 0}% · ${r.count}`}
                      value={r.pending}
                      max={rows[0].pending}
                      currency={currency}
                      href={`/obligaciones/lista?${DIST[dist].param}=${encodeURIComponent(dist === "acreedor" ? r.label : r.key)}`}
                      tone={i % 2 ? "navy" : "teal"}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="px-2 py-6 text-center text-sm text-muted">No hay saldos pendientes.</p>
            )}
          </div>
        </Card>

        {/* Acreedores */}
        <Card className="flex flex-col">
          <SectionTitle title="Acreedores" hint="A quién le debes más y a quién menos." />
          <div className="flex-1 space-y-3 px-2 py-3 sm:px-3">
            <div>
              <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-ink-2 uppercase">Mayor saldo pendiente</p>
              {top.map((r) => (
                <BarRow key={r.key} label={r.label} hint={`${r.count} obligaci${r.count > 1 ? "ones" : "ón"}`} value={r.pending} max={maxCred} currency={currency} href={`/obligaciones/lista?acreedor=${encodeURIComponent(r.label)}`} tone="navy" />
              ))}
              {!top.length && <p className="px-2 py-2 text-sm text-muted">Sin saldos pendientes.</p>}
            </div>
            {bottom.length > 0 && (
              <div className="border-t border-line pt-2">
                <p className="px-2 pb-1 text-[11px] font-semibold tracking-wide text-ink-2 uppercase">Menor saldo pendiente</p>
                {bottom.map((r) => (
                  <BarRow key={r.key} label={r.label} hint={`${r.count} obligaci${r.count > 1 ? "ones" : "ón"}`} value={r.pending} max={maxCred} currency={currency} href={`/obligaciones/lista?acreedor=${encodeURIComponent(r.label)}`} tone="teal" />
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Obligaciones activas */}
      <section aria-label="Obligaciones activas">
        <div className="mb-2.5 flex items-baseline justify-between px-0.5">
          <h2 className="text-sm font-semibold text-ink">Obligaciones activas</h2>
          <Link href="/obligaciones/lista?estado=todas" className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline">
            Todas, incluidas pagadas <ArrowRight className="size-3.5" />
          </Link>
        </div>
        {open.length ? (
          <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {open.map((s) => (
              <ObligationCard key={s.obligation.id} s={s} today={today} />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState title="¡No tienes obligaciones pendientes!" description="Todas tus obligaciones están pagadas o anuladas." className="py-8" />
          </Card>
        )}
      </section>
    </div>
  );
}
