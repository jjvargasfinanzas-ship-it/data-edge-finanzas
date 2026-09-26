"use client";

import { ArrowLeftRight, CalendarClock, ChevronRight } from "lucide-react";
import { useAppData } from "@/components/app/app-data";
import { cn } from "@/components/ui/cn";
import { CategoryIcon } from "@/components/ui/icons";
import { formatMedium } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";

export interface AccountMove {
  id: string;
  title: string;
  subtitle: string;
  effect: number;
  after: number;
  icon: string | null;
  color: string | null;
  isTransfer: boolean;
  fromPlanned: boolean;
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
    planned_item_id: string | null;
    planned_date: string | null;
  };
}

/** Movimientos de la cuenta; tocar uno lo abre para corregirlo o eliminarlo. */
export function AccountMoves({ moves, currency }: { moves: AccountMove[]; currency: Currency }) {
  const { openTransaction } = useAppData();
  return (
    <ul className="divide-y divide-line">
      {moves.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            onClick={() => openTransaction({ ...m.tx })}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-canvas sm:px-5"
            aria-label={`Corregir ${m.title}`}
          >
            {m.isTransfer ? (
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-navy-900/5 text-navy-700">
                <ArrowLeftRight className="size-4" />
              </span>
            ) : (
              <CategoryIcon icon={m.icon} color={m.color} size="sm" />
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <span className="truncate">{m.title}</span>
                {m.fromPlanned && <CalendarClock className="size-3.5 shrink-0 text-teal-600" aria-label="Confirmado desde un programado" />}
              </span>
              <span className="block truncate text-xs text-muted">
                {formatMedium(m.tx.date)}
                {m.subtitle ? ` · ${m.subtitle}` : ""}
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className={cn("num block text-sm font-semibold whitespace-nowrap", m.effect > 0 ? "text-positive" : "text-ink")}>
                {formatMoney(m.effect, currency, { signed: true })}
              </span>
              <span className="num block text-[11px] whitespace-nowrap text-muted">Saldo {formatMoney(m.after, currency)}</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
