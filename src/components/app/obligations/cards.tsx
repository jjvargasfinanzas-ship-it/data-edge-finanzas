import Link from "next/link";
import { CalendarClock, ChevronRight, CircleCheck, TriangleAlert } from "lucide-react";
import { Badge, Progress } from "@/components/ui/misc";
import { FitMoney } from "@/components/ui/tiles";
import { cn } from "@/components/ui/cn";
import { diffDays, formatShort } from "@/lib/dates";
import type { Currency } from "@/lib/money";
import { OBLIGATION_KIND_LABELS, STATE_LABELS, type ObligationState, type ObligationSummary } from "@/lib/obligations";

export const STATE_TONE: Record<ObligationState, "positive" | "neutral" | "negative" | "warning" | "brand"> = {
  paid: "positive",
  cancelled: "neutral",
  overdue: "negative",
  due_soon: "warning",
  current: "brand",
};

/** Fondo pastel de la tarjeta según el estado: se lee el estado antes que el texto. */
const STATE_BG: Record<ObligationState, string> = {
  paid: "bg-positive-50 border-transparent",
  cancelled: "bg-card border-card-border opacity-75",
  overdue: "bg-negative-50 border-transparent",
  due_soon: "bg-warning-50 border-transparent",
  current: "bg-card border-card-border",
};

export function StateBadge({ state }: { state: ObligationState }) {
  return <Badge tone={STATE_TONE[state]}>{STATE_LABELS[state]}</Badge>;
}

/** "Vence hoy", "En 3 días", "Hace 5 días". */
export function dueLabel(date: string, today: string) {
  const d = diffDays(date, today);
  if (d === 0) return "Vence hoy";
  if (d === 1) return "Vence mañana";
  if (d > 1) return `En ${d} días`;
  return d === -1 ? "Venció ayer" : `Vencida hace ${-d} días`;
}

/** Tarjeta de una obligación: misma altura en toda la rejilla, clic al detalle. */
export function ObligationCard({ s, today }: { s: ObligationSummary; today: string }) {
  const o = s.obligation;
  const cur = o.currency as Currency;
  return (
    <Link
      href={`/obligaciones/${o.id}`}
      className={cn("card card-link group flex h-full min-h-[156px] flex-col p-4", STATE_BG[s.state])}
      aria-label={`${o.creditor}, ${o.concept}. ${STATE_LABELS[s.state]}. Ver detalle`}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{o.creditor}</p>
          <p className="truncate text-xs text-ink-2/80">
            {o.concept} · {OBLIGATION_KIND_LABELS[o.kind]}
          </p>
        </div>
        <StateBadge state={s.state} />
      </div>

      <div className="@container mt-auto pt-3">
        <p className="text-[11px] font-medium text-ink-2">Saldo pendiente</p>
        <FitMoney value={s.pending} currency={cur} max={20} className="text-ink" />
        <Progress value={s.paidPct} className="mt-2" label={`Pagado ${Math.round(s.paidPct)}%`} tone={s.state === "overdue" ? "negative" : "brand"} />
        <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-ink-2/80">
          <span>
            {s.installmentsPaid}/{s.schedule.length} cuotas
          </span>
          {s.next ? (
            <span className={cn("flex items-center gap-1", (s.state === "overdue" || s.state === "due_soon") && "font-semibold text-ink")}>
              {s.state === "overdue" ? <TriangleAlert className="size-3" /> : <CalendarClock className="size-3" />}
              {formatShort(s.next.date)} · {dueLabel(s.next.date, today).replace("Vencida hace", "hace")}
            </span>
          ) : s.state === "paid" ? (
            <span className="flex items-center gap-1 font-semibold text-positive">
              <CircleCheck className="size-3" /> Pagada
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/** Fila compacta con barra proporcional (ranking y distribución). */
export function BarRow({
  label,
  hint,
  value,
  max,
  currency,
  href,
  tone = "teal",
}: {
  label: string;
  hint?: string;
  value: number;
  max: number;
  currency: Currency;
  href: string;
  tone?: "teal" | "navy" | "mix";
}) {
  const pct = max > 0 ? Math.max(3, (value / max) * 100) : 0;
  return (
    <Link href={href} className="group block rounded-xl px-2 py-2 transition-colors hover:bg-tint/70">
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{label}</span>
        <div className="@container w-28 shrink-0 text-right sm:w-32">
          <FitMoney value={value} currency={currency} max={14} min={12} className="text-ink" />
        </div>
        <ChevronRight className="size-3.5 shrink-0 self-center text-ink-2/40 transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-tint-2">
          <div
            className={cn("h-full rounded-full", tone === "teal" && "bg-teal-400", tone === "navy" && "bg-navy-500/60", tone === "mix" && "bg-teal-600/60")}
            style={{ width: `${pct}%` }}
          />
        </div>
        {hint && <span className="shrink-0 text-[11px] text-ink-2/70">{hint}</span>}
      </div>
    </Link>
  );
}
