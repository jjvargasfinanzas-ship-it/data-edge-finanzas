"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, CreditCard } from "lucide-react";
import { setOccurrenceStatus } from "@/app/actions/finance";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import { diffDays, formatLong, formatShort, formatWeekdayShort } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";
import type { Occurrence } from "@/lib/cashflow";
import { useAppData } from "./app-data";

export type PendingItem = Pick<
  Occurrence,
  | "key" | "date" | "dueDate" | "overdue" | "state" | "name" | "plannedItemId" | "kind" | "flow" | "amount" | "plannedAmount"
  | "receivedAmount" | "currency" | "accountId" | "toAccountId" | "categoryId" | "cashEffect"
>;

const LIQUID = ["bank_savings", "bank_checking", "digital_wallet", "cash"];

function whenLabel(o: PendingItem, today: string) {
  const d = diffDays(o.dueDate, today);
  if (d < 0) return `Venció ${formatShort(o.dueDate)}`;
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  return `${formatWeekdayShort(o.dueDate)} ${formatShort(o.dueDate)}`;
}

function Row({ o, baseCurrency, showDate = true }: { o: PendingItem; baseCurrency: Currency; showDate?: boolean }) {
  const { accounts, today, openTransaction } = useAppData();
  const [busy, start] = useTransition();
  const [hidden, setHidden] = useState(false);
  const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "";
  const isIn = o.flow === "income";
  const isCard = o.flow === "card_estimate" || o.flow === "payment";
  const Icon = isCard ? CreditCard : o.flow === "transfer" ? ArrowLeftRight : isIn ? ArrowDownLeft : ArrowUpRight;

  const register = () => {
    if (o.flow === "card_estimate") {
      const from = accounts.find((a) => !a.is_archived && LIQUID.includes(a.type) && a.type !== "cash");
      openTransaction({ kind: "transfer", amount: o.amount, account_id: from?.id, to_account_id: o.toAccountId, description: o.name });
      return;
    }
    openTransaction({
      kind: o.kind,
      amount: o.amount,
      account_id: o.accountId,
      to_account_id: o.toAccountId,
      category_id: o.categoryId,
      description: o.name,
      date: today,
      planned_item_id: o.plannedItemId,
      planned_date: o.dueDate,
      planned_amount: o.plannedAmount,
      planned_received: o.receivedAmount,
    });
  };

  const setStatus = (status: "closed" | "skipped") =>
    start(async () => {
      const r = await setOccurrenceStatus(o.plannedItemId!, o.dueDate, status);
      if (r.ok) {
        setHidden(true);
        toast.success(r.message);
      } else toast.error(r.error);
    });

  if (hidden) return null;

  return (
    <li className={cn("flex items-start gap-3 py-3", busy && "opacity-50")}>
      <span
        className={cn(
          "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl",
          isIn ? "bg-teal-50 text-teal-700" : o.flow === "transfer" ? "bg-navy-900/5 text-navy-700" : "bg-series-out/10 text-out-ink",
        )}
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-ink">
          <span className="truncate">{o.name}</span>
          {o.state === "overdue" && <Badge tone="warning">Vencido</Badge>}
          {o.state === "today" && <Badge tone="brand">Hoy</Badge>}
          {o.state === "partial" && <Badge tone="warning">Parcial</Badge>}
          {o.flow === "card_estimate" && <Badge>Estimado</Badge>}
        </p>
        <p className="truncate text-xs text-muted">
          {showDate && <span className={cn("font-semibold", (o.overdue || o.state === "today") && "text-ink-2")}>{whenLabel(o, today)} · </span>}
          {o.flow === "card_estimate" ? "Deuda actual de la tarjeta" : accName(o.accountId)}
          {o.toAccountId && o.flow !== "card_estimate" ? ` → ${accName(o.toAccountId)}` : ""}
        </p>
        {o.state === "partial" && (
          <p className="mt-0.5 text-xs text-ink-2">
            {isIn ? "Recibido" : "Pagado"} <span className="num font-semibold">{formatMoney(o.receivedAmount, o.currency)}</span> de{" "}
            <span className="num">{formatMoney(o.plannedAmount, o.currency)}</span>
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          <button type="button" onClick={register} disabled={busy} className="text-xs font-bold text-teal-700 hover:underline">
            {o.flow === "card_estimate" ? "Pagar tarjeta" : isIn ? (o.state === "partial" ? "Registrar otro abono" : "Marcar recibido") : o.flow === "transfer" ? "Registrar" : "Marcar pagado"}
          </button>
          {o.plannedItemId && o.state === "partial" && (
            <button type="button" onClick={() => setStatus("closed")} disabled={busy} className="text-xs font-semibold text-muted hover:text-ink">
              Dar por completo
            </button>
          )}
          {o.plannedItemId && o.state !== "partial" && (
            <button type="button" onClick={() => setStatus("skipped")} disabled={busy} className="text-xs font-semibold text-muted hover:text-ink">
              Omitir esta vez
            </button>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <span className={cn("num text-sm font-bold", isIn ? "text-positive" : "text-ink")}>
          {isIn ? "+" : o.cashEffect === 0 && o.flow === "transfer" ? "" : "−"}
          {formatMoney(o.amount, o.currency)}
        </span>
        {o.currency !== baseCurrency && o.cashEffect !== 0 && (
          <span className="num block text-[11px] text-muted">≈ {formatMoney(Math.abs(o.cashEffect), baseCurrency)}</span>
        )}
      </div>
    </li>
  );
}

/**
 * Lista de pendientes (programados sin registrar, parciales y pagos de tarjeta).
 * group="status" → Vencidos / Hoy / Próximos · group="date" → por día.
 */
export function PendingList({
  items,
  baseCurrency,
  group = "status",
  empty,
}: {
  items: PendingItem[];
  baseCurrency: Currency;
  group?: "status" | "date" | "none";
  empty?: React.ReactNode;
}) {
  const { today } = useAppData();
  if (!items.length) return <>{empty}</>;

  if (group === "none") {
    return (
      <ul className="divide-y divide-line">
        {items.map((o) => (
          <Row key={o.key} o={o} baseCurrency={baseCurrency} />
        ))}
      </ul>
    );
  }

  const groups: { title: string; tone?: string; items: PendingItem[] }[] = [];
  if (group === "status") {
    const overdue = items.filter((o) => o.dueDate < today);
    const now = items.filter((o) => o.dueDate === today);
    const next = items.filter((o) => o.dueDate > today);
    if (overdue.length) groups.push({ title: "Vencidos sin registrar", tone: "text-warning", items: overdue });
    if (now.length) groups.push({ title: "Hoy", items: now });
    if (next.length) groups.push({ title: "Próximos", items: next });
  } else {
    const map = new Map<string, PendingItem[]>();
    for (const o of items) {
      const k = o.dueDate < today ? "overdue" : o.dueDate;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    for (const [k, list] of map) {
      groups.push({ title: k === "overdue" ? "Vencidos sin registrar" : formatLong(k), tone: k === "overdue" ? "text-warning" : undefined, items: list });
    }
  }

  return (
    <div className="space-y-2">
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className={cn("pt-2 text-[11px] font-bold tracking-[0.12em] uppercase first-letter:uppercase", g.tone ?? "text-muted")}>{g.title}</h3>
          <ul className="divide-y divide-line">
            {g.items.map((o) => (
              <Row key={o.key} o={o} baseCurrency={baseCurrency} showDate={group === "status"} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
