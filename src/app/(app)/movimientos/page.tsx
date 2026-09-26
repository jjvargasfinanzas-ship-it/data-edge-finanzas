import type { Metadata } from "next";
import { ArrowLeftRight, Download } from "lucide-react";
import { NewTransactionButton } from "@/components/app/open-buttons";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { StatTile, TileGrid } from "@/components/ui/tiles";
import { getAccounts, getCategories, getContext, getMonthTotals, getRates, monthRange } from "@/lib/data";
import { isValidMonth } from "@/lib/dates";
import { TransactionFilters } from "./filters";
import { TransactionList, type TxRow } from "./list";

export const metadata: Metadata = { title: "Movimientos" };

const PAGE = 50;

export default async function MovimientosPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const { supabase, today, currency } = await getContext();
  const month = isValidMonth(sp.mes) ? sp.mes! : today.slice(0, 7);
  const { from, to } = monthRange(month);
  const page = Math.max(1, Number(sp.pagina) || 1);

  let q = supabase
    .from("transactions")
    .select("id, kind, date, amount, account_id, to_account_id, to_amount, category_id, description, notes, planned_item_id, planned_date, obligation_id", { count: "exact" })
    .gte("date", from)
    .lte("date", to)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);

  // Los pagos de obligaciones no son gastos: tienen su propio filtro.
  if (sp.tipo === "income" || sp.tipo === "transfer") q = q.eq("kind", sp.tipo);
  if (sp.tipo === "expense") q = q.eq("kind", "expense").is("obligation_id", null);
  if (sp.tipo === "obligation") q = q.not("obligation_id", "is", null);
  if (sp.cuenta && /^[0-9a-f-]{36}$/.test(sp.cuenta)) q = q.or(`account_id.eq.${sp.cuenta},to_account_id.eq.${sp.cuenta}`);
  if (sp.categoria && /^[0-9a-f-]{36}$/.test(sp.categoria)) {
    const cats = await getCategories();
    const ids = [sp.categoria, ...cats.filter((c) => c.parent_id === sp.categoria).map((c) => c.id)];
    q = q.in("category_id", ids);
  }
  if (sp.q) q = q.ilike("description", `%${sp.q.replace(/[%_,()]/g, " ").slice(0, 60)}%`);

  const [{ data, count }, totals, accounts, categories, rates] = await Promise.all([
    q,
    getMonthTotals(from, to),
    getAccounts(),
    getCategories(),
    getRates(),
  ]);
  void rates;

  const accMap = new Map(accounts.map((a) => [a.id, a]));
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const rows: TxRow[] = (data ?? []).map((t) => {
    const cat = t.category_id ? catMap.get(t.category_id) : undefined;
    const parent = cat?.parent_id ? catMap.get(cat.parent_id) : undefined;
    const acc = accMap.get(t.account_id);
    return {
      ...t,
      amount: Number(t.amount),
      to_amount: t.to_amount === null ? null : Number(t.to_amount),
      currency: acc?.currency ?? "COP",
      accountName: acc?.name ?? "Cuenta",
      toAccountName: t.to_account_id ? (accMap.get(t.to_account_id)?.name ?? "Cuenta") : null,
      categoryName: cat ? (parent ? `${parent.name} · ${cat.name}` : cat.name) : null,
      icon: cat?.icon ?? parent?.icon ?? null,
      color: cat?.color ?? parent?.color ?? null,
    };
  });
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const filtered = !!(sp.tipo || sp.cuenta || sp.categoria || sp.q);

  return (
    <>
      <PageHeader
        title="Movimientos"
        subtitle="Lo que realmente entró, salió o se movió. Toca uno para corregirlo."
        actions={
          <>
            <a
              href={`/api/export/movimientos?mes=${month}`}
              aria-label="Descargar CSV"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-card-border bg-card px-4 text-sm font-semibold text-ink hover:bg-canvas"
            >
              <Download className="size-4" /> <span className="hidden sm:inline">CSV</span>
            </a>
            <NewTransactionButton>Nuevo movimiento</NewTransactionButton>
          </>
        }
      />

      <TransactionFilters
        month={month}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
        categories={categories.filter((c) => !c.parent_id).map((c) => ({ id: c.id, name: c.name, kind: c.kind }))}
        values={{ tipo: sp.tipo ?? "", cuenta: sp.cuenta ?? "", categoria: sp.categoria ?? "", q: sp.q ?? "" }}
      />

      <TileGrid cols={3} className="mb-4">
        <StatTile label="Ingresos" value={totals.income} currency={currency} tone="positive" accent="teal" href={`/movimientos?mes=${month}&tipo=income`} />
        <StatTile label="Gastos" value={totals.expense} currency={currency} accent="navy" href={`/movimientos?mes=${month}&tipo=expense`} />
        <StatTile label="Neto" value={totals.savings} currency={currency} signed accent="mix" href={`/movimientos?mes=${month}`} />
      </TileGrid>

      <Card>
        {rows.length ? (
          <TransactionList rows={rows} page={page} pages={pages} count={count ?? 0} />
        ) : (
          <EmptyState
            icon={<ArrowLeftRight className="size-7" />}
            title={filtered ? "No hay movimientos con esos filtros." : "No tienes movimientos registrados este mes."}
            description={filtered ? "Prueba con otro filtro o mes." : "Registra tus gastos e ingresos en segundos con el botón +."}
            action={!filtered ? <NewTransactionButton initial={{ kind: "expense" }}>Registrar mi primer gasto</NewTransactionButton> : undefined}
          />
        )}
      </Card>
    </>
  );
}
