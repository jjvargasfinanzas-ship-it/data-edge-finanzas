"use client";

import { useActionState, useMemo, useState } from "react";
import { saveObligation } from "@/app/actions/obligations";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Field, Input, Segmented, Select, Textarea } from "@/components/ui/field";
import { isLoan } from "@/lib/constants";
import { CURRENCIES, formatMoney, parseAmountInput, type Currency } from "@/lib/money";
import { FREQUENCY_LABELS, type Frequency } from "@/lib/recurrence";
import { OBLIGATION_KIND_LABELS, installmentAmounts, installmentDates, type ObligationKind } from "@/lib/obligations";
import { formatMedium } from "@/lib/dates";
import { AmountInput } from "./amount-input";
import { useFormResult } from "./use-form-result";
import { useAppData } from "../app-data";

export type ObligationInitial = Partial<{
  id: string;
  creditor: string;
  creditor_type: "person" | "entity";
  kind: ObligationKind;
  concept: string;
  currency: Currency;
  original_amount: number;
  installment_amount: number | null;
  installments: number;
  frequency: Frequency;
  first_due_date: string;
  interest_rate: number | null;
  account_id: string | null;
  notes: string | null;
}>;

const FREQS: Frequency[] = ["monthly", "once", "biweekly", "semimonthly", "weekly", "bimonthly", "quarterly", "semiannual", "yearly"];

