import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { NewPlannedButton } from "@/components/app/open-buttons";
import { Card, EmptyState, Money, PageHeader } from "@/components/ui/misc";
import { getAccounts, getCategories, getContext, getPlanned, getRates } from "@/lib/data";
import { convert } from "@/lib/money";
import { FREQUENCY_LABELS, MONTHLY_FACTOR, nextOccurrence } from "@/lib/recurrence";
import { PlannedList, type PlannedRow } from "./list";

export const metadata: Metadata = { title: "Programados" };

export default async function ProgramadosPage() {
  const [{ today, currency }, planned, accounts, categories, rates] = await Promise.all([
    getContext(),
    getPlanned(),
    getAccounts(),
    getCategories(),
    getRates(),
  ]);
  const acc = new Map(accounts.map((a) => [a.id, a]));
  const cat = new Map(categories.map((c) => [c.id, c]));

  const rows: PlannedRow[] = planned.map((p) => {
    const a = acc.get(p.account_id);
    const c = p.category_id ? cat.get(p.category_id) : undefined;
    const parent = c?.parent_id ? cat.get(c.parent_id) : undefined;
    const monthly = convert(Number(p.amount), a?.currency ?? "COP", currency, rates) * MONTHLY_FACTOR[p.frequency];
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
      monthly,
    };
  });

  const active = rows.filter((r) => r.is_active);
  const fixedIn = active.filter((r) => r.kind === "income").reduce((s, r) => s + r.monthly, 0);
  const fixedOut = active.filter((r) => r.kind === "expense").reduce((s, r) => s + r.monthly, 0);

  return (
    <>
      <PageHeader
        title="Programados"
        subtitle="Ingresos, pagos y gastos que se repiten. Son la base de tu flujo de caja futuro y tu calendario."
        actions={<NewPlannedButton>Nuevo programado</NewPlannedButton>}
      />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold text-muted sm:text-[13px]">Ingresos fijos / mes</p>
          <Money value={fixedIn} currency={currency} className="mt-1 block text-lg font-bold text-positive sm:text-2xl" />
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold text-muted sm:text-[13px]">Gastos fijos / mes</p>
          <Money value={fixedOut} currency={currency} className="mt-1 block text-lg font-bold sm:text-2xl" />
        </Card>
        <Card className="p-4 sm:p-5">
          <p className="text-xs font-semibold text-muted sm:text-[13px]">Margen mensual</p>
          <Money value={fixedIn - fixedOut} currency={currency} colored className="mt-1 block text-lg font-bold sm:text-2xl" />
        </Card>
      </div>

      {rows.length ? (
        <PlannedList rows={rows} currency={currency} />
      ) : (
        <Card>
          <EmptyState
            icon={<CalendarClock className="size-7" />}
            title="Aún no tienes programados"
            description="Empieza por tu salario o ingreso principal, el arriendo, los servicios y las cuotas fijas."
            action={<NewPlannedButton>Crear el primero</NewPlannedButton>}
          />
        </Card>
      )}
      <p className="mt-4 text-center text-xs text-muted">
        Equivalente mensual: semanal × 4,33 · quincenal × 2 · anual ÷ 12. Los pagos únicos no suman al mes típico.
      </p>
    </>
  );
}
