"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check, CreditCard, Pencil, Trash2, X } from "lucide-react";
import { confirmOccurrence, deletePlanned, setOccurrenceStatus } from "@/app/actions/finance";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import { ConfirmButton } from "@/components/ui/confirm-button";
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
  if (d < 0) return `Era para el ${formatShort(o.dueDate)}`;
  if (d === 0) return "Hoy";
  if (d === 1) return "Mañana";
  return `${formatWeekdayShort(o.dueDate)} ${formatShort(o.dueDate)}`;
}

const chip =
  "inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold transition-colors disabled:opacity-50";

function Row({ o, baseCurrency, showDate = true }: { o: PendingItem; baseCurrency: Currency; showDate?: boolean }) {
  const { accounts, planned, today, openTransaction, openPlanned } = useAppData();
  const [busy, start] = useTransition();
  const [hidden, setHidden] = useState(false);
  const accName = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? "";
  const isIn = o.flow === "income";
  const isCard = o.flow === "card_estimate" || o.flow === "payment";
  const Icon = isCard ? CreditCard : o.flow === "transfer" ? ArrowLeftRight : isIn ? ArrowDownLeft : ArrowUpRight;
  const due = o.dueDate <= today; // ya debió ocurrir → pedir confirmación
  const item = planned.find((p) => p.id === o.plannedItemId);

  const run = (fn: () => Promise<{ ok?: boolean; message?: string; error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setHidden(true);
        toast.success(r.message);
      } else toast.error(r.error ?? "No se pudo completar");
    });

  const otherValue = () => {
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
      date: o.dueDate <= today ? o.dueDate : today,
      planned_item_id: o.plannedItemId,
      planned_date: o.dueDate,
      planned_amount: o.plannedAmount,
      planned_received: o.receivedAmount,
    });
  };

  if (hidden) return null;

  return (
    <li className={cn("py-3", busy && "pointer-events-none opacity-50")}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "grid size-9 shrink-0 place-items-center rounded-xl",
            isIn ? "bg-teal-50 text-teal-700" : o.flow === "transfer" ? "bg-navy-900/5 text-navy-700" : "bg-series-out/10 text-out-ink",
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 text-sm leading-tight font-semibold text-ink">
              <span className="break-words">{o.name}</span>
              {o.state === "partial" && <Badge tone="warning" className="ml-1.5 align-middle">Parcial</Badge>}
              {o.flow === "card_estimate" && <Badge className="ml-1.5 align-middle">Estimado</Badge>}
            </p>
            <span className={cn("num shrink-0 text-sm font-semibold", isIn ? "text-positive" : "text-ink")}>
              {isIn ? "+" : o.cashEffect === 0 && o.flow === "transfer" ? "" : "−"}
              {formatMoney(o.amount, o.currency)}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-muted">
            {showDate && <span className={cn("font-semibold", o.overdue ? "text-warning" : o.state === "today" && "text-ink-2")}>{whenLabel(o, today)} · </span>}
            {o.flow === "card_estimate" ? "Deuda actual de la tarjeta" : accName(o.accountId)}
            {o.toAccountId && o.flow !== "card_estimate" ? ` → ${accName(o.toAccountId)}` : ""}
            {o.currency !== baseCurrency && o.cashEffect !== 0 && <> · ≈ {formatMoney(Math.abs(o.cashEffect), baseCurrency)}</>}
          </p>
          {o.state === "partial" && (
            <p className="mt-0.5 text-xs text-ink-2">
              {isIn ? "Recibido" : "Pagado"} <span className="num font-semibold">{formatMoney(o.receivedAmount, o.currency)}</span> de{" "}
              <span className="num">{formatMoney(o.plannedAmount, o.currency)}</span>
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {o.flow === "card_estimate" ? (
              <button type="button" onClick={otherValue} className={cn(chip, "bg-teal-500 text-navy-950 hover:bg-teal-400")}>
                <CreditCard className="size-3.5" /> Pagar tarjeta
              </button>
            ) : due ? (
              <>
                <span className="mr-0.5 text-xs font-semibold text-ink-2">¿Se {isIn ? "recibió" : "hizo"}?</span>
                <button
                  type="button"
                  onClick={() => run(() => confirmOccurrence(o.plannedItemId!, o.dueDate))}
                  className={cn(chip, "bg-teal-500 text-navy-950 hover:bg-teal-400")}
                >
                  <Check className="size-3.5" strokeWidth={3} /> Sí{o.state === "partial" ? ", el resto" : ""}
                </button>
                <button type="button" onClick={otherValue} className={cn(chip, "bg-canvas text-ink hover:bg-line")}>
                  Otro valor
                </button>
                {o.state === "partial" ? (
                  <button type="button" onClick={() => run(() => setOccurrenceStatus(o.plannedItemId!, o.dueDate, "closed"))} className={cn(chip, "bg-canvas text-ink-2 hover:bg-line")}>
                    No llegará más
                  </button>
                ) : (
                  <button type="button" onClick={() => run(() => setOccurrenceStatus(o.plannedItemId!, o.dueDate, "skipped"))} className={cn(chip, "bg-canvas text-ink-2 hover:bg-line")}>
                    <X className="size-3.5" /> No
                  </button>
                )}
              </>
            ) : (
              <>
                <button type="button" onClick={otherValue} className={cn(chip, "bg-canvas text-ink hover:bg-line")}>
                  <Check className="size-3.5" /> Ya se {isIn ? "recibió" : "hizo"}
                </button>
                <button type="button" onClick={() => run(() => setOccurrenceStatus(o.plannedItemId!, o.dueDate, "skipped"))} className={cn(chip, "bg-canvas text-ink-2 hover:bg-line")}>
                  Omitir esta vez
                </button>
              </>
            )}
            {item && (
              <span className="ml-auto flex items-center">
                <button
                  type="button"
                  onClick={() => openPlanned({ ...item })}
                  className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                  aria-label={`Editar programación de ${o.name}`}
                  title="Editar programación"
                >
                  <Pencil className="size-4" />
                </button>
                <ConfirmButton
                  action={() => deletePlanned(item.id)}
                  confirmLabel={item.frequency === "once" ? "¿Eliminar?" : "¿Eliminar todas las fechas?"}
                  onDone={() => setHidden(true)}
                  className="grid size-8 place-items-center rounded-lg text-muted hover:bg-negative-50 hover:text-negative"
                >
                  <Trash2 className="size-4" aria-label={`Eliminar programación de ${o.name}`} />
                </ConfirmButton>
              </span>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

/**
 * Lista de programados pendientes.
 * group="status" → Por confirmar / Próximos · group="date" → por día · "none" → plano.
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
    const due = items.filter((o) => o.dueDate <= today);
    const next = items.filter((o) => o.dueDate > today);
    if (due.length) groups.push({ title: "Por confirmar", tone: "text-warning", items: due });
    if (next.length) groups.push({ title: "Próximos", items: next });
  } else {
    const map = new Map<string, PendingItem[]>();
    for (const o of items) {
      const k = o.dueDate <= today ? "due" : o.dueDate;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    for (const [k, list] of map) {
      groups.push({ title: k === "due" ? "Por confirmar" : formatLong(k), tone: k === "due" ? "text-warning" : undefined, items: list });
    }
  }

  return (
    <div>
      {groups.map((g) => (
        <section key={g.title}>
          <h3 className={cn("pt-2 text-[11px] font-semibold tracking-[0.12em] uppercase", g.tone ?? "text-muted")}>{g.title}</h3>
          <ul className="divide-y divide-line">
            {g.items.map((o) => (
              <Row key={o.key} o={o} baseCurrency={baseCurrency} showDate={group === "status" || g.title === "Por confirmar"} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
