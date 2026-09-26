import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleCheck } from "lucide-react";
import { StateBadge, dueLabel } from "@/components/app/obligations/cards";
import { Badge, Card, Progress } from "@/components/ui/misc";
import { StatTile, TileGrid } from "@/components/ui/tiles";
import { cn } from "@/components/ui/cn";
import { getAccounts, getContext, getObligations } from "@/lib/data";
import { formatMedium, formatShort } from "@/lib/dates";
import { formatMoney, formatPct, type Currency } from "@/lib/money";
import { CREDITOR_TYPE_LABELS, OBLIGATION_KIND_LABELS, type InstallmentStatus } from "@/lib/obligations";
import { FREQUENCY_LABELS } from "@/lib/recurrence";
import { DeletePayment, ObligationActions } from "./actions";

export const metadata: Metadata = { title: "Obligación" };

const INST: Record<InstallmentStatus, { label: string; tone: "positive" | "negative" | "warning" | "brand" | "neutral" }> = {
  paid: { label: "Pagada", tone: "positive" },
  partial: { label: "Abono parcial", tone: "brand" },
  overdue: { label: "Vencida", tone: "negative" },
  due_soon: { label: "Por vencer", tone: "warning" },
  pending: { label: "Pendiente", tone: "neutral" },
};

export default async function ObligacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ today }, { items }, accounts] = await Promise.all([getContext(), getObligations(), getAccounts()]);
  const item = items.find((i) => i.row.id === id);
  if (!item) notFound();
  const { row: o, summary: s, payments } = item;
  const cur = o.currency as Currency;
  const m = (v: number) => formatMoney(v, cur);
  const accName = new Map(accounts.map((a) => [a.id, a.name]));
  const interest = s.totalToPay - Number(o.original_amount);
  const next = s.next;
  const creditorType = o.creditor_type === "person" ? "person" : "entity";

  return (
    <div className="space-y-4">
      <Link href="/obligaciones" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
        <ArrowLeft className="size-4" /> Obligaciones
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display truncate text-xl leading-tight font-semibold text-ink sm:text-2xl">{o.creditor}</h1>
            <StateBadge state={s.state} />
          </div>
          <p className="mt-0.5 text-xs text-muted sm:text-[13px]">
            {o.concept} · {OBLIGATION_KIND_LABELS[o.kind]} · {CREDITOR_TYPE_LABELS[creditorType]}
          </p>
        </div>
        <ObligationActions
          status={o.status}
          canPay={s.state !== "paid" && s.state !== "cancelled"}
          edit={{
            id: o.id,
            creditor: o.creditor,
            creditor_type: creditorType,
            kind: o.kind,
            concept: o.concept,
            currency: cur,
            original_amount: Number(o.original_amount),
            installment_amount: o.installment_amount === null ? null : Number(o.installment_amount),
            installments: o.installments,
            frequency: o.frequency,
            first_due_date: o.first_due_date,
            interest_rate: o.interest_rate === null ? null : Number(o.interest_rate),
            account_id: o.account_id,
            notes: o.notes,
          }}
          pay={{
            obligationId: o.id,
            label: o.concept,
            currency: cur,
            pending: s.pending,
            nextAmount: next ? next.remaining : null,
            nextDate: next?.date ?? null,
            nextLabel: next ? (s.schedule.length > 1 ? `Cuota ${next.n} de ${s.schedule.length}` : "Pago") : null,
            accountId: o.account_id,
          }}
        />
      </header>

      {/* Resumen */}
      <Card className="overflow-hidden">
        <div className={cn("grid gap-4 px-4 py-4 sm:grid-cols-[1fr_1.4fr] sm:items-center sm:px-5", s.state === "overdue" ? "bg-negative-50" : s.state === "paid" ? "bg-positive-50" : "bg-pastel-mix")}>
          <div>
            <p className="text-xs font-medium text-ink-2">{s.state === "paid" ? "Obligación pagada" : "Saldo pendiente"}</p>
            <p className="num mt-0.5 text-2xl leading-tight font-semibold text-ink">{m(s.pending)}</p>
            {next && (
              <p className={cn("mt-0.5 text-xs", s.state === "overdue" ? "font-semibold text-negative" : "text-ink-2/80")}>
                Próximo pago {m(next.remaining)} · {formatMedium(next.date)} ({dueLabel(next.date, today).toLowerCase()})
              </p>
            )}
          </div>
          <div>
            <div className="flex items-baseline justify-between text-xs text-ink-2">
              <span>Avance</span>
              <span className="num font-semibold text-ink">{Math.round(s.paidPct)}%</span>
            </div>
            <Progress value={s.paidPct} className="mt-1.5 h-2.5 bg-card" label="Avance de pago" tone={s.state === "overdue" ? "negative" : "brand"} />
            <p className="mt-1.5 text-xs text-ink-2/80">
              Pagado <span className="num font-semibold text-ink">{m(s.paid)}</span> de <span className="num font-semibold text-ink">{m(s.totalToPay)}</span>
            </p>
          </div>
        </div>
      </Card>

      <TileGrid cols={6}>
        <StatTile label="Valor original" value={Number(o.original_amount)} currency={cur} accent="mix" hint={formatMedium(o.first_due_date).replace(/^\w/, (c) => c.toUpperCase())} />
        <StatTile label="Total a pagar" value={s.totalToPay} currency={cur} accent="navy" hint={interest > 0.5 ? `Incluye ${formatMoney(interest, cur, { compact: true })} de intereses` : "Sin intereses"} />
        <StatTile label="Total pagado" value={s.paid} currency={cur} accent="teal" tone="positive" hint={`${payments.length} pago${payments.length === 1 ? "" : "s"}`} href="#pagos" />
        <StatTile
          label="Próximo pago"
          value={next?.remaining ?? 0}
          currency={cur}
          accent={s.state === "due_soon" ? "warn" : "sky"}
          valueText={next ? undefined : "—"}
          hint={next ? `${formatShort(next.date)} · ${dueLabel(next.date, today)}` : "Nada pendiente"}
          href="#cuotas"
        />
        <StatTile
          label="Cuotas pagadas"
          value={s.installmentsPaid}
          currency={cur}
          valueText={`${s.installmentsPaid}/${s.schedule.length}`}
          accent="card"
          hint={s.schedule.length > 1 ? FREQUENCY_LABELS[o.frequency] : "Pago único"}
          href="#cuotas"
        />
        <StatTile
          label="Vencido"
          value={s.overdueAmount}
          currency={cur}
          accent={s.overdueCount ? "alert" : "card"}
          tone={s.overdueCount ? "negative" : "neutral"}
          hint={s.overdueCount ? `${s.overdueCount} cuota${s.overdueCount > 1 ? "s" : ""}` : "Al día"}
          href="#cuotas"
        />
      </TileGrid>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Cronograma */}
        <Card id="cuotas" className="scroll-mt-24">
          <div className="flex items-baseline justify-between px-4 pt-4 sm:px-5">
            <h2 className="text-sm font-semibold text-ink">Plan de pagos</h2>
            <span className="text-xs text-muted">
              {s.schedule.length} cuota{s.schedule.length > 1 ? "s" : ""}
            </span>
          </div>
          <ol className="mt-2 divide-y divide-line">
            {s.schedule.map((i) => {
              const isNext = next?.n === i.n;
              return (
                <li key={i.n} className={cn("flex items-center gap-3 px-4 py-2.5 sm:px-5", isNext && "bg-tint/80")}>
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                      i.status === "paid" ? "bg-positive-50 text-positive" : i.status === "overdue" ? "bg-negative-50 text-negative" : "bg-tint-2 text-ink-2",
                    )}
                  >
                    {i.status === "paid" ? <CircleCheck className="size-4" /> : i.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">
                      {formatMedium(i.date)}
                      {isNext && <span className="ml-2 text-[11px] font-semibold text-teal-700">Próxima</span>}
                    </p>
                    <p className="text-[11px] text-ink-2/75">
                      {i.paid > 0 && i.status !== "paid" ? `Abonado ${m(i.paid)} · falta ${m(i.remaining)}` : `Cuota ${i.n}${s.schedule.length > 1 ? ` de ${s.schedule.length}` : ""}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="num text-sm font-semibold text-ink">{m(i.amount)}</p>
                    <Badge tone={INST[i.status].tone}>{INST[i.status].label}</Badge>
                  </div>
                </li>
              );
            })}
          </ol>
        </Card>

        <div className="space-y-4">
          {/* Pagos */}
          <Card id="pagos" className="scroll-mt-24">
            <div className="flex items-baseline justify-between px-4 pt-4 sm:px-5">
              <h2 className="text-sm font-semibold text-ink">Pagos realizados</h2>
              <span className="num text-xs font-semibold text-ink">{m(s.paid)}</span>
            </div>
            {payments.length ? (
              <ul className="mt-2 divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink">{formatMedium(p.date)}</p>
                      <p className="truncate text-[11px] text-ink-2/75">Desde {accName.get(p.account_id) ?? "cuenta"}</p>
                    </div>
                    <span className="num shrink-0 text-sm font-semibold text-ink">{m(p.value)}</span>
                    <DeletePayment id={p.id} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 pt-2 pb-4 text-sm text-muted sm:px-5">Aún no registras pagos.</p>
            )}
          </Card>

          {/* Información */}
          <Card>
            <h2 className="px-4 pt-4 text-sm font-semibold text-ink sm:px-5">Información</h2>
            <dl className="mt-2 divide-y divide-line text-sm">
              {[
                ["Acreedor", `${o.creditor} (${CREDITOR_TYPE_LABELS[creditorType].toLowerCase()})`],
                ["Concepto", o.concept],
                ["Tipo", OBLIGATION_KIND_LABELS[o.kind]],
                ["Periodicidad", s.schedule.length > 1 ? FREQUENCY_LABELS[o.frequency] : "Pago único"],
                ["Última cuota", formatMedium(s.lastDueDate)],
                ["Tasa", o.interest_rate !== null ? `${formatPct(Number(o.interest_rate))} E.A.` : "—"],
                ["Cuenta de pago", o.account_id ? (accName.get(o.account_id) ?? "—") : "Sin cuenta (no entra al flujo)"],
                ...(o.notes ? [["Notas", o.notes]] : []),
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3 px-4 py-2 sm:px-5">
                  <dt className="w-28 shrink-0 text-xs text-muted">{k}</dt>
                  <dd className="min-w-0 flex-1 text-[13px] text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
