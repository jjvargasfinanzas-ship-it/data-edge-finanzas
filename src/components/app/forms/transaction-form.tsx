"use client";

import { useActionState, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { saveTransaction } from "@/app/actions/finance";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Segmented, Textarea } from "@/components/ui/field";
import { addDays } from "@/lib/dates";
import { AccountSelect } from "./account-select";
import { AmountInput } from "./amount-input";
import { CategoryPicker } from "./category-picker";
import { useFormResult } from "./use-form-result";
import { useAppData } from "../app-data";

export type TxInitial = Partial<{
  id: string;
  kind: "income" | "expense" | "transfer";
  amount: number;
  account_id: string;
  to_account_id: string | null;
  to_amount: number | null;
  category_id: string | null;
  date: string;
  description: string | null;
  notes: string | null;
  planned_item_id: string | null;
  planned_date: string | null;
}>;

const LAST_ACCOUNT_KEY = "de:last-account";

export function TransactionForm({ initial, onDone }: { initial: TxInitial; onDone: () => void }) {
  const { accounts, categories, today } = useAppData();
  const [state, action, pending] = useActionState(saveTransaction, initialState);
  useFormResult(state, onDone);

  const [kind, setKind] = useState(initial.kind ?? "expense");
  const [accountId, setAccountId] = useState(initial.account_id ?? "");
  const [toAccountId, setToAccountId] = useState(initial.to_account_id ?? "");
  const [categoryId, setCategoryId] = useState(initial.category_id ?? "");
  const [date, setDate] = useState(initial.date ?? today);
  const [more, setMore] = useState(!!initial.notes);
  const fe = state.fieldErrors ?? {};

  useEffect(() => {
    if (accountId) return;
    try {
      const last = localStorage.getItem(LAST_ACCOUNT_KEY);
      const fallback = accounts.find((a) => !a.is_archived && a.type !== "credit_card") ?? accounts[0];
      const pick = accounts.find((a) => a.id === last && !a.is_archived) ?? fallback;
      if (pick) setAccountId(pick.id);
    } catch {
      /* sin almacenamiento local */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.ok && accountId) {
      try {
        localStorage.setItem(LAST_ACCOUNT_KEY, accountId);
      } catch {}
    }
  }, [state, accountId]);

  const from = accounts.find((a) => a.id === accountId);
  const to = accounts.find((a) => a.id === toAccountId);
  const crossCurrency = kind === "transfer" && from && to && from.currency !== to.currency;
  const decimals = !!from && from.currency !== "COP";

  return (
    <form action={action} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {initial.planned_item_id && <input type="hidden" name="planned_item_id" value={initial.planned_item_id} />}
      {initial.planned_date && <input type="hidden" name="planned_date" value={initial.planned_date} />}

      <Segmented
        name="kind"
        value={kind}
        onChange={(k) => {
          setKind(k);
          setCategoryId("");
        }}
        options={[
          { value: "expense", label: "Gasto", tone: "out" },
          { value: "income", label: "Ingreso", tone: "in" },
          { value: "transfer", label: "Transferencia" },
        ]}
      />

      <Field label="Monto" htmlFor="amount" error={fe.amount}>
        <AmountInput
          id="amount"
          name="amount"
          large
          autoFocus
          decimals={decimals}
          defaultValue={initial.amount}
          prefix={from?.currency && from.currency !== "COP" ? from.currency : "$"}
          invalid={!!fe.amount}
        />
      </Field>

      <div className={cn("grid gap-4", kind === "transfer" && "sm:grid-cols-2")}>
        <Field
          label={kind === "income" ? "¿A qué cuenta entra?" : kind === "transfer" ? "Desde" : "¿Con qué pagaste?"}
          htmlFor="account_id"
          error={fe.account_id}
        >
          <AccountSelect id="account_id" name="account_id" accounts={accounts} value={accountId} onChange={setAccountId} />
        </Field>
        {kind === "transfer" && (
          <Field label="Hacia" htmlFor="to_account_id" error={fe.to_account_id} hint="Para pagar una tarjeta, elígela aquí.">
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

      {crossCurrency && (
        <Field label={`Monto recibido en ${to!.currency}`} htmlFor="to_amount" error={fe.to_amount}>
          <AmountInput id="to_amount" name="to_amount" decimals={to!.currency !== "COP"} prefix={to!.currency} defaultValue={initial.to_amount} />
        </Field>
      )}

      {kind !== "transfer" && (
        <Field label="Categoría" error={fe.category_id}>
          <CategoryPicker categories={categories} kind={kind} value={categoryId} onChange={setCategoryId} />
        </Field>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha" htmlFor="date" error={fe.date}>
          <div className="flex gap-2">
            <Input id="date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="flex-1" />
          </div>
          <div className="flex gap-1.5">
            {[
              { l: "Hoy", d: today },
              { l: "Ayer", d: addDays(today, -1) },
            ].map((o) => (
              <button
                key={o.l}
                type="button"
                onClick={() => setDate(o.d)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  date === o.d ? "bg-navy-900 text-white" : "bg-canvas text-ink-2 hover:bg-line",
                )}
              >
                {o.l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Descripción" htmlFor="description" error={fe.description}>
          <Input id="description" name="description" maxLength={140} defaultValue={initial.description ?? ""} placeholder="Ej. Mercado del mes" />
        </Field>
      </div>

      <div>
        <button
          type="button"
          onClick={() => setMore((m) => !m)}
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-ink"
        >
          <ChevronDown className={cn("size-4 transition-transform", more && "rotate-180")} /> Notas
        </button>
        {more && <Textarea name="notes" className="mt-2" maxLength={500} defaultValue={initial.notes ?? ""} />}
      </div>

      {state.error && state.fieldErrors && <p className="text-sm font-medium text-negative">{state.error}</p>}

      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {initial.id ? "Guardar cambios" : "Registrar"}
      </Button>
    </form>
  );
}
