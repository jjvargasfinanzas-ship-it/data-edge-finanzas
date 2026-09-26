import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { NewPlannedButton } from "@/components/app/open-buttons";
import { Card, EmptyState, Money, PageHeader } from "@/components/ui/misc";
import { StatTile, TileGrid } from "@/components/ui/tiles";
import { cn } from "@/components/ui/cn";
import { getAccounts, getCategories, getContext, getPeriodPlan, getPlanned, getRates } from "@/lib/data";
import { endOfMonth, formatMonth, startOfMonth } from "@/lib/dates";
import { convert } from "@/lib/money";
import { FREQUENCY_LABELS, MONTHLY_FACTOR, nextOccurrence } from "@/lib/recurrence";
import { PlannedList, type PlannedRow } from "./list";

export const metadata: Metadata = { title: "Programación" };

const TABS = {
  ingresos: { label: "Ingresos", kinds: ["income"] },
  gastos: { label: "Gastos y pagos", kinds: ["expense", "transfer"] },
} as const;

export default async function ProgramadosPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const sp = await searchParams;
  const tab = (sp.tipo === "gastos" ? "gastos" : "ingresos") as keyof typeof TABS;
  const { today, currency } = await getContext();
  const [planned, accounts, categories, rates, plan] = await Promise.all([
    getPlanned(),
    getAccounts(),
    getCategories(),
    getRates(),
    getPeriodPlan(startOfMonth(today), endOfMonth(today)),
  ]);
  const acc = new Map(accounts.map((a) => [a.id, a]));
  const cat = new Map(categories.map((c) => [c.id, c]));

  // Estado del mes por programado (suma de sus ocurrencias del mes)
  const monthByItem = new Map<string, { planned: number; received: number; pending: number; overdue: number; count: number }>();
  for (const r of plan.rows) {
    if (r.status === "skipped") continue;
    const m = monthByItem.get(r.plannedItemId) ?? { planned: 0, received: 0, pending: 0, overdue: 0, count: 0 };
    m.planned += r.planned;
    m.received += r.received;
    m.pending += r.pending;
    m.overdue += r.status === "overdue" ? 1 : 0;
    m.count++;
    monthByItem.set(r.plannedItemId, m);
  }

  const rows: PlannedRow[] = planned.map((p) => {
    const a = acc.get(p.account_id);
    const c = p.category_id ? cat.get(p.category_id) : undefined;
    const parent = c?.parent_id ? cat.get(c.parent_id) : undefined;
    return {
      ...p,
      amount: Number(p.amount),
      currency: a?.currency ?? "COP",
      accountName: a?.name ?? "",
      toAccountName: p.to_account_id ? (acc.get(p.to_account_id)?.name ?? "") : null,
      categoryName: c ? (parent ? `${parent.name} · ${c.name}` : c.name) : null,
      icon: c?.icon ?? parent?.icon ?? null,
      color: c?.color ?? parent?.color ?? null,
      frequencyLabel: FREQUENCY_LABELS[p.frequency],
      next: p.is_active ? nextOccurrence(p, today) : null,
      monthly: convert(Number(p.amount), a?.currency ?? "COP", currency, rates) * MONTHLY_FACTOR[p.frequency],
      month: monthByItem.get(p.id) ?? null,
    };
  });

  const active = rows.filter((r) => r.is_active);
  const fixedIn = active.filter((r) => r.kind === "income").reduce((s, r) => s + r.monthly, 0);
  const fixedOut = active.filter((r) => r.kind === "expense").reduce((s, r) => s + r.monthly, 0);
  const visible = rows.filter((r) => (TABS[tab].kinds as readonly string[]).includes(r.kind));
  const isIncome = tab === "ingresos";

  return (
    <>
      <PageHeader
        title="Programación"
        subtitle="Lo que esperas recibir o pagar. Es una proyección: no cambia tu saldo hasta que lo confirmes. Toca uno para editarlo o eliminarlo."
        actions={
          <>
            <NewPlannedButton variant="secondary" initial={{ kind: "expense" }}>
              Programar gasto
            </NewPlannedButton>
            <NewPlannedButton initial={{ kind: "income" }}>Programar ingreso</NewPlannedButton>
          </>
        }
      />

      <TileGrid cols={3} className="mb-4">
        <StatTile label="Ingresos fijos/mes" value={fixedIn} currency={currency} tone="positive" href="/programados?tipo=ingresos" />
        <StatTile label="Gastos fijos/mes" value={fixedOut} currency={currency} href="/programados?tipo=gastos" />
        <StatTile label="Margen" value={fixedIn - fixedOut} currency={currency} signed href="/flujo-de-caja?v=proyectado" />
      </TileGrid>

      <nav className="mb-4 flex w-fit rounded-xl bg-surface p-1 ring-1 ring-line" aria-label="Tipo">
        {(Object.keys(TABS) as (keyof typeof TABS)[]).map((k) => {
          const n = rows.filter((r) => (TABS[k].kinds as readonly string[]).includes(r.kind)).length;
          return (
            <Link
              key={k}
              href={`/programados?tipo=${k}`}
              aria-current={k === tab ? "true" : undefined}
              className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold", k === tab ? "bg-tint text-teal-700 shadow-sm" : "text-muted hover:text-ink")}
            >
              {TABS[k].label} <span className="ml-1 opacity-70">{n}</span>
            </Link>
          );
        })}
      </nav>

      {visible.length ? (
        <PlannedList rows={visible} currency={currency} monthLabel={formatMonth(today)} />
      ) : (
        <Card>
          <EmptyState
            icon={<CalendarClock className="size-7" />}
            title={isIncome ? "Aún no tienes ingresos programados" : "Aún no tienes gastos programados"}
            description={
              isIncome
                ? "Programa tu salario, honorarios, arriendos que recibes, comisiones o pensión. Defines valor, frecuencia, fecha de inicio y de fin."
                : "Programa arriendo, servicios, cuotas, suscripciones y pagos de tarjeta."
            }
            action={
              <NewPlannedButton initial={{ kind: isIncome ? "income" : "expense" }}>{isIncome ? "Programar ingreso" : "Programar gasto"}</NewPlannedButton>
            }
          />
        </Card>
      )}
      <p className="mt-4 text-center text-xs text-muted">
        Equivalente mensual: semanal × 4,33 · quincenal × 2 · anual ÷ 12. Los pagos únicos no suman al mes típico.
      </p>
    </>
  );
}
