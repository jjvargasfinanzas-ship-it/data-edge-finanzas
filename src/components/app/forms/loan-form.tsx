"use client";

import { useActionState, useState } from "react";
import { createLoan } from "@/app/actions/finance";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/field";
import { isLoan } from "@/lib/constants";
import { CURRENCIES } from "@/lib/money";
import { AmountInput } from "./amount-input";
import { useFormResult } from "./use-form-result";
import { useAppData } from "../app-data";

export type LoanInitial = Partial<{ direction: "lent" | "borrowed" }>;

/** Registrar un préstamo: no es gasto ni ingreso, es plata que va a volver (o que debo devolver). */
export function LoanForm({ initial, onDone }: { initial: LoanInitial; onDone: () => void }) {
  const { accounts, today } = useAppData();
  const [state, action, pending] = useActionState(createLoan, initialState);
  useFormResult(state, onDone);
  const [direction, setDirection] = useState<"lent" | "borrowed">(initial.direction ?? "lent");
  const own = accounts.filter((a) => !a.is_archived && !isLoan(a.type) && a.type !== "credit_card");
  const [accountId, setAccountId] = useState((own.find((a) => a.type === "bank_savings" || a.type === "bank_checking") ?? own[0])?.id ?? "");
  const [currency, setCurrency] = useState("COP");
  const acc = own.find((a) => a.id === accountId);
  const cur = acc?.currency ?? currency;
  const lent = direction === "lent";
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      <Segmented
        name="direction"
        value={direction}
        onChange={setDirection}
        options={[
          { value: "lent", label: "Yo presté", tone: "out" },
          { value: "borrowed", label: "Me prestaron", tone: "in" },
        ]}
      />
      <p className="rounded-xl bg-canvas px-3 py-2 text-xs text-ink-2">
        {lent
          ? "No es un gasto: la plata sale de tu cuenta pero te la deben. Queda como cuenta por cobrar hasta que te paguen."
          : "No es un ingreso: la plata entra a tu cuenta pero la debes. Queda como deuda hasta que la pagues."}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={lent ? "¿A quién le prestaste?" : "¿Quién te prestó?"} htmlFor="person" error={fe.person}>
          <Input id="person" name="person" required maxLength={60} placeholder="Ej. Carlos Pérez" />
        </Field>
        <Field label="Valor" htmlFor="amount" error={fe.amount}>
          <AmountInput id="amount" name="amount" decimals={cur !== "COP"} prefix={cur === "COP" ? "$" : cur} />
        </Field>
      </div>

      <Field
        label={lent ? "¿De qué cuenta salió la plata?" : "¿A qué cuenta llegó la plata?"}
        htmlFor="account_id"
        error={fe.account_id}
        hint={!accountId ? "Úsalo para préstamos antiguos: no mueve el saldo de tus cuentas." : undefined}
      >
        <Select id="account_id" name="account_id" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          {own.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.currency !== "COP" ? ` · ${a.currency}` : ""}
            </option>
          ))}
          <option value="">{lent ? "No salió de mis cuentas (préstamo anterior)" : "No llegó a mis cuentas (préstamo anterior)"}</option>
        </Select>
      </Field>
      {!accountId && (
        <Field label="Moneda" htmlFor="currency">
          <Select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha del préstamo" htmlFor="date" error={fe.date}>
          <Input id="date" name="date" type="date" required max={today} defaultValue={today} />
        </Field>
        <Field
          label={lent ? "¿Cuándo te pagan? (opcional)" : "¿Cuándo pagas? (opcional)"}
          htmlFor="due_date"
          error={fe.due_date}
          hint={accountId ? "Queda en tu flujo proyectado para confirmarlo ese día." : undefined}
        >
          <Input id="due_date" name="due_date" type="date" min={today} />
        </Field>
      </div>

      <Field label="Notas (opcional)" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} maxLength={500} placeholder="Acuerdo, intereses, cuotas…" />
      </Field>

      {state.error && <p className="text-sm font-medium text-negative">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        Registrar préstamo
      </Button>
    </form>
  );
}
