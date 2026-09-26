import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LoanPaymentButton, NewTransactionButton } from "@/components/app/open-buttons";
import { PendingList } from "@/components/app/pending-list";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { AccountIcon } from "@/components/ui/icons";
import { StatRows, type StatRow } from "@/components/ui/stat-rows";
import { cn } from "@/components/ui/cn";
import { getAccounts, getCashflow, getCategories, getContext } from "@/lib/data";
import { ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { addDays, formatMedium } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { AccountActions } from "./actions";
import { AccountMoves, type AccountMove } from "./moves";

export const metadata: Metadata = { title: "Cuenta" };

export default async function CuentaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, today } = await getContext();
  const [accounts, categories, flow, { data: txs }] = await Promise.all([
    getAccounts(),
    getCategories(),
    getCashflow(addDays(today, 60)),
    supabase
      .from("transactions")
      .select("id, kind, date, amount, to_amount, account_id, to_account_id, category_id, description, notes, planned_item_id, planned_date")
      .or(`account_id.eq.${id},to_account_id.eq.${id}`)
      .lte("date", today)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  const acc = accounts.find((a) => a.id === id);
  if (!acc) notFound();

  const accMap = new Map(accounts.map((a) => [a.id, a]));
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const isCard = acc.type === "credit_card";

  // Composición del saldo: saldo inicial + ingresos − gastos ± transferencias
  let income = 0;
  let expense = 0;
  let trIn = 0;
  let trOut = 0;
  let running = acc.balance;
  const moves: AccountMove[] = (txs ?? []).map((t) => {
    const incoming = t.to_account_id === id && t.account_id !== id;
    let effect: number;
    if (incoming) {
      effect = Number(t.to_amount ?? t.amount);
      trIn += effect;
    } else if (t.kind === "income") {
      effect = Number(t.amount);
      income += effect;
    } else if (t.kind === "expense") {
      effect = -Number(t.amount);
      expense -= effect;
    } else {
      effect = -Number(t.amount);
      trOut -= effect;
    }
    const after = running;
    running -= effect;
    const cat = t.category_id ? catMap.get(t.category_id) : undefined;
    const other = incoming ? accMap.get(t.account_id) : t.to_account_id ? accMap.get(t.to_account_id) : undefined;
    return {
      id: t.id,
      title: t.description || cat?.name || (t.kind === "transfer" ? "Transferencia" : "Movimiento"),
      subtitle: other ? (incoming ? `desde ${other.name}` : `hacia ${other.name}`) : t.description ? (cat?.name ?? "") : "",
      effect,
      after,
      icon: cat?.icon ?? null,
      color: cat?.color ?? null,
      isTransfer: t.kind === "transfer",
      fromPlanned: !!t.planned_item_id,
      tx: {
        id: t.id,
        kind: t.kind,
        date: t.date,
        amount: Number(t.amount),
        account_id: t.account_id,
        to_account_id: t.to_account_id,
        to_amount: t.to_amount == null ? null : Number(t.to_amount),
        category_id: t.category_id,
        description: t.description,
        notes: t.notes,
        planned_item_id: t.planned_item_id,
        planned_date: t.planned_date,
      },
    };
  });

  const money = (v: number) => formatMoney(v, acc.currency);
  const receivable = acc.type === "loan_receivable";
  const payable = acc.type === "loan_payable";
  const loan = receivable || payable;
  const loanPending = receivable ? acc.balance : -acc.balance;
  // Préstamo: capital prestado − abonos = pendiente
  const lentTotal = Math.abs(acc.opening_balance) + (receivable ? trIn : trOut);
  const repaid = receivable ? trOut : trIn;
  const loanRows: StatRow[] = [
    { label: receivable ? "Le presté" : "Me prestaron", value: money(lentTotal) },
    { op: "−", label: receivable ? "Abonos que me hizo" : "Abonos que he hecho", value: money(repaid), tone: "in" },
    { op: "=", label: receivable ? "Me debe hoy" : "Debo hoy", value: money(loanPending), tone: "total" },
  ];
  if (income || expense)
    loanRows.push({ label: "Intereses u otros registrados aquí", hint: "Mejor regístralos como ingreso o gasto en tu cuenta", value: money(income - expense) });
  const composition: StatRow[] = [
    {
      label: "Saldo inicial",
      hint: `Lo que escribiste al crear la cuenta (al ${formatMedium(acc.opening_date)})`,
      value: money(acc.opening_balance),
    },
  ];
  if (income) composition.push({ op: "+", label: isCard ? "Abonos y devoluciones" : "Ingresos", value: money(income), tone: "in" });
  if (expense) composition.push({ op: "−", label: isCard ? "Compras con la tarjeta" : "Gastos", value: money(expense), tone: "out" });
  if (trIn) composition.push({ op: "+", label: isCard ? "Pagos recibidos" : "Transferencias recibidas", value: money(trIn), tone: "in" });
  if (trOut) composition.push({ op: "−", label: "Transferencias enviadas", value: money(trOut), tone: "out" });
  composition.push({
    op: "=",
    label: isCard ? "Saldo hoy (negativo = deuda)" : "Saldo real hoy",
    value: money(acc.balance),
    tone: acc.balance < 0 && !isCard ? "negative" : "total",
  });

  const programmed = flow.occurrences.filter(
    (o) => (o.accountId === id || o.toAccountId === id) && !(o.flow === "card_estimate" && !isCard),
  );

  return (
    <>
      <Link href={loan ? "/prestamos" : "/cuentas"} className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> {loan ? "Préstamos" : "Cuentas"}
      </Link>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <AccountIcon type={acc.type} className="size-10" />
            {acc.name}
          </span>
        }
        subtitle={[ACCOUNT_TYPE_LABELS[acc.type], acc.institution, acc.currency].filter(Boolean).join(" · ")}
        actions={<AccountActions account={acc} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-4">
          <Card className={cn("border-transparent p-4 sm:p-5", isCard || payable ? "bg-pastel-navy" : "bg-pastel-teal")}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-ink-2">{receivable ? "Me debe" : payable ? "Debo" : isCard ? "Deuda actual" : "Saldo real hoy"}</p>
              <Badge tone="positive">Real</Badge>
            </div>
            <p className={cn("num mt-1 text-2xl font-semibold whitespace-nowrap", !isCard && !loan && acc.balance < 0 && "text-negative")}>
              {money(loan ? loanPending : isCard ? Math.max(0, -acc.balance) : acc.balance)}
            </p>
            {loan ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <LoanPaymentButton loan={acc} size="sm">
                  {receivable ? "Me abonaron" : "Abonar"}
                </LoanPaymentButton>
                <span className="text-xs text-muted">No cuenta como ingreso ni gasto.</span>
              </div>
            ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <NewTransactionButton initial={{ kind: "expense", account_id: acc.id }} variant="secondary" size="sm">
                Gasto
              </NewTransactionButton>
              <NewTransactionButton initial={{ kind: "income", account_id: acc.id }} variant="secondary" size="sm">
                Ingreso
              </NewTransactionButton>
            </div>
            )}
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="font-semibold text-ink">¿De dónde sale este saldo?</h2>
            <StatRows rows={loan ? loanRows : composition} className="mt-1" />
            <p className="mt-2 text-xs text-muted">
              Solo cuenta movimientos con fecha hasta hoy. Si el saldo inicial no es correcto, corrígelo con <strong>Editar</strong> arriba.
            </p>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold text-ink">Programado en esta cuenta</h2>
              <Badge tone="neutral">Estimado</Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted">Próximos 60 días. Aún no afecta el saldo: confírmalo cuando ocurra, o edítalo/elimínalo.</p>
            <div className="mt-1">
              <PendingList
                items={programmed}
                baseCurrency={acc.currency}
                group="status"
                empty={<p className="py-3 text-sm text-muted">No hay nada programado.</p>}
              />
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-baseline justify-between gap-2 px-4 pt-4 pb-2 sm:px-5">
            <h2 className="font-semibold text-ink">Movimientos reales</h2>
            <span className="text-xs text-muted">Toca uno para corregirlo</span>
          </div>
          {moves.length ? (
            <AccountMoves moves={moves.slice(0, 200)} currency={acc.currency} />
          ) : (
            <EmptyState title="Esta cuenta aún no tiene movimientos." />
          )}
        </Card>
      </div>
    </>
  );
}
