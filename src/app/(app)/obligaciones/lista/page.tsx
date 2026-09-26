import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Landmark, X } from "lucide-react";
import { NewObligationButton } from "@/components/app/open-buttons";
import { ObligationCard } from "@/components/app/obligations/cards";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { StatTile, TileGrid } from "@/components/ui/tiles";
import { cn } from "@/components/ui/cn";
import { addDays } from "@/lib/dates";
import { OBLIGATION_KIND_LABELS, UNCLASSIFIED, type ObligationKind, type ObligationSummary } from "@/lib/obligations";
import { byPriority, loadObligations } from "../load";

export const metadata: Metadata = { title: "Obligaciones" };

const ESTADOS = {
  activas: "Activas",
  vencidas: "Vencidas",
  "por-vencer": "Próximas 30 días",
  pagadas: "Pagadas",
  anuladas: "Anuladas",
  todas: "Todas",
} as const;
type Estado = keyof typeof ESTADOS;

export default async function ObligacionesListaPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; acreedor?: string; tipo?: string; clase?: string }>;
}) {
  const sp = await searchParams;
  const estado: Estado = sp.estado && sp.estado in ESTADOS ? (sp.estado as Estado) : "activas";
  const { today, currency, summaries, toBase } = await loadObligations();
  const soon = addDays(today, 30);
  const isOpen = (s: ObligationSummary) => s.state !== "paid" && s.state !== "cancelled";

  const matchEstado = (s: ObligationSummary) => {
    switch (estado) {
      case "activas":
        return isOpen(s);
      case "vencidas":
        return s.state === "overdue";
      case "por-vencer":
        return isOpen(s) && s.schedule.some((i) => i.remaining > 0 && i.status !== "overdue" && i.date <= soon);
      case "pagadas":
        return s.state === "paid";
      case "anuladas":
        return s.state === "cancelled";
      default:
        return true;
    }
  };
  const acreedor = sp.acreedor?.trim();
  const tipo = sp.tipo && sp.tipo in OBLIGATION_KIND_LABELS ? (sp.tipo as ObligationKind) : undefined;
  const clase = sp.clase?.trim() || undefined;

  const list = summaries
    .filter(matchEstado)
    .filter((s) => !acreedor || s.obligation.creditor.trim().toLowerCase() === acreedor.toLowerCase())
    .filter((s) => !tipo || s.obligation.kind === tipo)
    .filter((s) => !clase || (s.obligation.class_id ?? "none") === clase)
    .sort(byPriority);

  const pending = list.reduce((a, s) => a + toBase(s.pending, s.obligation.currency), 0);
  const paid = list.reduce((a, s) => a + toBase(Math.min(s.paid, s.totalToPay), s.obligation.currency), 0);
  const overdue = list.reduce((a, s) => a + toBase(s.overdueAmount, s.obligation.currency), 0);

  const extra = acreedor ? { k: "acreedor", v: acreedor, label: acreedor } : tipo ? { k: "tipo", v: tipo, label: OBLIGATION_KIND_LABELS[tipo] } : clase
        ? { k: "clase", v: clase, label: summaries.find((s) => (s.obligation.class_id ?? "none") === clase)?.obligation.class_name ?? UNCLASSIFIED }
        : null;
  const link = (e: Estado, keepExtra = true) => {
    const u = new URLSearchParams();
    if (e !== "activas") u.set("estado", e);
    if (keepExtra && extra) u.set(extra.k, extra.v);
    const s = u.toString();
    return `/obligaciones/lista${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <Link href="/obligaciones" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
        <ArrowLeft className="size-4" /> Obligaciones
      </Link>
      <PageHeader
        title={extra ? extra.label : ESTADOS[estado]}
        subtitle={extra ? `Obligaciones · ${ESTADOS[estado].toLowerCase()}` : "Toca una obligación para ver su detalle, cuotas y pagos."}
        actions={<NewObligationButton size="sm">Nueva obligación</NewObligationButton>}
      />

      <nav className="mb-4 flex flex-wrap items-center gap-2" aria-label="Estado">
        {(Object.keys(ESTADOS) as Estado[]).map((e) => (
          <Link
            key={e}
            href={link(e)}
            aria-current={e === estado ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition-colors",
              e === estado ? "bg-pastel-teal text-teal-700 ring-transparent" : "bg-card text-ink-2 ring-card-border hover:bg-tint",
            )}
          >
            {ESTADOS[e]}
          </Link>
        ))}
        {extra && (
          <Link href={link(estado, false)} className="inline-flex items-center gap-1 rounded-full bg-pastel-navy px-3 py-1.5 text-xs font-semibold text-ink">
            {extra.label} <X className="size-3.5" aria-label="Quitar filtro" />
          </Link>
        )}
      </nav>

      {list.length > 0 && (
        <TileGrid cols={3} className="mb-4">
          <StatTile label="Saldo pendiente" value={pending} currency={currency} accent="navy" />
          <StatTile label="Pagado" value={paid} currency={currency} accent="teal" tone="positive" />
          <StatTile label="Vencido" value={overdue} currency={currency} accent={overdue > 0 ? "alert" : "card"} tone={overdue > 0 ? "negative" : "neutral"} />
        </TileGrid>
      )}

      {list.length ? (
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => (
            <ObligationCard key={s.obligation.id} s={s} today={today} />
          ))}
        </div>
      ) : (
        <Card>
          <EmptyState icon={<Landmark className="size-6" />} title="No hay obligaciones con este filtro" description="Prueba con otro estado o quita el filtro." />
        </Card>
      )}
    </>
  );
}
