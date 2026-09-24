import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import { NewTransactionButton } from "@/components/app/open-buttons";
import { Card, EmptyState, Money, PageHeader } from "@/components/ui/misc";
import { AccountIcon, CategoryIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { getAccounts, getCategories, getContext } from "@/lib/data";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { formatMedium } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { AccountActions } from "./actions";

export const metadata: Metadata = { title: "Cuenta" };

export default async function CuentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ supabase }, accounts, categories] = await Promise.all([getContext(), getAccounts(), getCategories()]);
  const acc = accounts.find((a) => a.id === id);
  if (!acc) notFound();

  const { data: txs } = await supabase
    .from("transactions")
    .select("id, kind, date, amount, to_amount, account_id, to_account_id, category_id, description")
    .or(`account_id.eq.${id},to_account_id.eq.${id}`)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  const accMap = new Map(accounts.map((a) => [a.id, a]));
  const catMap = new Map(categories.map((c) => [c.id, c]));

  // Saldo corrido (de más reciente a más antiguo)
  let running = acc.balance;
  const rows = (txs ?? []).map((t) => {
    const incoming = t.to_account_id === id;
    const effect = incoming ? Number(t.to_amount ?? t.amount) : t.kind === "income" ? Number(t.amount) : -Number(t.amount);
    const after = running;
    running -= effect;
    const cat = t.category_id ? catMap.get(t.category_id) : undefined;
    return { ...t, effect, after, cat, other: incoming ? accMap.get(t.account_id) : t.to_account_id ? accMap.get(t.to_account_id) : undefined };
  });

  return (
    <>
      <Link href="/cuentas" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Cuentas
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <AccountIcon type={acc.type} className="size-11" />
            {acc.name}
          </span>
        }
        subtitle={[ACCOUNT_TYPE_LABELS[acc.type], acc.institution, acc.currency].filter(Boolean).join(" · ")}
        actions={<AccountActions account={acc} />}
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-5">
          <p className="text-[13px] font-semibold text-muted">{acc.type === "credit_card" ? "Deuda actual" : "Saldo actual"}</p>
          <Money
            value={acc.type === "credit_card" ? Math.max(0, -acc.balance) : acc.balance}
            currency={acc.currency}
            className={cn("mt-1 block text-2xl font-bold", acc.type !== "credit_card" && acc.balance < 0 && "text-negative")}
          />
        </Card>
        <Card className="p-5">
          <p className="text-[13px] font-semibold text-muted">Saldo inicial</p>
          <Money value={acc.opening_balance} currency={acc.currency} className="mt-1 block text-2xl font-bold" />
          <p className="text-xs text-muted">al {formatMedium(acc.opening_date)}</p>
        </Card>
        <Card className="flex items-center justify-center gap-2 p-5">
          <NewTransactionButton initial={{ kind: "expense", account_id: acc.id }} variant="secondary">Gasto</NewTransactionButton>
          <NewTransactionButton initial={{ kind: "income", account_id: acc.id }} variant="secondary">Ingreso</NewTransactionButton>
        </Card>
      </div>

      <Card>
        {rows.length ? (
          <table className="w-full text-sm">
            <caption className="sr-only">Movimientos de {acc.name}</caption>
            <thead>
              <tr className="border-b border-line text-left text-xs font-bold tracking-wide text-muted uppercase">
                <th className="px-5 py-3">Fecha</th>
                <th className="px-2 py-3">Detalle</th>
                <th className="px-2 py-3 text-right">Valor</th>
                <th className="hidden px-5 py-3 text-right sm:table-cell">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-3 whitespace-nowrap text-muted">{formatMedium(r.date)}</td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2.5">
                      {r.kind === "transfer" ? (
                        <span className="grid size-8 place-items-center rounded-lg bg-navy-900/5 text-navy-700">
                          <ArrowLeftRight className="size-4" />
                        </span>
                      ) : (
                        <CategoryIcon icon={r.cat?.icon} color={r.cat?.color} size="sm" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-ink">
                          {r.description || r.cat?.name || (r.kind === "transfer" ? "Transferencia" : "Movimiento")}
                        </span>
                        {r.other && <span className="block truncate text-xs text-muted">{r.effect > 0 ? `desde ${r.other.name}` : `hacia ${r.other.name}`}</span>}
                      </span>
                    </div>
                  </td>
                  <td className={cn("num px-2 py-3 text-right font-bold whitespace-nowrap", r.effect > 0 ? "text-positive" : "text-ink")}>
                    {formatMoney(r.effect, acc.currency, { signed: true })}
                  </td>
                  <td className="num hidden px-5 py-3 text-right whitespace-nowrap text-ink-2 sm:table-cell">{formatMoney(r.after, acc.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <EmptyState title="Esta cuenta aún no tiene movimientos." />
        )}
      </Card>
    </>
  );
}
