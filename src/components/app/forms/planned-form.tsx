"use client";

import { useActionState, useState } from "react";
import { savePlanned } from "@/app/actions/finance";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/field";
import { FREQUENCY_LABELS, type Frequency } from "@/lib/recurrence";
import { AccountSelect } from "./account-select";
import { AmountInput } from "./amount-input";
import { CategoryPicker } from "./category-picker";
import { useFormResult } from "./use-form-result";
import { useAppData } from "../app-data";

export type PlannedInitial = Partial<{
  id: string;
  kind: "income" | "expense" | "transfer";
  name: string;
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
}>;

export function PlannedForm({ initial, onDone }: { initial: PlannedInitial; onDone: () => void }) {
  const { accounts, categories, today } = useAppData();
  const [state, action, pending] = useActionState(savePlanned, initialState);
  useFormResult(state, onDone);
  const [kind, setKind] = useState(initial.kind ?? "expense");
  const [accountId, setAccountId] = useState(
    initial.account_id ?? accounts.find((a) => !a.is_archived && a.type !== "credit_card")?.id ?? "",
  );
  const [toAccountId, setToAccountId] = useState(initial.to_account_id ?? "");
  const [categoryId, setCategoryId] = useState(initial.category_id ?? "");
  const [frequency, setFrequency] = useState<Frequency>(initial.frequency ?? "monthly");
  const fe = state.fieldErrors ?? {};
  const from = accounts.find((a) => a.id === accountId);

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      <input type="hidden" name="is_active" value={initial.is_active === false ? "off" : "on"} />
      <Segmented
        name="kind"
        value={kind}
        onChange={(k) => {
          setKind(k);
          setCategoryId("");
        }}
        options={[
          { value: "expense", label: "Gasto o pago", tone: "out" },
          { value: "income", label: "Ingreso", tone: "in" },
          { value: "transfer", label: "Transferencia" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
        <Field label="Nombre" htmlFor="name" error={fe.name}>
          <Input
            id="name"
            name="name"
            required
            maxLength={80}
            defaultValue={initial.name ?? ""}
            data-autofocus=""
            placeholder={kind === "income" ? "Ej. Salario" : kind === "transfer" ? "Ej. Pago tarjeta Visa" : "Ej. Arriendo"}
          />
        </Field>
        <Field label="Monto" htmlFor="amount" error={fe.amount}>
          <AmountInput id="amount" name="amount" defaultValue={initial.amount} decimals={!!from && from.currency !== "COP"} invalid={!!fe.amount} />
        </Field>
      </div>

      <div className={cn("grid gap-4", kind === "transfer" && "sm:grid-cols-2")}>
        <Field
          label={kind === "income" ? "Cuenta donde entra" : kind === "transfer" ? "Desde" : "Cuenta o tarjeta con que se paga"}
          htmlFor="account_id"
          error={fe.account_id}
        >
          <AccountSelect id="account_id" name="account_id" accounts={accounts} value={accountId} onChange={setAccountId} />
        </Field>
        {kind === "transfer" && (
          <Field label="Hacia" htmlFor="to_account_id" error={fe.to_account_id}>
            <AccountSelect
              id="to_account_id"
              name="to_account_id"
              accounts={accounts}
              value={toAccountId}
              onChange={setToAccountId}
              exclude={accountId}
            />
          </Field>
        )}
      </div>

      {kind !== "transfer" && (
        <Field label="Categoría">
          <CategoryPicker categories={categories} kind={kind} value={categoryId} onChange={setCategoryId} />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Frecuencia" htmlFor="frequency">
          <Select id="frequency" name="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            {Object.entries(FREQUENCY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={frequency === "once" ? "Fecha" : "Primera fecha"}
          htmlFor="start_date"
          error={fe.start_date}
          hint={frequency === "semimonthly" ? "Se repite el 15 y el último día." : undefined}
        >
          <Input id="start_date" name="start_date" type="date" required defaultValue={initial.start_date ?? today} />
        </Field>
        {frequency !== "once" && (
          <Field label="Hasta (opcional)" htmlFor="end_date" error={fe.end_date}>
            <Input id="end_date" name="end_date" type="date" defaultValue={initial.end_date ?? ""} />
          </Field>
        )}
      </div>

      <Field label="Notas" htmlFor="notes">
        <Textarea id="notes" name="notes" maxLength={500} defaultValue={initial.notes ?? ""} />
      </Field>

      {state.error && state.fieldErrors && <p className="text-sm font-medium text-negative">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {initial.id ? "Guardar cambios" : "Crear programado"}
      </Button>
    </form>
  );
}
