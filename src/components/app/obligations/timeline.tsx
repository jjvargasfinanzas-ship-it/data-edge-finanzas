import Link from "next/link";
import { CalendarCheck, TriangleAlert } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { addDays, formatMonth, formatShort, formatWeekdayShort, fromISO, monthShort, startOfWeek, type ISODate } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";
import type { UpcomingPayment } from "@/lib/obligations";
import { dueLabel } from "./cards";

interface Bucket {
  key: string;
  label: string;
  sub: string;
  total: number;
  /** Partes del total por urgencia, para la barra apilada. */
  overdueAmt: number;
  soonAmt: number;
  items: UpcomingPayment[];
  overdue: boolean;
}

/** Agrupa los pagos: vencidos + semanas (horizonte corto) o meses (horizonte largo). */
function buckets(items: UpcomingPayment[], today: ISODate, weekly: boolean): Bucket[] {
  const map = new Map<string, Bucket>();
  const soonLimit = addDays(today, 7);
  for (const it of items) {
    let key: string;
    let label: string;
    let sub: string;
    if (it.status === "overdue") {
      key = "vencido";
      label = "Vencido";
      sub = "sin pagar";
    } else if (weekly) {
      const w = startOfWeek(it.date);
      key = `w-${w}`;
      label = w <= today ? "Esta semana" : `Sem. ${formatShort(w)}`;
      sub = `${formatShort(w < today ? today : w)} – ${formatShort(addDays(w, 6))}`;
    } else {
      key = `m-${it.date.slice(0, 7)}`;
      label = monthShort(it.date);
      label = label.charAt(0).toUpperCase() + label.slice(1);
      sub = it.date.slice(0, 4);
    }
    const b = map.get(key) ?? { key, label, sub, total: 0, overdueAmt: 0, soonAmt: 0, items: [], overdue: key === "vencido" };
    b.total += it.amount;
    b.items.push(it);
    if (it.status === "overdue") b.overdueAmt += it.amount;
    else if (it.date <= soonLimit) b.soonAmt += it.amount;
    map.set(key, b);
  }
  return [...map.values()];
}

/**
 * Línea de tiempo de compromisos:
 * 1) Mapa de barras por periodo (cuánto y cuándo), clic para ir al periodo.
 * 2) Recorrido día a día (qué pagar, cuánto y cuándo), clic a la obligación.
 */
