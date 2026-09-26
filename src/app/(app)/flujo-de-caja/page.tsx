import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { BalanceChartLazy } from "@/components/charts/lazy";
import { NewPlannedButton, NewTransactionButton } from "@/components/app/open-buttons";
import { PendingList } from "@/components/app/pending-list";
import { Badge, Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/misc";
import { StatRows } from "@/components/ui/stat-rows";
import { cn } from "@/components/ui/cn";
import { getAccounts, getCashflow, getCategories, getContext, getRates, toAccountLite } from "@/lib/data";
import { addDays, addMonthsClamped, endOfMonth, formatLong, formatMonth, formatShort, isValidMonth } from "@/lib/dates";
import { isLiquid } from "@/lib/cashflow";
import { buildRealFlow } from "@/lib/real-flow";
import { convert, formatMoney } from "@/lib/money";
import { RealDays, type RealDayRow } from "./real-days";

export const metadata: Metadata = { title: "Flujo de caja" };

const HORIZONS = [
  { k: "mes", label: "Este mes" },
  { k: "30", label: "30 días" },
  { k: "60", label: "60 días" },
  { k: "90", label: "90 días" },
] as const;

export default async function FlujoPage({ searchParams }: { searchParams: Promise<{ v?: string; h?: string; mes?: string }> }) {
  const sp = await searchParams;
  const view = sp.v === "proyectado" ? "proyectado" : "real";
  const { today, currency } = await getContext();

  return (
    <>
      <PageHeader title="Flujo de caja" subtitle="El real muestra lo que ya pasó. El proyectado, lo que podría pasar con lo programado." />
      <nav className="mb-4 grid w-full max-w-md grid-cols-2 rounded-xl bg-card p-1 ring-1 ring-card-border" aria-label="Tipo de flujo">
        {[
          { k: "real", label: "Real", hint: "Confirmado" },
          { k: "proyectado", label: "Proyectado", hint: "Estimado" },
        ].map((t) => (
          <Link
            key={t.k}
            href={`/flujo-de-caja?v=${t.k}`}
            aria-current={view === t.k ? "page" : undefined}
            className={cn("rounded-lg px-3 py-2 text-center text-sm font-semibold", view === t.k ? "bg-tint text-teal-700 shadow-sm" : "text-muted hover:text-ink")}
          >
            {t.label}
            <span className={cn("block text-[11px] font-semibold", view === t.k ? "text-teal-700/70" : "text-muted/80")}>{t.hint}</span>
          </Link>
        ))}
      </nav>
      {view === "real" ? (
        <RealView month={isValidMonth(sp.mes) ? sp.mes! : today.slice(0, 7)} today={today} currency={currency} />
      ) : (
        <ProjectedView h={sp.h ?? "mes"} today={today} currency={currency} />
      )}
    </>
  );
}

async function RealView({ month, today, currency }: { month: string; today: string; currency: import("@/lib/money").Currency }) {
  const { supabase } = await getContext();
  const from = `${month}-01`;
  const to = endOfMonth(from) < today ? endOfMonth(from) : today;
  const [accounts, rates, categories, { data: txs }] = await Promise.all([
    getAccounts(),
    getRates(),
    getCategories(),
    supabase
      .from("transactions")
      .select("id, date, kind, amount, to_amount, account_id, to_account_id, category_id, description, notes")
      .gte("date", from)
      .lte("date", today)
      .order("date")
      .limit(5000),
  ]);
  const lites = accounts.map(toAccountLite);
  const current = accounts
    .filter((a) => !a.is_archived && isLiquid(a.type))
    .reduce((s, a) => s + convert(a.balance, a.currency, currency, rates), 0);
  const rows = (txs ?? []).map((t) => ({ ...t, amount: Number(t.amount), to_amount: t.to_amount === null ? null : Number(t.to_amount) }));
  const flow = buildRealFlow({ accounts: lites, txs: rows, currentBalance: current, from, to, today, baseCurrency: currency, rates });
  const acc = new Map(accounts.map((a) => [a.id, a]));
  const cat = new Map(categories.map((c) => [c.id, c]));
  const isCurrent = month === today.slice(0, 7);
  const prev = addMonthsClamped(from, -1).slice(0, 7);
  const next = addMonthsClamped(from, 1).slice(0, 7);

  const dayRows: RealDayRow[] = flow.days
    .filter((d) => d.moves.length)
    .reverse()
    .map((d) => ({
      date: d.date,
      closing: d.closing,
      moves: d.moves.map((m) => {
        const t = m.tx as (typeof rows)[number];
        const c = t.category_id ? cat.get(t.category_id) : undefined;
        const a = acc.get(t.account_id);
        const toA = t.to_account_id ? acc.get(t.to_account_id) : undefined;
        return {
          id: t.id,
          title: t.description || c?.name || (t.kind === "transfer" ? "Transferencia" : t.kind === "income" ? "Ingreso" : "Gasto"),
          subtitle: t.kind === "transfer" ? `${a?.name ?? ""} → ${toA?.name ?? ""}` : [c && t.description ? c.name : null, a?.name].filter(Boolean).join(" · "),
          effect: m.effect,
          icon: c?.icon ?? null,
          color: c?.color ?? null,
          isTransfer: t.kind === "transfer",
          tx: t,
        };
      }),
    }));

  return (
    <div className="space-y-4">
      <div className="flex w-fit items-center rounded-xl border border-card-border bg-card">
        <Link href={`/flujo-de-caja?v=real&mes=${prev}`} className="grid size-10 place-items-center text-muted hover:text-ink" aria-label="Mes anterior">
          <ChevronLeft className="size-4" />
        </Link>
        <span className="min-w-36 text-center text-sm font-semibold text-ink">{formatMonth(month)}</span>
        {isCurrent ? (
          <span className="size-10" />
        ) : (
          <Link href={`/flujo-de-caja?v=real&mes=${next}`} className="grid size-10 place-items-center text-muted hover:text-ink" aria-label="Mes siguiente">
            <ChevronRight className="size-4" />
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader title="Resumen real" subtitle="Solo movimientos confirmados en bancos, efectivo y billeteras" />
          <div className="px-4 pb-2 sm:px-5">
            <StatRows
              rows={[
                { label: `Saldo al ${formatShort(from)}`, value: formatMoney(flow.opening, currency) },
                { op: "+", label: "Entradas", value: formatMoney(flow.inflow, currency), tone: "in" },
                { op: "−", label: "Salidas", value: formatMoney(flow.outflow, currency), tone: "out" },
                {
                  op: "=",
                  label: isCurrent ? "Saldo real hoy" : `Saldo al ${formatShort(to)}`,
                  value: formatMoney(flow.closing, currency),
                  tone: flow.closing < 0 ? "negative" : "total",
                },
              ]}
            />
          </div>
          <div className="px-2 pb-3 sm:px-4">
            <BalanceChartLazy data={flow.days.map((d) => ({ date: d.date, closing: d.closing, inflow: d.inflow, outflow: d.outflow }))} currency={currency} height={180} />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Movimientos del mes"
            subtitle="Toca uno para corregirlo o eliminarlo"
            action={<NewTransactionButton size="sm" variant="secondary">Registrar</NewTransactionButton>}
          />
          {dayRows.length ? (
            <RealDays days={dayRows} currency={currency} today={today} />
          ) : (
            <EmptyState title="No hay movimientos confirmados en este mes." action={<NewTransactionButton initial={{ kind: "expense" }}>Registrar movimiento</NewTransactionButton>} />
          )}
        </Card>
      </div>
    </div>
  );
}

async function ProjectedView({ h, today, currency }: { h: string; today: string; currency: import("@/lib/money").Currency }) {
  const horizon = HORIZONS.find((x) => x.k === h)?.k ?? "mes";
  const end = horizon === "mes" ? endOfMonth(today) : addDays(today, Number(horizon));
  const flow = await getCashflow(end);

  const occ = flow.occurrences.filter((o) => !(o.flow === "transfer" && o.cashEffect === 0));
  const incomes = occ.filter((o) => o.cashEffect > 0 || (o.kind === "income" && o.cashEffect === 0));
  const outgoings = occ.filter((o) => !incomes.includes(o));
  const toReceive = incomes.reduce((s, o) => s + Math.max(0, o.cashEffect), 0);
  const toPay = outgoings.reduce((s, o) => s + Math.max(0, -o.cashEffect), 0);
  const activeDays = flow.days.filter((d) => d.items.some((o) => o.cashEffect !== 0));

  return (
    <div className="space-y-4">
      <nav className="flex w-fit rounded-xl bg-card p-1 ring-1 ring-card-border" aria-label="Periodo">
        {HORIZONS.map(({ k, label }) => (
          <Link
            key={k}
            href={`/flujo-de-caja?v=proyectado&h=${k}`}
            aria-current={k === horizon ? "true" : undefined}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-semibold", k === horizon ? "bg-tint text-teal-700 shadow-sm" : "text-muted hover:text-ink")}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card>
          <CardHeader title="Proyección" subtitle="Parte de tu saldo real de hoy y suma o resta lo programado pendiente" action={<Badge>Estimado</Badge>} />
          <div className="px-4 pb-2 sm:px-5">
            <StatRows
              rows={[
                { label: "Saldo real hoy", value: formatMoney(flow.startBalance, currency) },
                { op: "+", label: "Por recibir", hint: `${incomes.length} ingreso${incomes.length === 1 ? "" : "s"}`, value: formatMoney(toReceive, currency), tone: "in" },
                { op: "−", label: "Por pagar", hint: `${outgoings.length} pago${outgoings.length === 1 ? "" : "s"}`, value: formatMoney(toPay, currency), tone: "out" },
                { op: "=", label: `Saldo estimado al ${formatShort(end)}`, value: formatMoney(flow.endBalance, currency), tone: flow.endBalance < 0 ? "negative" : "total" },
              ]}
            />
          </div>
          {flow.firstNegativeDate && (
            <p className="flex items-start gap-2 border-t border-line bg-negative-50 px-4 py-2.5 text-xs font-semibold text-negative sm:px-5">
              <TriangleAlert className="size-4 shrink-0" />
              El {formatLong(flow.firstNegativeDate)} tu saldo pasaría a negativo. Punto más bajo: {formatMoney(flow.minBalance, currency)} el {formatShort(flow.minDate)}.
            </p>
          )}
          <div className="px-2 pt-2 pb-3 sm:px-4">
            <BalanceChartLazy data={flow.days.map((d) => ({ date: d.date, closing: d.closing, inflow: d.inflow, outflow: d.outflow }))} currency={currency} height={200} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Lo programado, por fecha" subtitle="Confírmalo cuando ocurra, edítalo o elimínalo" action={<NewPlannedButton size="sm" variant="secondary">Programar</NewPlannedButton>} />
          <div className="px-4 pb-2 sm:px-5">
            <PendingList
              items={occ}
              baseCurrency={currency}
              group="date"
              empty={<EmptyState title="No hay nada programado en este periodo" action={<NewPlannedButton initial={{ kind: "income" }}>Programar ingreso</NewPlannedButton>} className="py-8" />}
            />
          </div>
        </Card>
      </div>

      {activeDays.length > 0 && (
        <Card>
          <CardHeader title="Saldo estimado por día" subtitle="Cómo quedaría tu saldo al cierre de cada fecha con movimientos" />
          <ol className="mt-2 divide-y divide-line">
            {activeDays.map((d) => (
              <li key={d.date} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm sm:px-5">
                <span className="min-w-0">
                  <span className="block font-semibold text-ink first-letter:uppercase">{d.date === today ? "Hoy" : formatLong(d.date)}</span>
                  <span className="block truncate text-xs text-muted">
                    {d.items
                      .filter((o) => o.cashEffect !== 0)
                      .map((o) => o.name)
                      .join(" · ")}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="num block text-xs text-muted">
                    {d.inflow > 0 && <span className="text-positive">+{formatMoney(d.inflow, currency)} </span>}
                    {d.outflow > 0 && <span>−{formatMoney(d.outflow, currency)}</span>}
                  </span>
                  <span className={cn("num block font-semibold", d.closing < 0 ? "text-negative" : "text-ink")}>{formatMoney(d.closing, currency)}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
