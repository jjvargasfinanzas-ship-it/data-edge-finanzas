"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarPlus, ChevronLeft, ChevronRight, Plus, Scissors } from "lucide-react";
import { useAppData } from "@/components/app/app-data";
import type { Occurrence } from "@/lib/cashflow";
import { addDays, addMonthsClamped, formatLong, formatMonth, formatShort, formatWeekdayShort, startOfWeek } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";
import type { Tables } from "@/lib/supabase/database.types";
import { Badge, Card } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
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
  /** Monto en moneda base (para totales del día) */
  baseAmount?: number;
  currency?: Currency;
  overdue?: boolean;
  status?: string;
  occurrence?: Occurrence;
  tx?: TxInitial & { id: string };
  event?: Tables<"calendar_events">;
}

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const dot: Record<CalItem["tone"], string> = {
  in: "bg-series-in",
  out: "bg-series-out",
  neutral: "bg-navy-500",
  event: "bg-event",
};

function dayTotals(list: CalItem[]) {
  let inc = 0;
  let out = 0;
  for (const i of list) {
    if (i.baseAmount === undefined) continue;
    if (i.tone === "in") inc += i.baseAmount;
    else if (i.tone === "out") out += i.baseAmount;
  }
  return { inc, out };
}

export function CalendarView({
  month,
  view,
  selected: initialSelected,
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
  const [selected, setSelected] = useState(initialSelected);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => setSelected(initialSelected), [initialSelected]);

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

  const selectDay = (d: string) => {
    setSelected(d);
    // En pantallas pequeñas el detalle se abre como hoja inferior
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1279px)").matches) setSheetOpen(true);
  };

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
    setSheetOpen(false);
    if (i.type === "tx" && i.tx) openTransaction(i.tx);
    else if (i.type === "event" && i.event) openEvent({ ...i.event });
    else if (i.type === "card" && i.occurrence) {
      const bank = accounts.find((a) => !a.is_archived && ["bank_savings", "bank_checking", "digital_wallet"].includes(a.type));
      openTransaction({ kind: "transfer", account_id: bank?.id, to_account_id: i.occurrence.toAccountId, amount: i.occurrence.amount, description: i.title });
    } else if (i.type === "planned" && i.occurrence) {
      const o = i.occurrence;
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
    }
  };

  const title = view === "semana" ? `Semana del ${formatShort(startOfWeek(selected))}` : formatMonth(month);

  const detail = (
    <DayDetail
      date={selected}
      today={today}
      list={byDate.get(selected) ?? []}
      balance={balances[selected]}
      currency={currency}
      onOpen={openItem}
      onNewPlanned={() => {
        setSheetOpen(false);
        openPlanned({ start_date: selected, frequency: "once" });
      }}
      onNewEvent={() => {
        setSheetOpen(false);
        openEvent({ event_date: selected });
      }}
      onNewExpense={() => {
        setSheetOpen(false);
        openTransaction({ kind: "expense", date: selected });
      }}
    />
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => shift(-1)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink" aria-label="Anterior">
              <ChevronLeft className="size-5" />
            </button>
            <h2 className="min-w-44 text-center text-sm font-semibold text-ink">{title}</h2>
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
                <div key={w} role="columnheader" className="py-2 text-center text-[11px] font-semibold tracking-wide text-muted uppercase">
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
                const { inc, out } = dayTotals(list);
                return (
                  <button
                    key={d}
                    type="button"
                    role="gridcell"
                    aria-selected={isSel}
                    aria-label={`${formatLong(d)}, ${list.length} elementos`}
                    onClick={() => selectDay(d)}
                    className={cn(
                      "flex min-h-[78px] flex-col items-stretch gap-0.5 border-r border-b border-line p-1.5 text-left transition-colors sm:min-h-[108px] sm:p-2 [&:nth-child(7n)]:border-r-0",
                      !inMonth && "bg-canvas/50",
                      isSel ? "bg-teal-50 ring-2 ring-teal-500 ring-inset" : "hover:bg-canvas",
                    )}
                  >
                    <span className="flex items-center justify-between">
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full text-xs font-semibold",
                          d === today ? "bg-teal-500 text-navy-950" : inMonth ? "text-ink" : "text-muted/60",
                        )}
                      >
                        {Number(d.slice(8))}
                      </span>
                      <span className="flex gap-0.5 sm:hidden">
                        {list.slice(0, 3).map((i) => (
                          <span key={i.id} className={cn("size-1.5 rounded-full", dot[i.tone])} />
                        ))}
                      </span>
                    </span>
                    {inc > 0 && <span className="num hidden truncate text-[11px] font-semibold text-positive sm:block">+{formatMoney(inc, currency, { compact: true })}</span>}
                    {out > 0 && <span className="num hidden truncate text-[11px] font-semibold text-out-ink sm:block">−{formatMoney(out, currency, { compact: true })}</span>}
                    <span className="hidden flex-col gap-0.5 sm:flex">
                      {list
                        .filter((i) => i.baseAmount === undefined)
                        .slice(0, 2)
                        .map((i) => (
                          <span key={i.id} className="flex items-center gap-1 truncate text-[10px] leading-tight text-ink-2">
                            <span className={cn("size-1.5 shrink-0 rounded-full", dot[i.tone])} />
                            <span className="truncate">{i.title}</span>
                          </span>
                        ))}
                    </span>
                    {bal !== undefined && d >= today && (
                      <span className={cn("num mt-auto truncate text-right text-[10px] font-semibold sm:text-[11px]", bal < 0 ? "text-negative" : "text-muted")}>
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
                <div key={d} className={cn("min-h-40 p-2", d === today && "bg-teal-50/60", d === selected && "ring-2 ring-teal-500 ring-inset")}>
                  <button type="button" onClick={() => selectDay(d)} className="mb-2 flex w-full items-baseline justify-between">
                    <span className="text-xs font-semibold text-muted uppercase">{formatWeekdayShort(d)}</span>
                    <span className={cn("text-lg font-semibold", d === today ? "text-teal-700" : "text-ink")}>{Number(d.slice(8))}</span>
                  </button>
                  <ul className="space-y-1.5">
                    {list.map((i) => (
                      <li key={i.id}>
                        <button type="button" onClick={() => openItem(i)} disabled={i.type === "cardDate"} className="w-full rounded-lg bg-canvas px-2 py-1.5 text-left hover:bg-line disabled:hover:bg-canvas">
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
                    <p className={cn("num mt-2 text-right text-[11px] font-semibold", balances[d] < 0 ? "text-negative" : "text-teal-700")}>
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
                <li key={d}>
                  <button type="button" onClick={() => selectDay(d)} className="flex w-full gap-4 px-5 py-4 text-left hover:bg-tint/70">
                    <div className="w-12 shrink-0 text-center">
                      <p className="text-[11px] font-semibold text-muted uppercase">{formatWeekdayShort(d)}</p>
                      <p className={cn("text-xl font-semibold", d === today ? "text-teal-700" : "text-ink")}>{Number(d.slice(8))}</p>
                    </div>
                    <ul className="min-w-0 flex-1 space-y-1">
                      {(byDate.get(d) ?? []).map((i) => (
                        <li key={i.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className={cn("size-2 shrink-0 rounded-full", dot[i.tone])} />
                            <span className="truncate text-ink">{i.title}</span>
                          </span>
                          {i.amount !== undefined && (
                            <span className={cn("num shrink-0 font-semibold", i.tone === "in" ? "text-positive" : "text-ink")}>{formatMoney(i.amount, i.currency)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </button>
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
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-navy-500" /> Transferencias y fechas de tarjeta</span>
          <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-event" /> Eventos</span>
          <span className="text-muted">Abajo a la derecha de cada día: saldo estimado al cierre</span>
        </div>
      </Card>

      {/* Detalle del día: panel lateral en escritorio, hoja inferior en móvil */}
      <Card className="hidden h-fit xl:sticky xl:top-24 xl:block">{detail}</Card>
      <Modal open={sheetOpen} onClose={() => setSheetOpen(false)} title={formatLong(selected).replace(/^./, (c) => c.toUpperCase())}>
        {detail}
      </Modal>
    </div>
  );
}

function DayDetail({
  date,
  today,
  list,
  balance,
  currency,
  onOpen,
  onNewPlanned,
  onNewEvent,
  onNewExpense,
}: {
  date: string;
  today: string;
  list: CalItem[];
  balance?: number;
  currency: Currency;
  onOpen: (i: CalItem) => void;
  onNewPlanned: () => void;
  onNewEvent: () => void;
  onNewExpense: () => void;
}) {
  const ins = list.filter((i) => i.tone === "in");
  const outs = list.filter((i) => i.tone === "out");
  const neutral = list.filter((i) => i.tone === "neutral");
  const events = list.filter((i) => i.tone === "event");
  const { inc, out } = dayTotals(list);

  const Section = ({ title, rows, total, tone }: { title: string; rows: CalItem[]; total?: number; tone?: "in" | "out" }) =>
    rows.length ? (
      <section className="py-3">
        <div className="mb-1 flex items-baseline justify-between">
          <h3 className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">{title}</h3>
          {total !== undefined && total > 0 && (
            <span className={cn("num text-sm font-semibold", tone === "in" ? "text-positive" : "text-ink")}>
              {tone === "in" ? "+" : "−"}
              {formatMoney(total, currency)}
            </span>
          )}
        </div>
        <ul>
          {rows.map((i) => (
            <li key={i.id}>
              <ItemRow item={i} onOpen={() => onOpen(i)} />
            </li>
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div>
      <div className="hidden border-b border-line px-5 py-4 xl:block">
        <p className="text-xs font-semibold tracking-wide text-muted uppercase">{date === today ? "Hoy" : "Día seleccionado"}</p>
        <p className="text-sm font-semibold text-ink first-letter:uppercase">{formatLong(date)}</p>
      </div>
      <div className="divide-y divide-line px-0 xl:px-5">
        {list.length ? (
          <>
            <Section title="Ingresos" rows={ins} total={inc} tone="in" />
            <Section title="Gastos y pagos" rows={outs} total={out} tone="out" />
            <Section title="Transferencias y tarjetas" rows={neutral} />
            <Section title="Eventos" rows={events} />
          </>
        ) : (
          <p className="py-6 text-center text-sm text-muted">Nada programado este día.</p>
        )}
      </div>
      {balance !== undefined && date >= today && (
        <div className="mx-0 mt-1 flex items-center justify-between rounded-xl bg-tint px-4 py-3 xl:mx-5">
          <span className="text-sm font-medium text-ink-2">Saldo esperado al cierre</span>
          <span className={cn("num text-base font-semibold", balance < 0 ? "text-negative" : "text-teal-700")}>{formatMoney(balance, currency)}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-2 px-0 py-4 xl:px-5">
        <button type="button" onClick={onNewPlanned} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink hover:bg-line">
          <Plus className="size-3.5" /> Programar
        </button>
        <button type="button" onClick={onNewEvent} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink hover:bg-line">
          <CalendarPlus className="size-3.5" /> Evento
        </button>
        {date <= today && (
          <button type="button" onClick={onNewExpense} className="inline-flex items-center gap-1.5 rounded-lg bg-canvas px-3 py-2 text-xs font-semibold text-ink hover:bg-line">
            <Plus className="size-3.5" /> Gasto
          </button>
        )}
      </div>
    </div>
  );
}

function ItemRow({ item: i, onOpen }: { item: CalItem; onOpen: () => void }) {
  const clickable = i.type !== "cardDate";
  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={onOpen}
      className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left hover:bg-canvas disabled:hover:bg-transparent"
    >
      {i.type === "cardDate" ? <Scissors className="size-3.5 shrink-0 text-navy-500" /> : <span className={cn("size-2 shrink-0 rounded-full", dot[i.tone])} />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">{i.title}</span>
        <span className="flex items-center gap-1.5 truncate text-xs text-muted">
          {i.status && (
            <Badge tone={i.status === "Vencido" || i.status === "Parcial" ? "warning" : i.status.startsWith("Registrado") ? "positive" : "neutral"} className="normal-case tracking-normal">
              {i.status}
            </Badge>
          )}
          <span className="truncate">{i.subtitle}</span>
        </span>
      </span>
      {i.amount !== undefined && (
        <span className={cn("num shrink-0 text-sm font-semibold", i.tone === "in" ? "text-positive" : "text-ink")}>
          {i.tone === "in" ? "+" : i.tone === "out" ? "−" : ""}
          {formatMoney(i.amount, i.currency)}
        </span>
      )}
    </button>
  );
}
