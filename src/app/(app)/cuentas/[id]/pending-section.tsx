"use client";

import { useState } from "react";
import { PendingList, type PendingItem } from "@/components/app/pending-list";
import { Badge, Card } from "@/components/ui/misc";
import { formatMoney, type Currency } from "@/lib/money";

const VISIBLE = 5;

/** Pendientes de la cuenta (ingresos o gastos): muestra los primeros y despliega el resto. */
export function PendingSection({
  title,
  subtitle,
  items,
  currency,
  empty,
}: {
  title: string;
  subtitle: string;
  items: PendingItem[];
  currency: Currency;
  empty: string;
}) {
  const [all, setAll] = useState(false);
  const total = items.reduce((s, o) => s + o.amount, 0);
  const shown = all ? items : items.slice(0, VISIBLE);
  const hidden = items.length - shown.length;

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-ink">{title}</h2>
        {items.length > 0 ? (
          <span className="num text-sm font-semibold text-ink">{formatMoney(total, currency)}</span>
        ) : (
          <Badge tone="neutral">Al día</Badge>
        )}
      </div>
      <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
      <div className="mt-1">
        <PendingList items={shown} baseCurrency={currency} group="status" empty={<p className="py-3 text-sm text-muted">{empty}</p>} />
      </div>
      {(hidden > 0 || all) && items.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="mt-2 w-full rounded-xl py-2 text-xs font-semibold text-teal-700 hover:bg-canvas"
        >
          {all ? "Ver menos" : `Ver todos (${items.length})`}
        </button>
      )}
    </Card>
  );
}