export function ObligationForm({ initial, onDone }: { initial: ObligationInitial; onDone: () => void }) {
  const { accounts, today } = useAppData();
  const [state, action, pending] = useActionState(saveObligation, initialState);
  useFormResult(state, onDone);
  const fe = state.fieldErrors ?? {};

  const payFrom = accounts.filter((a) => (!a.is_archived || a.id === initial.account_id) && !isLoan(a.type) && a.type !== "investment");
  const [creditorType, setCreditorType] = useState<"person" | "entity">(initial.creditor_type ?? "entity");
  const [currency, setCurrency] = useState<Currency>(initial.currency ?? "COP");
  const [frequency, setFrequency] = useState<Frequency>(initial.frequency ?? "monthly");
  const [installments, setInstallments] = useState(String(initial.installments ?? 1));
  const [original, setOriginal] = useState("");
  const [cuota, setCuota] = useState("");
  const [firstDue, setFirstDue] = useState(initial.first_due_date ?? today);
  const [accountId, setAccountId] = useState(initial.account_id ?? "");
  const once = frequency === "once";
  const prefix = currency === "COP" ? "$" : currency;
  const decimals = currency !== "COP";

  // Vista previa del plan de pagos
  const preview = useMemo(() => {
    const orig = original ? parseAmountInput(original) : (initial.original_amount ?? 0);
    const inst = cuota ? parseAmountInput(cuota) : cuota === "" && initial.installment_amount ? initial.installment_amount : null;
    const n = once ? 1 : Math.max(1, Math.min(600, Number(installments) || 1));
    if (!orig || !firstDue) return null;
    const v = { original_amount: orig, installment_amount: inst, installments: n, frequency, currency, first_due_date: firstDue };
    const amounts = installmentAmounts(v);
    const dates = installmentDates(v);
    return { each: amounts[0], total: amounts.reduce((s, a) => s + a, 0), last: dates[dates.length - 1], n, interest: inst ? amounts.reduce((s, a) => s + a, 0) - orig : 0 };
  }, [original, cuota, installments, frequency, currency, firstDue, once, initial.original_amount, initial.installment_amount]);

  return (
    <form action={action} className="space-y-4">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}

      <Segmented
        name="creditor_type"
        value={creditorType}
        onChange={setCreditorType}
        options={[
          { value: "entity", label: "Entidad" },
          { value: "person", label: "Persona" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={creditorType === "person" ? "¿A quién le debes?" : "Entidad acreedora"} htmlFor="creditor" error={fe.creditor}>
          <Input id="creditor" name="creditor" required maxLength={80} defaultValue={initial.creditor} placeholder={creditorType === "person" ? "Ej. Carlos Pérez" : "Ej. Bancolombia, DIAN"} />
        </Field>
        <Field label="Tipo" htmlFor="kind">
          <Select id="kind" name="kind" defaultValue={initial.kind ?? (creditorType === "person" ? "personal" : "bank_loan")}>
            {(Object.keys(OBLIGATION_KIND_LABELS) as ObligationKind[]).map((k) => (
              <option key={k} value={k}>
                {OBLIGATION_KIND_LABELS[k]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Concepto" htmlFor="concept" error={fe.concept}>
        <Input id="concept" name="concept" required maxLength={120} defaultValue={initial.concept} placeholder="Ej. Crédito libre inversión, Predial 2026" />
      </Field>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Valor original de la deuda" htmlFor="original_amount" error={fe.original_amount}>
          <AmountInput id="original_amount" name="original_amount" defaultValue={initial.original_amount} decimals={decimals} prefix={prefix} onValueChange={setOriginal} />
        </Field>
        <Field label="Moneda" htmlFor="currency">
          <Select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value as Currency)} className="w-24">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Periodicidad" htmlFor="frequency">
          <Select id="frequency" name="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
            {FREQS.map((f) => (
              <option key={f} value={f}>
                {f === "once" ? "Pago único" : FREQUENCY_LABELS[f]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={once ? "Fecha de vencimiento" : "Primera cuota"} htmlFor="first_due_date" error={fe.first_due_date}>
          <Input id="first_due_date" name="first_due_date" type="date" required value={firstDue} onChange={(e) => setFirstDue(e.target.value)} />
        </Field>
      </div>

      {!once && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Número de cuotas" htmlFor="installments" error={fe.installments}>
            <Input id="installments" name="installments" type="number" min={1} max={600} required value={installments} onChange={(e) => setInstallments(e.target.value)} />
          </Field>
          <Field label="Valor de la cuota (opcional)" htmlFor="installment_amount" error={fe.installment_amount} hint="Si incluye intereses. Vacío = valor ÷ cuotas.">
            <AmountInput id="installment_amount" name="installment_amount" defaultValue={initial.installment_amount} decimals={decimals} prefix={prefix} onValueChange={setCuota} />
          </Field>
        </div>
      )}
      {once && <input type="hidden" name="installments" value="1" />}

      {preview && (
        <div className="rounded-xl bg-pastel-teal px-3.5 py-3 text-xs text-ink-2">
          {preview.n > 1 ? (
            <>
              <span className="font-semibold text-ink">
                {preview.n} cuotas de {formatMoney(preview.each, currency)}
              </span>{" "}
              · total a pagar <span className="num font-semibold text-ink">{formatMoney(preview.total, currency)}</span>
              {preview.interest > 0.5 && <> (incluye {formatMoney(preview.interest, currency)} de intereses)</>} · última cuota el {formatMedium(preview.last)}
            </>
          ) : (
            <>
              Un pago de <span className="num font-semibold text-ink">{formatMoney(preview.total, currency)}</span> el {formatMedium(preview.last)}
            </>
          )}
        </div>
      )}

      <Field
        label="Cuenta desde la que pagas (opcional)"
        htmlFor="account_id"
        error={fe.account_id}
        hint={accountId ? "Las cuotas aparecerán en tu flujo de caja y calendario." : "Sin cuenta, la obligación no entra al flujo proyectado."}
      >
        <Select id="account_id" name="account_id" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
          <option value="">Sin cuenta de pago</option>
          {payFrom.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.currency !== "COP" ? ` · ${a.currency}` : ""}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
        <Field label="Tasa (opcional)" htmlFor="interest_rate" hint="% efectivo anual">
          <Input id="interest_rate" name="interest_rate" inputMode="decimal" defaultValue={initial.interest_rate ?? ""} placeholder="Ej. 24,5" />
        </Field>
        <Field label="Notas (opcional)" htmlFor="notes">
          <Textarea id="notes" name="notes" rows={2} maxLength={500} defaultValue={initial.notes ?? ""} placeholder="Número de crédito, acuerdo, contacto…" />
        </Field>
      </div>

      {state.error && <p className="text-sm font-medium text-negative">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {initial.id ? "Guardar cambios" : "Crear obligación"}
      </Button>
    </form>
  );
}
