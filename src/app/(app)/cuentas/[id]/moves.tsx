"use client";

import { useRouter } from "next/navigation";
import { ArrowLeftRight, CalendarClock, ChevronRight } from "lucide-react";
import { useAppData } from "@/components/app/app-data";
import { cn } from "@/components/ui/cn";
import { CategoryIcon } from "@/components/ui/icons";
import { formatLong } from "@/lib/dates";
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
    obligation_id: string | null;
  };
}

/** Movimientos de la cuenta agrupados por día, con el saldo al cierre; tocar uno lo abre. */
export function AccountMoves({ moves, currency, today }: { moves: AccountMove[]; currency: Currency; today: string }) {
  const { openTransaction } = useAppData();
  const router = useRouter();
  // Pagos y desembolsos de obligaciones se gestionan en su obligación.
  const open = (m: AccountMove) => (m.tx.obligation_id ? router.push(`/obligaciones/${m.tx.obligation_id}`) : openTransaction({ ...m.tx }));

  // Los movimientos llegan del más reciente al más antiguo: el primero de cada día da el saldo al cierre.
  const days: { date: string; closing: number; net: number; items: AccountMove[] }[] = [];
  for (const m of moves) {
    const last = days[days.length - 1];
    if (last && last.date === m.tx.date) {
      last.items.push(m);
      last.net += m.effect;
    } else days.push({ date: m.tx.date, closing: m.after, net: m.effect, items: [m] });
  }

  return (
    <div>
      {days.map((d) => (
        <section key={d.date}>
          <h3 className="sticky top-[57px] z-10 flex items-baseline justify-between gap-3 border-y border-line bg-canvas/90 px-4 py-1.5 backdrop-blur sm:px-5 lg:top-16">
            <span className="text-xs font-semibold tracking-wide text-muted uppercase">{d.date === today ? "Hoy" : formatLong(d.date)}</span>
            <span className="num text-[11px] whitespace-nowrap text-muted">
              <span className={cn("font-semibold", d.net > 0 ? "text-positive" : "text-ink-2")}>{formatMoney(d.net, currency, { signed: true })}</span>
              {" · "}Saldo al cierre <span className="font-semibold text-ink-2">{formatMoney(d.closing, currency)}</span>
            </span>
          </h3>
          <ul className="divide-y divide-line">
            {d.items.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => open(m)}
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
                    {m.subtitle && <span className="block truncate text-xs text-muted">{m.subtitle}</span>}
                  </span>
                  <span className={cn("num shrink-0 text-sm font-semibold whitespace-nowrap", m.effect > 0 ? "text-positive" : "text-ink")}>
                    {formatMoney(m.effect, currency, { signed: true })}
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
