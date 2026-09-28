"use client";

import { useActionState, useState } from "react";
import { Banknote, Landmark, Smartphone } from "lucide-react";
import { registerCashAdvance } from "@/app/actions/finance";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { formatMoney } from "@/lib/money";
import { AmountInput } from "./amount-input";
import { useFormResult } from "./use-form-result";
import { useAppData } from "../app-data";

export type AdvanceInitial = { cardId?: string };

const DEST = [
  { key: "bank", label: "Cuenta bancaria", icon: Landmark, types: ["bank_savings", "bank_checking"] },
  { key: "wallet", label: "Billetera", icon: Smartphone, types: ["digital_wallet"] },
  { key: "cash", label: "Efectivo", icon: Banknote, types: ["cash"] },
] as const;
type DestKey = (typeof DEST)[number]["key"];

/** Avance de tarjeta: aumenta la deuda de la tarjeta y entra a una cuenta, billetera o efectivo. */
export function AdvanceForm({ initial, onDone }: { initial: AdvanceInitial; onDone: () => void }) {
  const { accounts, today } = useAppData();
  const [state, action, pending] = useActionState(registerCashAdvance, initialState);
  useFormResult(state, onDone);
  const fe = state.fieldErrors ?? {};

  const cards = accounts.filter((a) => a.type === "credit_card" && !a.is_archived);
  const [cardId, setCardId] = useState(initial.cardId ?? cards[0]?.id ?? "");
  const card = accounts.find((a) => a.id === cardId);
  const cur = card?.currency ?? "COP";
  const used = card ? Math.max(0, -card.balance) : 0;
  const available = card?.credit_limit ? Math.max(0, card.credit_limit - used) : null;
  const pool = (k: DestKey) => accounts.filter((a) => !a.is_archived && a.currency === cur && (DEST.find((d) => d.key === k)!.types as readonly string[]).includes(a.type));

  const firstKind: DestKey = pool("bank").length ? "bank" : pool("wallet").length ? "wallet" : "cash";
  const [destKind, setDestKind] = useState<DestKey>(firstKind);
  const options = pool(destKind);
  const [toId, setToId] = useState(options[0]?.id ?? (destKind === "cash" ? "new-cash" : ""));
  const pick = (k: DestKey) => {
    setDestKind(k);
    const list = pool(k);
    setToId(list[0]?.id ?? (k === "cash" ? "new-cash" : ""));
  };

  if (!card) return <p className="text-sm text-muted">No tienes tarjetas de crédito registradas. Créala en Tarjetas.</p>;

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="card_id" value={card.id} />
      {!initial.cardId && cards.length > 1 && (
        <Field label="Tarjeta" htmlFor="card">
          <Select id="card" value={cardId} onChange={(e) => setCardId(e.target.value)}>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-pastel-navy px-3.5 py-3">
          <p className="text-[11px] font-medium text-ink-2">Deuda actual</p>
          <p className="num mt-0.5 text-base font-semibold text-ink">{formatMoney(used, cur)}</p>
        </div>
        <div className="rounded-xl bg-pastel-teal px-3.5 py-3">
          <p className="text-[11px] font-medium text-ink-2">Cupo disponible</p>
          <p className="num mt-0.5 text-base font-semibold text-ink">{available === null ? "—" : formatMoney(available, cur)}</p>
        </div>
      </div>

      <Field label="Valor del avance" htmlFor="amount" error={fe.amount}>
        <AmountInput id="amount" name="amount" large autoFocus decimals={cur !== "COP"} prefix={cur === "COP" ? "$" : cur} />
      </Field>

      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-ink-2">¿A dónde llegó la plata?</p>
        <div role="radiogroup" className="grid grid-cols-3 gap-2">
          {DEST.map((d) => {
            const active = d.key === destKind;
            return (
              <button
                key={d.key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => pick(d.key)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-semibold transition-colors",
                  active ? "border-transparent bg-pastel-teal text-teal-700" : "border-card-border bg-card text-ink-2 hover:bg-tint",
                )}
              >
                <d.icon className="size-4" />
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <Field
        label={destKind === "cash" ? "Efectivo" : destKind === "wallet" ? "Billetera" : "Cuenta"}
        htmlFor="to_account_id"
        error={fe.to_account_id}
        hint={toId === "new-cash" ? "Se creará tu cuenta de Efectivo con este retiro." : !options.length ? `No tienes ${destKind === "wallet" ? "billeteras" : "cuentas bancarias"} en ${cur}. Créala en Cuentas.` : undefined}
      >
        <Select id="to_account_id" name="to_account_id" value={toId} onChange={(e) => setToId(e.target.value)} required>
          {!options.length && destKind !== "cash" && <option value="">Sin opciones</option>}
          {options.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
          {destKind === "cash" && !options.length && <option value="new-cash">Efectivo (nueva)</option>}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha" htmlFor="date" error={fe.date}>
          <Input id="date" name="date" type="date" required max={today} defaultValue={today} />
        </Field>
        <Field label="Comisión del banco (opcional)" htmlFor="fee" error={fe.fee} hint="Se registra como gasto de la tarjeta.">
          <AmountInput id="fee" name="fee" decimals={cur !== "COP"} prefix={cur === "COP" ? "$" : cur} />
        </Field>
      </div>

      <Field label="Notas (opcional)" htmlFor="notes">
        <Textarea id="notes" name="notes" rows={2} maxLength={500} placeholder="Cajero, número de cuotas pactadas…" />
      </Field>

      <p className="rounded-xl bg-tint-2 px-3 py-2 text-xs text-ink-2">
        No es un ingreso: la plata entra a tu cuenta pero aumenta lo que debes en {card.name}. Se paga con el pago normal de la tarjeta.
      </p>

      {state.error && <p className="text-sm font-medium text-negative">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" loading={pending} disabled={!toId}>
        Registrar avance
      </Button>
    </form>
  );
}
