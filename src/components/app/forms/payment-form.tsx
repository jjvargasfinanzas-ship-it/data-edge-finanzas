"use client";

import { useActionState, useState } from "react";
import { registerObligationPayment } from "@/app/actions/obligations";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { isLoan } from "@/lib/constants";
import { formatMedium } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";
import { AccountSelect } from "./account-select";
import { AmountInput } from "./amount-input";
import { useFormResult } from "./use-form-result";
import { useAppData } from "../app-data";

export type PaymentInitial = {
  obligationId: string;
  label: string;
  currency: Currency;
  pending: number;
  /** Lo que falta de la próxima cuota. */
  nextAmount: number | null;
  nextDate: string | null;
  nextLabel: string | null;
  accountId: string | null;
};

/** Registrar un pago: sale de una cuenta real, baja el saldo de la obligación y actualiza el flujo. */
export function PaymentForm({ initial, onDone }: { initial: PaymentInitial; onDone: () => void }) {
  const { accounts, today } = useAppData();
  const [state, action, pending] = useActionState(registerObligationPayment, initialState);
  useFormResult(state, onDone);
  const fe = state.fieldErrors ?? {};
  const payable = accounts.filter((a) => !isLoan(a.type) && a.type !== "investment");
  const [accountId, setAccountId] = useState(initial.accountId ?? payable.find((a) => a.type === "bank_savings" || a.type === "bank_checking")?.id ?? payable[0]?.id ?? "");
  const acc = accounts.find((a) => a.id === accountId);
  const cur = acc?.currency ?? initial.currency;
  const [amountKey, setAmountKey] = useState(0);
  const [amount, setAmount] = useState<number | null>(initial.nextAmount ?? initial.pending);

  const quick = [
    initial.nextAmount ? { label: initial.nextLabel ?? "Próxima cuota", value: initial.nextAmount } : null,
    initial.pending > 0 && initial.pending !== initial.nextAmount ? { label: "Saldo total", value: initial.pending } : null,
  ].filter(Boolean) as { label: string; value: number }[];

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="obligation_id" value={initial.obligationId} />

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-pastel-navy px-3.5 py-3">
          <p className="text-[11px] font-medium text-ink-2">Saldo pendiente</p>
          <p className="num mt-0.5 text-base font-semibold text-ink">{formatMoney(initial.pending, initial.currency)}</p>
        </div>
        <div className="rounded-xl bg-pastel-teal px-3.5 py-3">
          <p className="text-[11px] font-medium text-ink-2">{initial.nextLabel ?? "Próxima cuota"}</p>
          <p className="num mt-0.5 text-base font-semibold text-ink">
            {initial.nextAmount ? formatMoney(initial.nextAmount, initial.currency) : "—"}
          </p>
          {initial.nextDate && <p className="text-[11px] text-ink-2/80">Vence {formatMedium(initial.nextDate)}</p>}
        </div>
      </div>

      <Field label="Valor pagado" htmlFor="amount" error={fe.amount}>
        <AmountInput key={amountKey} id="amount" name="amount" large autoFocus defaultValue={amount} decimals={cur !== "COP"} prefix={cur === "COP" ? "$" : cur} />
      </Field>
      {quick.length > 0 && (
        <div className="-mt-2 flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q.label}
              type="button"
              onClick={() => {
                setAmount(q.value);
                setAmountKey((k) => k + 1);
              }}
              className="rounded-full bg-tint px-3 py-1 text-xs font-semibold text-teal-700 hover:bg-pastel-teal"
            >
              {q.label}: {formatMoney(q.value, initial.currency)}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="¿Desde qué cuenta pagaste?" htmlFor="account_id" error={fe.account_id}>
          <AccountSelect id="account_id" name="account_id" accounts={payable} value={accountId} onChange={setAccountId} />
        </Field>
        <Field label="Fecha del pago" htmlFor="date" error={fe.date}>
          <Input id="date" name="date" type="date" required max={today} defaultValue={today} />
        </Field>
      </div>
      {acc && acc.currency !== initial.currency && (
        <p className="-mt-2 text-xs text-muted">La cuenta está en {acc.currency}; el pago se convierte a {initial.currency} con tu tasa de cambio.</p>
      )}

      <Field label="Notas (opcional)" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} maxLength={500} placeholder="Comprobante, referencia…" />
      </Field>

      <p className="rounded-xl bg-tint-2 px-3 py-2 text-xs text-ink-2">
        Se registra como gasto de {initial.label}: baja el saldo de tu cuenta, reduce lo que debes y marca la cuota en tu flujo de caja.
      </p>

      {state.error && <p className="text-sm font-medium text-negative">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Registrar pago
      </Button>
    </form>
  );
}
