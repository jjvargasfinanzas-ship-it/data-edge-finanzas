"use client";

import { useActionState, useState } from "react";
import { saveAccount } from "@/app/actions/finance";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Select } from "@/components/ui/field";
import { AccountIcon } from "@/components/ui/icons";
import { ACCOUNT_TYPE_LABELS, isLoan, type AccountType } from "@/lib/constants";
import { CURRENCIES, CURRENCY_LABELS } from "@/lib/money";
import { AmountInput } from "./amount-input";
import { useFormResult } from "./use-form-result";
import { useAppData } from "../app-data";

export type AccountInitial = Partial<{
  id: string;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: string;
  opening_balance: number;
  opening_date: string;
  include_in_net_worth: boolean;
  credit_limit: number | null;
  statement_day: number | null;
  due_day: number | null;
}>;

const TYPES: AccountType[] = ["bank_savings", "bank_checking", "digital_wallet", "cash", "investment", "credit_card", "other"];

export function AccountForm({ initial, onDone }: { initial: AccountInitial; onDone: () => void }) {
  const { today } = useAppData();
  const [state, action, pending] = useActionState(saveAccount, initialState);
  useFormResult(state, onDone);
  const [type, setType] = useState<AccountType>(initial.type ?? "bank_savings");
  const [currency, setCurrency] = useState(initial.currency ?? "COP");
  const [negative, setNegative] = useState((initial.opening_balance ?? 0) < 0 && initial.type !== "credit_card");
  const isCard = type === "credit_card";
  const loan = isLoan(type);
  const debt = isCard || type === "loan_payable";
  const fe = state.fieldErrors ?? {};
  const decimals = currency !== "COP";

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="balance_sign" value={negative ? "negative" : "positive"} />

      {loan ? (
        <p className="flex items-center gap-2 rounded-xl bg-canvas p-2 text-sm font-semibold text-ink">
          <AccountIcon type={type} className="size-8" /> {ACCOUNT_TYPE_LABELS[type]}
        </p>
      ) : (
      <Field label="Tipo">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              aria-pressed={type === t}
              className={cn(
                "flex items-center gap-2 rounded-xl border p-2 text-left text-xs font-semibold transition-all",
                type === t ? "border-teal-500 bg-teal-50 text-ink ring-2 ring-teal-500/20" : "border-line text-ink-2 hover:bg-canvas",
              )}
            >
              <AccountIcon type={t} className="size-8" />
              <span className="leading-tight">{ACCOUNT_TYPE_LABELS[t]}</span>
            </button>
          ))}
        </div>
      </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre" htmlFor="name" error={fe.name}>
          <Input
            id="name"
            name="name"
            required
            maxLength={80}
            defaultValue={initial.name ?? ""}
            placeholder={isCard ? "Ej. Visa Bancolombia" : "Ej. Ahorros Bancolombia"}
          />
        </Field>
        <Field label={loan ? "Persona o entidad" : "Entidad (opcional)"} htmlFor="institution">
          <Input id="institution" name="institution" maxLength={80} defaultValue={initial.institution ?? ""} placeholder="Ej. Bancolombia" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
        <Field label="Moneda" htmlFor="currency">
          <Select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c} · {CURRENCY_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={loan ? (type === "loan_payable" ? "Deuda inicial" : "Saldo inicial por cobrar") : isCard ? "Deuda actual" : "Saldo actual"}
          htmlFor="opening_balance"
          error={fe.opening_balance}
          hint={
            loan
              ? "Normalmente 0: el valor prestado entra como transferencia. Úsalo solo para préstamos anteriores."
              : initial.id
                ? "Saldo a la fecha de apertura; los movimientos se suman aparte."
                : "Lo que tienes hoy en esta cuenta."
          }
        >
          <AmountInput
            id="opening_balance"
            name="opening_balance"
            decimals={decimals}
            prefix={currency === "COP" ? "$" : currency}
            defaultValue={initial.opening_balance !== undefined ? Math.abs(initial.opening_balance) : undefined}
          />
          {!debt && !loan && (
            <label className="flex items-center gap-2 text-xs text-ink-2">
              <input type="checkbox" checked={negative} onChange={(e) => setNegative(e.target.checked)} className="accent-teal-600" />
              El saldo es negativo (sobregiro)
            </label>
          )}
        </Field>
      </div>

      {isCard && (
        <div className="grid gap-4 rounded-2xl bg-canvas p-4 sm:grid-cols-3">
          <Field label="Cupo total" htmlFor="credit_limit" error={fe.credit_limit} className="sm:col-span-3">
            <AmountInput id="credit_limit" name="credit_limit" decimals={decimals} defaultValue={initial.credit_limit} />
          </Field>
          <Field label="Día de corte" htmlFor="statement_day" error={fe.statement_day}>
            <Input id="statement_day" name="statement_day" type="number" min={1} max={31} defaultValue={initial.statement_day ?? ""} />
          </Field>
          <Field label="Día límite de pago" htmlFor="due_day" error={fe.due_day} className="sm:col-span-2">
            <Input id="due_day" name="due_day" type="number" min={1} max={31} defaultValue={initial.due_day ?? ""} />
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha del saldo" htmlFor="opening_date" error={fe.opening_date}>
          <Input id="opening_date" name="opening_date" type="date" required defaultValue={initial.opening_date ?? today} />
        </Field>
        <label className="flex items-center gap-2 self-end pb-3 text-sm text-ink-2">
          <input
            type="checkbox"
            name="include_in_net_worth"
            value="on"
            defaultChecked={initial.include_in_net_worth ?? true}
            className="accent-teal-600"
          />
          Incluir en patrimonio
        </label>
      </div>

      {state.error && state.fieldErrors && <p className="text-sm font-medium text-negative">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {initial.id ? "Guardar cambios" : isCard ? "Crear tarjeta" : "Crear cuenta"}
      </Button>
    </form>
  );
}
