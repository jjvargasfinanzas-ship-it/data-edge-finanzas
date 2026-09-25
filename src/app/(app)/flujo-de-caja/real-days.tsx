"use client";

import { ArrowLeftRight } from "lucide-react";
import { useAppData } from "@/components/app/app-data";
import { cn } from "@/components/ui/cn";
import { CategoryIcon } from "@/components/ui/icons";
import { formatLong } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";

export interface RealDayRow {
  date: string;
  closing: number;
  moves: {
    id: string;
    title: string;
    subtitle: string;
    effect: number;
    icon: string | null;
    color: string | null;
    isTransfer: boolean;
    tx: {
      id: string;
      kind: "income" | "expense" | "transfer";
      date: string;
      amount: number;
      account_id: string;
      to_account_id: string | null;
      to_amount: number | null;
      category_id: string | null;
      description: string | null;
      notes: string | null;
    };
  }[];
}

/** Días con movimientos reales; tocar un movimiento lo abre para corregirlo. */
export function RealDays({ days, currency, today }: { days: RealDayRow[]; currency: Currency; today: string }) {
  const { openTransaction } = useAppData();
  return (
    <ol className="divide-y divide-line">
      {days.map((d) => (
        <li key={d.date} className="px-4 py-3 sm:px-5">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <p className="text-xs font-bold tracking-wide text-muted uppercase">{d.date === today ? "Hoy" : formatLong(d.date)}</p>
            <p className={cn("num text-xs font-bold", d.closing < 0 ? "text-negative" : "text-ink-2")}>Saldo {formatMoney(d.closing, currency)}</p>
          </div>
          <ul>
            {d.moves.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => openTransaction({ ...m.tx })}
                  className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-canvas"
                >
                  {m.isTransfer ? (
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy-900/5 text-navy-700">
                      <ArrowLeftRight className="size-4" />
                    </span>
                  ) : (
                    <CategoryIcon icon={m.icon} color={m.color} size="sm" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{m.title}</span>
                    <span className="block truncate text-xs text-muted">{m.subtitle}</span>
                  </span>
                  <span className={cn("num shrink-0 text-sm font-bold", m.effect > 0 ? "text-positive" : m.effect < 0 ? "text-ink" : "text-muted")}>
                    {m.effect === 0 ? "Sin efecto" : formatMoney(m.effect, currency, { signed: true })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
