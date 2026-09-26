import { cn } from "@/components/ui/cn";
import { formatMoney, type Currency } from "@/lib/money";
import type { PlanSummary } from "@/lib/month-plan";

function Row({
  title,
  verb,
  s,
  unplanned,
  currency,
  tone,
}: {
  title: string;
  verb: string;
  s: PlanSummary;
  unplanned: number;
  currency: Currency;
  tone: "in" | "out";
}) {
  const pct = s.planned ? Math.min(100, (s.received / s.planned) * 100) : 0;
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="text-xs text-muted">
          {s.countDone} de {s.count} {verb}
          {s.countOverdue > 0 && <span className="font-semibold text-warning"> · {s.countOverdue} vencido{s.countOverdue > 1 ? "s" : ""}</span>}
        </p>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-canvas"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${title}: ${Math.round(pct)}% ${verb}`}
      >
        <div className={cn("h-full rounded-full", tone === "in" ? "bg-series-in" : "bg-series-out")} style={{ width: `${pct}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted">Programado</dt>
          <dd className="num text-sm font-semibold text-ink">{formatMoney(s.planned, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted">{tone === "in" ? "Recibido" : "Pagado"}</dt>
          <dd className="num text-sm font-semibold text-ink">{formatMoney(s.received, currency)}</dd>
        </div>
        <div>
          <dt className="text-muted">Pendiente</dt>
          <dd className={cn("num text-sm font-semibold", s.pending > 0 ? (tone === "in" ? "text-positive" : "text-ink") : "text-muted")}>
            {formatMoney(s.pending, currency)}
          </dd>
        </div>
      </dl>
      {(Math.abs(s.difference) >= 1 || unplanned > 0) && (
        <p className="mt-2 text-xs text-muted">
          {Math.abs(s.difference) >= 1 && (
            <>
              Diferencia en lo ya {tone === "in" ? "recibido" : "pagado"}:{" "}
              <strong className={cn("num", s.difference < 0 ? (tone === "in" ? "text-negative" : "text-positive") : tone === "in" ? "text-positive" : "text-negative")}>
                {formatMoney(s.difference, currency, { signed: true })}
              </strong>
              .{" "}
            </>
          )}
          {unplanned > 0 && (
            <>
              {tone === "in" ? "Ingresos" : "Gastos"} no programados: <strong className="num text-ink-2">{formatMoney(unplanned, currency)}</strong>
            </>
          )}
        </p>
      )}
    </div>
  );
}

export function PlanVsActual({
  income,
  expense,
  unplannedIncome,
  unplannedExpense,
  currency,
}: {
  income: PlanSummary;
  expense: PlanSummary;
  unplannedIncome: number;
  unplannedExpense: number;
  currency: Currency;
}) {
  return (
    <div className="divide-y divide-line">
      <Row title="Ingresos" verb="recibidos" s={income} unplanned={unplannedIncome} currency={currency} tone="in" />
      <Row title="Gastos" verb="pagados" s={expense} unplanned={unplannedExpense} currency={currency} tone="out" />
    </div>
  );
}
