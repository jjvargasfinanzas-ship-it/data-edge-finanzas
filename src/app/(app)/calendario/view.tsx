"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight, CreditCard, Plus, Scissors } from "lucide-react";
import { useAppData } from "@/components/app/app-data";
import type { Occurrence } from "@/lib/cashflow";
import { addDays, addMonthsClamped, formatLong, formatMonth, formatShort, formatWeekdayShort, startOfWeek } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";
import type { Tables } from "@/lib/supabase/database.types";
import { Badge, Card } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import type { TxInitial } from "@/components/app/forms/transaction-form";

export interface CalItem {
  id: string;
  date: string;
  title: string;
  subtitle?: string;
  type: "tx" | "planned" | "card" | "cardDate" | "event";
  tone: "in" | "out" | "neutral" | "event";
  amount?: number;
  currency?: Currency;
  overdue?: boolean;
  occurrence?: Occurrence;
  tx?: TxInitial & { id: string };
  event?: Tables<"calendar_events">;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const dot: Record<CalItem["tone"], string> = {
  in: "bg-series-in",
  out: "bg-series-out",
  neutral: "bg-navy-500",
  event: "bg-[#8b5cf6]",
};

export function CalendarView({
  month,
  view,
  selected,
  today,
  from,
  to,
  items,
  balances,
  currency,
}: {
  month: string;
  view: "mes" | "semana" | "agenda";
  selected: string;
  today: string;
  from: string;
  to: string;
  items: CalItem[];
  balances: Record<string, number>;
  currency: Currency;
}) {
  const router = useRouter();
  const path = usePathname();
  const { accounts, openTransaction, openEvent, openPlanned } = useAppData();

  const byDate = useMemo(() => {
    const m = new Map<string, CalItem[]>();
    for (const i of items) {
      if (!m.has(i.date)) m.set(i.date, []);
      m.get(i.date)!.push(i);
    }
    return m;
  }, [items]);

  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ mes: month, vista: view, dia: selected, ...patch });
    return `${path}?${p.toString()}`;
  };
  const go = (patch: Record<string, string>) => router.push(href(patch), { scroll: false });

  const shift = (n: number) => {
    if (view === "semana") {
      const d = addDays(selected, n * 7);
      go({ dia: d, mes: d.slice(0, 7) });
    } else {
      const m = addMonthsClamped(`${month}-01`, n);
      go({ mes: m.slice(0, 7), dia: m.slice(0, 7) === today.slice(0, 7) ? today : m });
    }
  };

  const days: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d);

  const openItem = (i: CalItem) => {
    if (i.type === "tx" && i.tx) openTransaction(i.tx);
    else if (i.type === "event" && i.event) openEvent({ ...i.event });
    else if (i.type === "card" && i.occurrence) {
      const bank = accounts.find((a) => !a.is_archived && ["bank_savings", "bank_checking", "digital_wallet"].includes(a.type));
      openTransaction({ kind: "transfer", account_id: bank?.id, to_account_id: i.occurrence.toAccountId, amount: i.occurrence.amount, description: i.title.replace("Pago estimado", "Pago") });
    } else if (i.type === "planned" && i.occurrence) {
      const o = i.occurrence;
      openTransaction({
        kind: o.kind,
        amount: o.amount,
        account_id: o.accountId,
        to_account_id: o.toAccountId,
        category_id: o.categoryId,
        description: o.name,
        date: o.dueDate > today ? o.dueDate : today,
        planned_item_id: o.plannedItemId,
        planned_date: o.dueDate,
      });
    }
  };

  const title = view === "semana" ? `Semana del ${formatShort(startOfWeek(selected))}` : formatMonth(month);
  const dayItems = byDate.get(selected) ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => shift(-1)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink" aria-label="Anterior">
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="min-w-44 text-center text-[15px] font-bold text-ink">{title}</h2>
            <button type="button" onClick={() => shift(1)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink" aria-label="Siguiente">
              <ChevronRight className="size-5" />
            </button>
            <Link href={href({ mes: today.slice(0, 7), dia: today })} scroll={false} className="ml-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-50">
              Hoy
            </Link>
          </div>
          <div className="flex rounded-xl bg-canvas p-1" role="group" aria-label="Vista">
            {(["mes", "semana", "agenda"] as const).map((v) => (
              <Link
                key={v}
                href={href({ vista: v })}
                scroll={false}
                className={cn("rounded-lg px-3 py-1 text-sm font-semibold capitalize", v === view ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
              >
                {v}
              </Link>
            ))}
          </div>
        </div>

        {view === "mes" && (
          <div role="grid" aria-label={title}>
            <div className="grid grid-cols-7 border-b border-line bg-canvas/60" role="row">
              {WEEKDAYS.map((w) => (
                <div key={w} role="columnheader" className="py-2 text-center text-[11px] font-bold tracking-wide text-muted uppercase">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const list = byDate.get(d) ?? [];
                const inMonth = d.slice(0, 7) === month;
                const bal = balances[d];
                const isSel = d === selected;
                return (
                  <button
                    key={d}
                    type="button"
                    role="gridcell"
                    aria-selected={isSel}
                    aria-label={`${formatLong(d)}, ${list.length} elementos`}
                    onClick={() => go({ dia: d })}
                    className={cn(
                      "flex min-h-[74px] flex-col items-stretch gap-1 border-r border-b border-line p-1.5 text-left transition-colors sm:min-h-[104px] sm:p-2 [&:nth-child(7n)]:border-r-0",
                      !inMonth && "bg-canvas/50",
                      isSel ? "bg-teal-50 ring-2 ring-teal-500 ring-inset" : "hover:bg-canvas",
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full text-xs font-bold",
                          d === today ? "bg-navy-900 text-white" : inMonth ? "text-ink" : "text-muted/60",
                        )}
                      >
                        {Number(d.slice(8))}
                      </span>
                    </span>
                    <span className="hidden flex-col gap-0.5 sm:flex">
                      {list.slice(0, 3).map((i) => (
                        <span key={i.id} className="flex items-center gap-1 truncate text-[11px] leading-tight text-ink-2">
                          <span className={cn("size-1.5 shrink-0 rounded-full", dot[i.tone])} />
                          <span className="truncate">{i.title}</span>
                        </span>
                      ))}
                      {list.length > 3 && <span className="text-[10px] font-semibold text-muted">+{list.length - 3} más</span>}
                    </span>
                    <span className="flex flex-wrap gap-0.5 sm:hidden">
                      {list.slice(0, 4).map((i) => (
                        <span key={i.id} className={cn("size-1.5 rounded-full", dot[i.tone])} />
                      ))}
                    </span>
                    {bal !== undefined && d >= today && (
                      <span className={cn("num mt-auto truncate text-right text-[10px] font-bold sm:text-[11px]", bal < 0 ? "text-negative" : "text-teal-700")}>
                        {formatMoney(bal, currency, { compact: true })}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {view === "semana" && (
          <div className="grid divide-y divide-line sm:grid-cols-7 sm:divide-x sm:divide-y-0">
            {days.map((d) => {
              const list = byDate.get(d) ?? [];
              return (
                <div key={d} className={cn("min-h-40 p-2", d === today && "bg-teal-50/60")}>
                  <button type="button" onClick={() => go({ dia: d })} className="mb-2 flex w-full items-baseline justify-between">
                    <span className="text-xs font-bold text-muted uppercase">{formatWeekdayShort(d)}</span>
                    <span className={cn("text-lg font-bold", d === today ? "text-teal-700" : "text-ink")}>{Number(d.slice(8))}</span>
                  </button>
                  <ul className="space-y-1.5">
                    {list.map((i) => (
                      <li key={i.id}>
                        <button type="button" onClick={() => openItem(i)} className="w-full rounded-lg bg-canvas px-2 py-1.5 text-left hover:bg-line">
                          <span className="flex items-center gap-1.5 text-xs font-semibold text-ink">
                            <span className={cn("size-1.5 shrink-0 rounded-full", dot[i.tone])} />
                            <span className="truncate">{i.title}</span>
                          </span>
                          {i.amount !== undefined && <span className="num block text-[11px] text-muted">{formatMoney(i.amount, i.currency)}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                  {balances[d] !== undefined && d >= today && (
                    <p className={cn("num mt-2 text-right text-[11px] font-bold", balances[d] < 0 ? "text-negative" : "text-teal-700")}>
                      Saldo {formatMoney(balances[d], currency, { compact: true })}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {view === "agenda" && (
          <ol className="divide-y divide-line">
            {days
              .filter((d) => d.slice(0, 7) === month && (byDate.get(d)?.length ?? 0) > 0)
              .map((d) => (
                <li key={d} className="flex gap-4 px-5 py-4">
                  <div className="w-12 shrink-0 text-center">
                    <p className="text-[11px] font-bold text-muted uppercase">{formatWeekdayShort(d)}</p>
                    <p className={cn("text-xl font-bold", d === today ? "text-teal-700" : "text-ink")}>{Number(d.slice(8))}</p>
                  </div>
                  <ul className="min-w-0 flex-1 space-y-1.5">
                    {(byDate.get(d) ?? []).map((i) => (
                      <li key={i.id}>
                        <ItemRow item={i} onOpen={() => openItem(i)} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            {!days.some((d) => d.slice(0, 7) === month && (byDate.get(d)?.length ?? 0) > 0) && (
              <li className="px-5 py-10 text-center text-sm text-muted">No hay nada en este mes.</li>
            )}
          </ol>
        )}

        <div className="flex flex-wrap gap-4 border-t border-line px-4 py-3 text-xs font-semibold text-ink-2">
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-series-in" /> Ingresos</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-series-out" /> Gastos y pagos</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-navy-500" /> Transferencias y tarjetas</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#8b5cf6]" /> Eventos</span>
          <span className="flex items-center gap-1.5"><span className="num text-teal-700">$</span> Saldo estimado al cierre del día</span>
        </div>
      </Card>

      {/* Detalle del día */}
      <Card className="h-fit xl:sticky xl:top-24">
        <div className="border-b border-line px-5 py-4">
          <p className="text-xs font-bold tracking-wide text-muted uppercase">{selected === today ? "Hoy" : "Día seleccionado"}</p>
          <p className="text-[15px] font-bold text-ink first-letter:uppercase">{formatLong(selected)}</p>
          {balances[selected] !== undefined && selected >= today && (
            <p className="mt-1 text-sm text-muted">
              Saldo estimado al cierre:{" "}
              <strong className={cn("num", balances[selected] < 0 ? "text-negative" : "text-ink")}>{formatMoney(balances[selected], currency)}</strong>
            </p>
          )}
        </div>
        <div className="px-5 py-3">
          {dayItems.length ? (
            <ul className="space-y-2">
              {dayItems.map((i) => (
                <li key={i.id}>
                  <ItemRow item={i} onOpen={() => openItem(i)} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">Nada programado este día.</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={() => openPlanned({ start_date: selected, frequency: "once" })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-xs font-bold text-ink hover:bg-line"
          >
            <Plus className="size-3.5" /> Pago o ingreso
          </button>
          <button
            type="button"
            onClick={() => openEvent({ event_date: selected })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-xs font-bold text-ink hover:bg-line"
          >
            <CalendarPlus className="size-3.5" /> Evento
          </button>
          {selected <= today && (
            <button
              type="button"
              onClick={() => openTransaction({ kind: "expense", date: selected })}
              className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-xs font-bold text-ink hover:bg-line"
            >
              <Plus className="size-3.5" /> Gasto
            </button>
          )}
        </div>
      </Card>
    </div>
  );
}

function ItemRow({ item: i, onOpen }: { item: CalItem; onOpen: () => void }) {
  const clickable = i.type !== "cardDate";
  const Icon = i.type === "cardDate" ? Scissors : i.type === "card" ? CreditCard : null;
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-canvas disabled:hover:bg-transparent"
    >
      {Icon ? <Icon className="size-3.5 shrink-0 text-navy-500" /> : <span className={cn("size-2 shrink-0 rounded-full", dot[i.tone])} />}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
          <span className="truncate">{i.title}</span>
          {i.overdue && <Badge tone="warning">Pendiente</Badge>}
          {i.type === "planned" && !i.overdue && <Badge tone="brand">Programado</Badge>}
          {i.type === "card" && <Badge>Estimado</Badge>}
        </span>
        {i.subtitle && <span className="block truncate text-xs text-muted">{i.subtitle}</span>}
      </span>
      {i.amount !== undefined && (
        <span className={cn("num shrink-0 text-sm font-bold", i.tone === "in" ? "text-positive" : "text-ink")}>
          {i.tone === "in" ? "+" : i.tone === "out" ? "−" : ""}
          {formatMoney(i.amount, i.currency)}
        </span>
      )}
    </button>
  );
}
