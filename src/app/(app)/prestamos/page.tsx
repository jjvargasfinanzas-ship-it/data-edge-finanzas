import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, HandCoins } from "lucide-react";
import { LoanPaymentButton, NewLoanButton } from "@/components/app/open-buttons";
import { Badge, Card, EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { StatTile, TileGrid } from "@/components/ui/tiles";
import { AccountIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { getAccounts, getCashflow, getContext, getRates } from "@/lib/data";
import { addDays, formatShort } from "@/lib/dates";
import { convert, formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Préstamos" };

export default async function PrestamosPage() {
  const { supabase, today, currency } = await getContext();
  const [accounts, rates, flow] = await Promise.all([getAccounts(), getRates(), getCashflow(addDays(today, 365))]);
  const loans = accounts.filter((a) => a.type === "loan_receivable" || a.type === "loan_payable");
  const ids = loans.map((l) => l.id);

  type LoanTx = { id: string; amount: number; to_amount: number | null; account_id: string; to_account_id: string | null; kind: string };
  const cols = "id, amount, to_amount, account_id, to_account_id, kind";
  const [outRes, inRes] = ids.length
    ? await Promise.all([
        supabase.from("transactions").select(cols).in("account_id", ids).lte("date", today).limit(10000),
        supabase.from("transactions").select(cols).in("to_account_id", ids).lte("date", today).limit(10000),
      ])
    : [{ data: [] }, { data: [] }];
  const txs = [...new Map([...((outRes.data ?? []) as LoanTx[]), ...((inRes.data ?? []) as LoanTx[])].map((t) => [t.id, t])).values()];

  const rows = loans.map((l) => {
    const receivable = l.type === "loan_receivable";
    // Capital: lo que se prestó; Abonos: lo que se ha devuelto
    let principal = Math.abs(Number(l.opening_balance));
    let paid = 0;
    for (const t of txs) {
      if (t.kind !== "transfer") continue;
      const into = t.to_account_id === l.id;
      const out = t.account_id === l.id;
      if (!into && !out) continue;
      const v = into ? Number(t.to_amount ?? t.amount) : Number(t.amount);
      if (receivable ? into : out) principal += v;
      else paid += v;
    }
    const pending = receivable ? l.balance : -l.balance;
    const next = flow.occurrences.find((o) => o.accountId === l.id || o.toAccountId === l.id);
    return { l, receivable, principal, paid, pending, next };
  });

  const active = rows.filter((r) => !r.l.is_archived);
  const toBase = (v: number, c: (typeof accounts)[number]["currency"]) => convert(v, c, currency, rates);
  const owedToMe = active.filter((r) => r.receivable).reduce((s, r) => s + toBase(Math.max(0, r.pending), r.l.currency), 0);
  const iOwe = active.filter((r) => !r.receivable).reduce((s, r) => s + toBase(Math.max(0, r.pending), r.l.currency), 0);

  const groups = [
    { title: "Me deben", hint: "Plata que presté", items: active.filter((r) => r.receivable) },
    { title: "Debo", hint: "Plata que me prestaron", items: active.filter((r) => !r.receivable) },
  ];

  return (
    <>
      <PageHeader
        title="Préstamos"
        subtitle="Prestar o recibir un préstamo no es gasto ni ingreso: es plata que vuelve o que debes devolver."
        actions={
          <>
            <NewLoanButton variant="secondary" initial={{ direction: "borrowed" }}>
              Me prestaron
            </NewLoanButton>
            <NewLoanButton initial={{ direction: "lent" }}>Presté</NewLoanButton>
          </>
        }
      />

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<HandCoins className="size-7" />}
            title="No tienes préstamos registrados"
            description="Si le prestaste plata a alguien, regístralo aquí. Sale de tu cuenta sin contar como gasto y queda como cuenta por cobrar hasta que te paguen."
            action={<NewLoanButton initial={{ direction: "lent" }}>Registrar préstamo</NewLoanButton>}
          />
        </Card>
      ) : (
        <>
          <TileGrid cols={2} className="mb-4">
            <StatTile label="Me deben" value={owedToMe} currency={currency} tone="positive" accent="teal" />
            <StatTile label="Debo" value={iOwe} currency={currency} accent="navy" />
          </TileGrid>

          <div className="space-y-4">
            {groups.map((g) =>
              g.items.length ? (
                <section key={g.title}>
                  <h2 className="mb-2 px-1 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
                    {g.title} <span className="font-semibold tracking-normal normal-case">· {g.hint}</span>
                  </h2>
                  <Card>
                    <ul className="divide-y divide-line">
                      {g.items.map((r) => {
                        const pct = r.principal > 0 ? Math.min(100, (r.paid / r.principal) * 100) : 0;
                        const settled = r.pending <= 0.005;
                        return (
                          <li key={r.l.id} className="px-4 py-3 sm:px-5">
                            <div className="flex items-center gap-3">
                              <AccountIcon type={r.l.type} className="size-9" />
                              <Link href={`/cuentas/${r.l.id}`} className="min-w-0 flex-1">
                                <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                                  <span className="truncate">{r.l.institution || r.l.name}</span>
                                  {settled && <Badge tone="positive">Pagado</Badge>}
                                </span>
                                <span className="block truncate text-xs text-muted">
                                  {r.receivable ? "Le presté" : "Me prestó"} {formatMoney(r.principal, r.l.currency)}
                                  {r.paid > 0 && ` · abonado ${formatMoney(r.paid, r.l.currency)}`}
                                  {r.next && !settled && ` · ${r.receivable ? "cobro" : "pago"} ${formatShort(r.next.dueDate)}`}
                                </span>
                              </Link>
                              <span className="shrink-0 text-right">
                                <span className={cn("num block text-sm font-semibold", r.receivable ? "text-positive" : "text-ink")}>
                                  {formatMoney(Math.max(0, r.pending), r.l.currency)}
                                </span>
                                <span className="block text-[11px] text-muted">{r.receivable ? "por cobrar" : "por pagar"}</span>
                              </span>
                              <Link href={`/cuentas/${r.l.id}`} aria-label="Ver detalle" className="hidden text-muted sm:block">
                                <ChevronRight className="size-4" />
                              </Link>
                            </div>
                            <div className="mt-2 flex items-center gap-3 pl-12">
                              <Progress value={pct} className="flex-1" label={`${Math.round(pct)} % pagado`} />
                              {!settled && (
                                <LoanPaymentButton loan={r.l} size="sm">
                                  {r.receivable ? "Me abonaron" : "Abonar"}
                                </LoanPaymentButton>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </Card>
                </section>
              ) : null,
            )}
          </div>
          <p className="mt-4 text-center text-xs text-muted">
            Los intereses sí son ingreso o gasto: regístralos aparte con su categoría. Cuando un préstamo quede pagado, archívalo desde su detalle.
          </p>
        </>
      )}
    </>
  );
}
