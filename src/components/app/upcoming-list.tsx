"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import { formatShort, formatWeekdayShort, diffDays } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";
import type { Occurrence } from "@/lib/cashflow";
import { useAppData } from "./app-data";

export type UpcomingItem = Pick<
  Occurrence,
  "key" | "date" | "dueDate" | "overdue" | "name" | "plannedItemId" | "kind" | "flow" | "amount" | "currency" | "accountId" | "toAccountId" | "categoryId" | "cashEffect"
>;

export function UpcomingList({ items, baseCurrency, empty }: { items: UpcomingItem[]; baseCurrency: Currency; empty?: React.ReactNode }) {
  const { accounts, today, openTransaction } = useAppData();
  const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "";

  if (!items.length) return <>{empty}</>;

  return (
    <ul className="divide-y divide-line">
      {items.map((o) => {
        const isIn = o.flow === "income";
        const Icon = o.flow === "card_estimate" || o.flow === "payment" ? CreditCard : o.flow === "transfer" ? ArrowLeftRight : isIn ? ArrowDownLeft : ArrowUpRight;
        const days = diffDays(o.dueDate, today);
        const when = o.overdue ? `Venció ${formatShort(o.dueDate)}` : days === 0 ? "Hoy" : days === 1 ? "Mañana" : `${formatWeekdayShort(o.dueDate)} ${formatShort(o.dueDate)}`;
        const register = () => {
          if (o.flow === "card_estimate") {
            const from = accounts.find((a) => !a.is_archived && ["bank_savings", "bank_checking", "digital_wallet"].includes(a.type));
            openTransaction({ kind: "transfer", amount: o.amount, account_id: from?.id, to_account_id: o.toAccountId, description: o.name.replace("Pago estimado", "Pago") });
          } else {
            openTransaction({
              kind: o.kind,
              amount: o.amount,
              account_id: o.accountId,
              to_account_id: o.toAccountId,
              category_id: o.categoryId,
              description: o.name,
              date: o.overdue ? today : o.dueDate <= today ? o.dueDate : today,
              planned_item_id: o.plannedItemId,
              planned_date: o.dueDate,
            });
          }
        };
        return (
          <li key={o.key} className="flex items-center gap-3 py-3">
            <span
              className={cn(
                "grid size-10 shrink-0 place-items-center rounded-xl",
                isIn ? "bg-teal-50 text-teal-700" : o.flow === "transfer" ? "bg-navy-900/5 text-navy-700" : "bg-[#e0694a]/10 text-[#b4482c]",
              )}
            >
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
                <span className="truncate">{o.name}</span>
                {o.overdue && <Badge tone="warning">Pendiente</Badge>}
                {o.flow === "card_estimate" && <Badge tone="neutral">Estimado</Badge>}
              </p>
              <p className="truncate text-xs text-muted">
                <span className={cn("font-semibold", (o.overdue || days <= 1) && "text-ink-2")}>{when}</span>
                {" · "}
                {o.flow === "card_estimate" ? "deuda actual de la tarjeta" : accName(o.accountId)}
                {o.toAccountId && o.flow !== "card_estimate" ? ` → ${accName(o.toAccountId)}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={cn("num text-sm font-bold", isIn ? "text-positive" : "text-ink")}>
                {isIn ? "+" : o.flow === "transfer" && o.cashEffect === 0 ? "" : "−"}
                {formatMoney(o.amount, o.currency)}
              </span>
              {o.currency !== baseCurrency && (
                <span className="num text-[11px] text-muted">≈ {formatMoney(Math.abs(o.cashEffect), baseCurrency)}</span>
              )}
              <button type="button" onClick={register} className="text-xs font-bold text-teal-700 hover:underline">
                {o.flow === "card_estimate" ? "Pagar" : "Registrar"}
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
