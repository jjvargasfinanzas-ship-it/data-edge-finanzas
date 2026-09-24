"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { deleteRate, saveRate } from "@/app/actions/finance";
import { initialState } from "@/app/actions/types";
import { AmountInput } from "@/components/app/forms/amount-input";
import { useFormResult } from "@/components/app/forms/use-form-result";
import { Badge } from "@/components/ui/misc";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Field, Input, Select } from "@/components/ui/field";
import { formatMedium } from "@/lib/dates";
import { formatMoney } from "@/lib/money";

interface Rate {
  id: string;
  base: string;
  rate: number;
  rate_date: string;
  source: string;
  user_id: string | null;
}

export function RatesManager({ rates, today }: { rates: Rate[]; today: string }) {
  const [state, action, pending] = useActionState(saveRate, initialState);
  useFormResult(state);
  const latest = new Map<string, Rate>();
  for (const r of rates) {
    const cur = latest.get(r.base);
    if (!cur || r.rate_date > cur.rate_date || (r.rate_date === cur.rate_date && r.user_id && !cur.user_id)) latest.set(r.base, r);
  }
  const manual = rates.filter((r) => r.user_id);

  return (
    <div className="space-y-5">
      <ul className="grid grid-cols-2 gap-2">
        {["USD", "EUR", "MXN", "GBP"].map((c) => {
          const r = latest.get(c);
          return (
            <li key={c} className="rounded-xl bg-canvas px-3 py-2.5">
              <p className="flex items-center justify-between text-xs font-bold text-muted">
                1 {c} {r?.user_id && <Badge tone="brand">Manual</Badge>}
              </p>
              <p className="num text-[15px] font-bold text-ink">{r ? formatMoney(r.rate, "COP") : "Sin tasa"}</p>
              {r && <p className="text-[11px] text-muted">{formatMedium(r.rate_date)}</p>}
            </li>
          );
        })}
      </ul>
      <form action={action} className="grid grid-cols-[90px_1fr] gap-3 sm:grid-cols-[90px_1fr_150px_auto] sm:items-end">
        <Field label="Moneda" htmlFor="base">
          <Select id="base" name="base" defaultValue="USD">
            <option>USD</option>
            <option>EUR</option>
            <option>MXN</option>
            <option>GBP</option>
          </Select>
        </Field>
        <Field label="Valor en COP" htmlFor="rate" error={state.fieldErrors?.rate}>
          <AmountInput id="rate" name="rate" decimals />
        </Field>
        <Field label="Fecha" htmlFor="rate_date">
          <Input id="rate_date" name="rate_date" type="date" defaultValue={today} />
        </Field>
        <Button type="submit" variant="secondary" loading={pending} className="col-span-2 sm:col-span-1">
          Guardar
        </Button>
      </form>
      {manual.length > 0 && (
        <ul className="divide-y divide-line text-sm">
          {manual.map((r) => (
            <li key={r.id} className="flex items-center justify-between py-2">
              <span>
                {r.base} · <span className="num font-semibold">{formatMoney(r.rate, "COP")}</span> · {formatMedium(r.rate_date)}
              </span>
              <ConfirmButton action={() => deleteRate(r.id)} className="grid size-8 place-items-center rounded-lg text-muted hover:text-negative">
                <Trash2 className="size-4" aria-label="Eliminar tasa" />
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
