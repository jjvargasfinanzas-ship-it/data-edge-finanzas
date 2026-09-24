import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown, TriangleAlert } from "lucide-react";
import { BalanceChart } from "@/components/charts/balance-chart";
import { FlowBars } from "@/components/charts/flow-bars";
import { CashPosition } from "@/components/app/cash-position";
import { NewPlannedButton } from "@/components/app/open-buttons";
import { PendingList } from "@/components/app/pending-list";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import { getAccounts, getCashflow, getContext, getRates } from "@/lib/data";
import { addDays, endOfMonth, formatLong, formatMonth, formatShort } from "@/lib/dates";
import { bucketize, isLiquid } from "@/lib/cashflow";
import { convert, formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Flujo de caja" };

const HORIZONS = { mes: "Este mes", "30": "30 días", "60": "60 días", "90": "90 días" } as const;
type Horizon = keyof typeof HORIZONS;

export default async function FlujoPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const sp = await searchParams;
  const h: Horizon = sp.h && sp.h in HORIZONS ? (sp.h as Horizon) : "mes";
  const { today, currency } = await getContext();
  const end = h === "mes" ? endOfMonth(today) : addDays(today, Number(h));
  const [flow, accounts, rates] = await Promise.all([getCashflow(end), getAccounts(), getRates()]);

  const occ = flow.occurrences.filter((o) => !(o.flow === "transfer" && o.cashEffect === 0));
  const incomes = occ.filter((o) => o.cashEffect > 0 || (o.kind === "income" && o.cashEffect === 0));
  const outgoings = occ.filter((o) => !incomes.includes(o));
  const toReceive = incomes.reduce((s, o) => s + Math.max(0, o.cashEffect), 0);
  const toPay = outgoings.reduce((s, o) => s + Math.max(0, -o.cashEffect), 0);
  const low = flow.days.reduce((m, d) => (d.closing < m.closing ? d : m), flow.days[0]);
  const activeDays = flow.days.filter((d) => d.items.some((o) => o.cashEffect !== 0));
  const buckets = bucketize(flow.days, h === "mes" || h === "30" ? "week" : "month", (d) =>
    h === "mes" || h === "30" ? `Sem. ${formatShort(d)}` : formatMonth(d),
  );

  return (
    <>
      <PageHeader
        title="Flujo de caja"
        subtitle="Cuánto tienes, cuánto esperas recibir, cuánto tienes comprometido y cómo quedará tu saldo."
        actions={<NewPlannedButton variant="secondary">Programar</NewPlannedButton>}
      />

      <nav className="mb-5 flex w-fit rounded-xl bg-surface p-1 ring-1 ring-line" aria-label="Periodo">
        {(["mes", "30", "60", "90"] as Horizon[]).map((k) => (
          <Link
            key={k}
            href={`/flujo-de-caja?h=${k}`}
            aria-current={k === h ? "true" : undefined}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", k === h ? "bg-navy-900 text-white" : "text-muted hover:text-ink")}
          >
            {HORIZONS[k]}
          </Link>
        ))}
      </nav>

      <div className="space-y-6">
        <CashPosition
          currency={currency}
          available={flow.startBalance}
          toReceive={toReceive}
          toPay={toPay}
          projected={flow.endBalance}
          projectedLabel={`Al ${formatShort(end)}, si todo lo programado ocurre`}
          receiveCount={incomes.length}
          payCount={outgoings.length}
        includesCards={outgoings.some((o) => o.flow === "card_estimate" || o.flow === "payment")}
          overdueCount={outgoings.filter((o) => o.overdue).length}
          lowPoint={low ? { value: low.closing, label: formatShort(low.date) } : null}
          accounts={accounts
            .filter((a) => !a.is_archived && isLiquid(a.type))
            .map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency, balance: a.balance, baseBalance: convert(a.balance, a.currency, currency, rates) }))}
        />

        {flow.firstNegativeDate && (
          <div className="flex items-start gap-3 rounded-2xl border border-negative/20 bg-negative-50 px-5 py-4 text-sm text-negative">
            <TriangleAlert className="mt-0.5 size-5 shrink-0" />
            <p>
              <strong>Tu saldo disponible pasaría a negativo el {formatLong(flow.firstNegativeDate)}.</strong> El punto más bajo sería{" "}
              <strong className="num">{formatMoney(flow.minBalance, currency)}</strong> el {formatShort(flow.minDate)}.
            </p>
          </div>
        )}

        <Card>
          <CardHeader title="Cómo se mueve tu saldo" subtitle="Hoy es tu saldo real. Los días siguientes suman y restan lo pendiente. Pasa el cursor sobre la línea." />
          <div className="px-3 pt-4 pb-4 sm:px-5">
            <BalanceChart data={flow.days.map((d) => ({ date: d.date, closing: d.closing, inflow: d.inflow, outflow: d.outflow }))} currency={currency} height={260} />
          </div>
        </Card>

        <div className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Ingresos pendientes" subtitle={`${formatMoney(toReceive, currency)} por recibir`} />
            <div className="px-5 pb-3">
              <PendingList
                items={incomes}
                baseCurrency={currency}
                group="date"
                empty={<EmptyState title="No hay ingresos pendientes en este periodo" action={<NewPlannedButton initial={{ kind: "income" }}>Programar ingreso</NewPlannedButton>} className="py-8" />}
              />
            </div>
          </Card>
          <Card>
            <CardHeader title="Gastos y pagos pendientes" subtitle={`${formatMoney(toPay, currency)} comprometido`} />
            <div className="px-5 pb-3">
              <PendingList
                items={outgoings}
                baseCurrency={currency}
                group="date"
                empty={<EmptyState title="No hay pagos pendientes en este periodo" action={<NewPlannedButton initial={{ kind: "expense" }}>Programar gasto</NewPlannedButton>} className="py-8" />}
              />
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Día a día" subtitle="Fechas con movimientos y el saldo con que cerraría cada día" />
          {activeDays.length ? (
            <ol className="mt-3 divide-y divide-line">
              {activeDays.map((d) => {
                const ins = d.items.filter((o) => o.cashEffect > 0);
                const outs = d.items.filter((o) => o.cashEffect < 0);
                return (
                  <li key={d.date} className="grid gap-2 px-5 py-3 sm:grid-cols-[180px_1fr_150px] sm:items-start">
                    <p className="text-sm font-bold text-ink first-letter:uppercase">
                      {d.date === today ? "Hoy" : formatLong(d.date)}
                    </p>
                    <ul className="space-y-1 text-sm">
                      {[...ins, ...outs].map((o) => (
                        <li key={o.key} className="flex justify-between gap-3">
                          <span className="flex min-w-0 flex-1 items-center gap-1.5 text-ink-2">
                            <span className={cn("size-1.5 shrink-0 rounded-full", o.cashEffect > 0 ? "bg-series-in" : "bg-series-out")} />
                            <span className="truncate">{o.name}</span>
                            {o.state === "partial" ? (
                              <Badge tone="warning" className="shrink-0 max-sm:hidden">Parcial</Badge>
                            ) : o.overdue ? (
                              <Badge tone="warning" className="shrink-0 max-sm:hidden">Vencido</Badge>
                            ) : null}
                          </span>
                          <span className={cn("num shrink-0 font-semibold", o.cashEffect > 0 ? "text-positive" : "text-ink")}>
                            {formatMoney(o.cashEffect, currency, { signed: true })}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className={cn("num text-sm font-bold sm:text-right", d.closing < 0 ? "text-negative" : "text-ink")}>
                      <span className="mr-1 text-xs font-semibold text-muted">Saldo</span>
                      {formatMoney(d.closing, currency)}
                    </p>
                  </li>
                );
              })}
            </ol>
          ) : (
            <EmptyState title="No hay movimientos proyectados" description="Programa tus ingresos y gastos para ver tu flujo día a día." action={<NewPlannedButton>Programar</NewPlannedButton>} />
          )}
        </Card>

        <details className="card group">
          <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4">
            <span>
              <span className="block text-[15px] font-bold text-ink">Resumen por {h === "mes" || h === "30" ? "semana" : "mes"}</span>
              <span className="block text-[13px] text-muted">Entradas, salidas y saldo por periodo</span>
            </span>
            <ChevronDown className="size-5 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="px-3 sm:px-5">
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
        </details>
      </div>
    </>
  );
}
