import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { BalanceChart } from "@/components/charts/balance-chart";
import { FlowBars } from "@/components/charts/flow-bars";
import { NewPlannedButton } from "@/components/app/open-buttons";
import { UpcomingList } from "@/components/app/upcoming-list";
import { Card, CardHeader, EmptyState, Money, PageHeader } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import { getCashflow, getContext } from "@/lib/data";
import { addDays, formatLong, formatMonth, formatShort } from "@/lib/dates";
import { bucketize } from "@/lib/cashflow";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Flujo de caja" };

const HORIZONS = [30, 60, 90, 180] as const;
const VIEWS = { dia: "Diaria", semana: "Semanal", mes: "Mensual" } as const;

export default async function FlujoPage({ searchParams }: { searchParams: Promise<{ dias?: string; vista?: string }> }) {
  const sp = await searchParams;
  const days = HORIZONS.includes(Number(sp.dias) as (typeof HORIZONS)[number]) ? Number(sp.dias) : 60;
  const view = (sp.vista && sp.vista in VIEWS ? sp.vista : "semana") as keyof typeof VIEWS;
  const { today, currency } = await getContext();
  const flow = await getCashflow(addDays(today, days));

  const sum = (f: (o: (typeof flow.occurrences)[number]) => boolean) =>
    flow.occurrences.filter(f).reduce((s, o) => s + Math.abs(o.cashEffect), 0);
  const income = sum((o) => o.cashEffect > 0);
  const expenses = sum((o) => o.cashEffect < 0 && o.flow === "expense");
  const payments = sum((o) => o.cashEffect < 0 && (o.flow === "payment" || o.flow === "card_estimate"));
  const savings = sum((o) => o.cashEffect < 0 && o.flow === "transfer");

  const buckets =
    view === "dia"
      ? []
      : bucketize(flow.days, view === "semana" ? "week" : "month", (d) => (view === "semana" ? `Sem. ${formatShort(d)}` : formatMonth(d)));
  const activeDays = flow.days.filter((d) => d.items.some((o) => o.cashEffect !== 0));

  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ dias: String(days), vista: view, ...patch });
    return `/flujo-de-caja?${p.toString()}`;
  };

  return (
    <>
      <PageHeader
        title="Flujo de caja"
        subtitle="Cuánto dinero disponible tendrás cada día, según tus programados y tarjetas."
        actions={<NewPlannedButton variant="secondary">Programar</NewPlannedButton>}
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl bg-surface p-1 ring-1 ring-line" role="group" aria-label="Horizonte">
          {HORIZONS.map((h) => (
            <Link
              key={h}
              href={link({ dias: String(h) })}
              className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", h === days ? "bg-navy-900 text-white" : "text-muted hover:text-ink")}
              aria-current={h === days ? "true" : undefined}
            >
              {h} días
            </Link>
          ))}
        </div>
        <div className="flex rounded-xl bg-surface p-1 ring-1 ring-line" role="group" aria-label="Vista">
          {Object.entries(VIEWS).map(([k, l]) => (
            <Link
              key={k}
              href={link({ vista: k })}
              className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", k === view ? "bg-navy-900 text-white" : "text-muted hover:text-ink")}
              aria-current={k === view ? "true" : undefined}
            >
              {l}
            </Link>
          ))}
        </div>
      </div>

      <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-6" aria-label="Resumen del periodo">
        {[
          { l: "Saldo inicial", v: flow.startBalance },
          { l: "Ingresos proyectados", v: income, c: "text-positive" },
          { l: "Gastos proyectados", v: -expenses },
          { l: "Pagos de tarjetas", v: -payments },
          { l: "Ahorro e inversión", v: -savings },
          { l: "Saldo final", v: flow.endBalance, strong: true },
        ].map((k) => (
          <Card key={k.l} className={cn("p-4", k.strong && "bg-navy-950 text-white ring-0")}>
            <p className={cn("text-xs font-semibold", k.strong ? "text-white/60" : "text-muted")}>{k.l}</p>
            <p className={cn("num mt-1 text-lg font-bold", k.c, k.strong && (k.v < 0 ? "text-[#ff9b86]" : "text-teal-300"), !k.strong && k.v < 0 && k.l === "Saldo inicial" && "text-negative")}>
              {formatMoney(k.v, currency)}
            </p>
          </Card>
        ))}
      </section>

      {flow.firstNegativeDate && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-negative/20 bg-negative-50 px-5 py-4 text-sm text-negative">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <p>
            <strong>Tu saldo disponible pasaría a negativo el {formatLong(flow.firstNegativeDate)}.</strong> El punto más bajo sería{" "}
            <strong className="num">{formatMoney(flow.minBalance, currency)}</strong> el {formatShort(flow.minDate)}.
          </p>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader title="Saldo disponible proyectado" subtitle={`Próximos ${days} días · pasa el cursor para ver cada día`} />
        <div className="px-3 pt-4 pb-4 sm:px-5">
          <BalanceChart data={flow.days.map((d) => ({ date: d.date, closing: d.closing, inflow: d.inflow, outflow: d.outflow }))} currency={currency} height={280} />
        </div>
      </Card>

      {view !== "dia" && (
        <Card className="mb-6">
          <CardHeader title={`Entradas y salidas por ${view === "semana" ? "semana" : "mes"}`} />
          <div className="px-3 pt-4 sm:px-5">
            <FlowBars data={buckets.map((b) => ({ label: b.label, inflow: b.inflow, outflow: b.outflow }))} currency={currency} />
          </div>
          <div className="overflow-x-auto">
            <table className="mt-4 w-full min-w-[560px] text-sm">
              <caption className="sr-only">Flujo de caja por periodo</caption>
              <thead>
                <tr className="border-y border-line text-left text-xs font-bold tracking-wide text-muted uppercase">
                  <th className="px-5 py-3">Periodo</th>
                  <th className="px-3 py-3 text-right">Saldo inicial</th>
                  <th className="px-3 py-3 text-right">Entradas</th>
                  <th className="px-3 py-3 text-right">Salidas</th>
                  <th className="px-5 py-3 text-right">Saldo final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {buckets.map((b) => (
                  <tr key={b.key}>
                    <td className="px-5 py-3 font-semibold text-ink">
                      {b.label}
                      <span className="block text-xs font-normal text-muted">
                        {formatShort(b.from)} – {formatShort(b.to)}
                      </span>
                    </td>
                    <td className="num px-3 py-3 text-right text-ink-2">{formatMoney(b.opening, currency)}</td>
                    <td className="num px-3 py-3 text-right text-positive">{b.inflow ? formatMoney(b.inflow, currency, { signed: true }) : "—"}</td>
                    <td className="num px-3 py-3 text-right text-ink">{b.outflow ? formatMoney(-b.outflow, currency) : "—"}</td>
                    <td className={cn("num px-5 py-3 text-right font-bold", b.closing < 0 ? "text-negative" : "text-ink")}>{formatMoney(b.closing, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === "dia" && (
        <Card className="mb-6">
          <CardHeader title="Día a día" subtitle="Solo se muestran los días con movimientos" />
          {activeDays.length ? (
            <ol className="mt-3 divide-y divide-line">
              {activeDays.map((d) => (
                <li key={d.date} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-bold text-ink first-letter:uppercase">{formatLong(d.date)}</p>
                    <p className={cn("num text-sm font-bold", d.closing < 0 ? "text-negative" : "text-ink")}>
                      <span className="mr-1 text-xs font-semibold text-muted">Saldo</span>
                      {formatMoney(d.closing, currency)}
                    </p>
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {d.items
                      .filter((o) => o.cashEffect !== 0)
                      .map((o) => (
                        <li key={o.key} className="flex justify-between gap-3 text-sm">
                          <span className="truncate text-ink-2">
                            {o.name}
                            {o.overdue && <span className="ml-1 text-xs font-bold text-warning">(vencido {formatShort(o.dueDate)})</span>}
                          </span>
                          <span className={cn("num shrink-0 font-semibold", o.cashEffect > 0 ? "text-positive" : "text-ink")}>
                            {formatMoney(o.cashEffect, currency, { signed: true })}
                          </span>
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="No hay movimientos proyectados" description="Crea programados para ver tu flujo día a día." action={<NewPlannedButton>Nuevo programado</NewPlannedButton>} />
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="Todo lo programado en el periodo" subtitle="Registra cada uno cuando ocurra para que tu saldo real se mantenga al día" />
        <div className="px-5 pb-2">
          <UpcomingList
            items={flow.occurrences.filter((o) => o.cashEffect !== 0 || o.flow !== "transfer")}
            baseCurrency={currency}
            empty={<EmptyState title="Nada programado todavía" action={<NewPlannedButton>Nuevo programado</NewPlannedButton>} />}
          />
        </div>
      </Card>
    </>
  );
}