export function ObligationTimeline({
  items,
  today,
  currency,
  horizonDays,
}: {
  items: UpcomingPayment[];
  today: ISODate;
  currency: Currency;
  horizonDays: number;
}) {
  if (!items.length)
    return (
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <span className="mb-3 grid size-11 place-items-center rounded-2xl bg-pastel-teal text-teal-700">
          <CalendarCheck className="size-5" />
        </span>
        <p className="text-sm font-semibold text-ink">Sin pagos en este periodo</p>
        <p className="mt-1 text-xs text-muted">No tienes cuotas pendientes en los próximos {horizonDays} días.</p>
      </div>
    );

  const groups = buckets(items, today, horizonDays <= 31);
  const max = Math.max(...groups.map((g) => g.total));

  return (
    <div>
      {/* 1. Mapa de compromisos */}
      <div className="overflow-x-auto px-4 pb-1 sm:px-5" role="list" aria-label="Pagos por periodo">
        <div className="grid auto-cols-[minmax(76px,112px)] grid-flow-col gap-2">
          {groups.map((g) => {
            const h = Math.max(8, (g.total / max) * 100);
            return (
              <a
                key={g.key}
                href={`#t-${g.key}`}
                role="listitem"
                className="group flex flex-col items-center rounded-xl px-1 pt-2 pb-1.5 transition-colors hover:bg-tint/70"
              >
                <span className="num mb-1 text-[11px] font-semibold text-ink">{formatMoney(g.total, currency, { compact: true })}</span>
                <span className="flex h-24 w-full items-end justify-center">
                  <span
                    className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-lg transition-opacity group-hover:opacity-80"
                    style={{ height: `${h}%` }}
                  >
                    {g.overdueAmt > 0 && <span className="bg-negative/45" style={{ height: `${(g.overdueAmt / g.total) * 100}%` }} />}
                    {g.soonAmt > 0 && <span className="bg-warning/50" style={{ height: `${(g.soonAmt / g.total) * 100}%` }} />}
                    {g.total - g.overdueAmt - g.soonAmt > 0.5 && <span className="flex-1 bg-teal-400/70" />}
                  </span>
                </span>
                <span className={cn("mt-1.5 text-xs font-semibold", g.overdue ? "text-negative" : "text-ink")}>{g.label}</span>
                <span className="text-[10px] text-ink-2/70">
                  {g.items.length} pago{g.items.length > 1 ? "s" : ""}
                </span>
              </a>
            );
          })}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 px-4 pt-2 pb-3 text-[11px] text-ink-2 sm:px-5">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-negative/60" /> Vencido</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning/60" /> Próximos 7 días</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-teal-400" /> Programado</span>
      </div>

      {/* 2. Recorrido por fecha */}
      <div className="border-t border-line px-4 pt-4 pb-2 sm:px-5">
        {groups.map((g) => (
          <section key={g.key} id={`t-${g.key}`} className="scroll-mt-24 pb-3">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className={cn("text-xs font-semibold tracking-wide uppercase", g.overdue ? "text-negative" : "text-ink-2")}>
                {g.overdue ? "Vencido sin pagar" : g.key.startsWith("m-") ? formatMonth(g.items[0].date) : `${g.label} · ${g.sub}`}
              </h3>
              <span className="num text-xs font-semibold text-ink">{formatMoney(g.total, currency)}</span>
            </div>
            <ol className="relative ml-[22px] border-l-2 border-line">
              {g.items.map((it) => {
                const d = fromISO(it.date);
                const tone = it.status === "overdue" ? "overdue" : it.date <= addDays(today, 7) ? "soon" : "normal";
                return (
                  <li key={`${it.obligationId}-${it.n}`} className="relative pb-2 pl-5 last:pb-0">
                    <span
                      className={cn(
                        "absolute top-4 -left-[7px] size-3 rounded-full ring-4 ring-card",
                        tone === "overdue" ? "bg-negative/70" : tone === "soon" ? "bg-warning/70" : "bg-teal-400",
                      )}
                      aria-hidden
                    />
                    <Link
                      href={`/obligaciones/${it.obligationId}`}
                      className={cn(
                        "card-link flex items-center gap-2.5 rounded-xl border px-3 py-2.5 sm:gap-3",
                        tone === "overdue" ? "border-transparent bg-negative-50" : tone === "soon" ? "border-transparent bg-warning-50" : "border-card-border bg-card",
                      )}
                    >
                      <span className="grid w-8 shrink-0 text-center leading-none sm:w-10">
                        <span className="text-lg font-semibold text-ink">{d.getUTCDate()}</span>
                        <span className="mt-0.5 text-[10px] font-medium text-ink-2/80">{monthShort(it.date)}</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">{it.creditor}</span>
                        <span className="block truncate text-xs text-ink-2/80">
                          <span className="capitalize">{formatWeekdayShort(it.date)}</span> · {it.concept}
                          {it.of > 1 && ` · cuota ${it.n}/${it.of}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="num block text-sm font-semibold text-ink">{formatMoney(it.amount, currency)}</span>
                        <span
                          className={cn(
                            "flex items-center justify-end gap-1 text-[11px]",
                            tone === "overdue" ? "font-semibold text-negative" : tone === "soon" ? "font-semibold text-warning" : "text-ink-2/70",
                          )}
                        >
                          {tone === "overdue" && <TriangleAlert className="size-3" />}
                          {dueLabel(it.date, today).replace("Vencida hace", "Hace")}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
