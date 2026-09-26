"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeftRight, CalendarClock, Pencil, Trash2 } from "lucide-react";
import { deleteTransaction } from "@/app/actions/finance";
import { useAppData } from "@/components/app/app-data";
import { cn } from "@/components/ui/cn";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CategoryIcon } from "@/components/ui/icons";
import { formatLong } from "@/lib/dates";
import { formatMoney, type Currency } from "@/lib/money";

export interface TxRow {
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
  currency: Currency;
  accountName: string;
  toAccountName: string | null;
  categoryName: string | null;
  icon: string | null;
  color: string | null;
}

export function TransactionList({ rows, page, pages, count }: { rows: TxRow[]; page: number; pages: number; count: number }) {
  const { openTransaction } = useAppData();
  const path = usePathname();
  const sp = useSearchParams();
  const groups = new Map<string, TxRow[]>();
  for (const r of rows) {
    if (!groups.has(r.date)) groups.set(r.date, []);
    groups.get(r.date)!.push(r);
  }
  const pageHref = (p: number) => {
    const s = new URLSearchParams(sp.toString());
    s.set("pagina", String(p));
    return `${path}?${s.toString()}`;
  };

  return (
    <div>
      {[...groups.entries()].map(([date, items]) => (
        <section key={date}>
          <h3 className="sticky top-[57px] z-10 border-b border-line bg-canvas/90 px-4 py-1.5 sm:px-5 sm:py-2 text-xs font-semibold tracking-wide text-muted uppercase backdrop-blur lg:top-16">
            {formatLong(date)}
          </h3>
          <ul className="divide-y divide-line">
            {items.map((t) => {
              const isIn = t.kind === "income";
              const isTr = t.kind === "transfer";
              return (
                <li key={t.id} className="group relative flex items-center gap-3 px-4 py-2.5 hover:bg-tint/70 sm:px-5 sm:py-3">
                  {isTr ? (
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900/5 text-navy-700">
                      <ArrowLeftRight className="size-[18px]" />
                    </span>
                  ) : (
                    <CategoryIcon icon={t.icon} color={t.color} />
                  )}
                  <button
                    type="button"
                    onClick={() => openTransaction({ ...t })}
                    className="min-w-0 flex-1 text-left after:absolute after:inset-0 sm:after:hidden"
                    aria-label={`Editar ${t.description ?? t.categoryName ?? "movimiento"}`}
                  >
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink">
                      <span className="truncate">{t.description || t.categoryName || (isTr ? "Transferencia" : "Sin descripción")}</span>
                      {t.planned_item_id && <CalendarClock className="size-3.5 shrink-0 text-teal-600" aria-label="De un programado" />}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {isTr ? `${t.accountName} → ${t.toAccountName}` : [t.description ? t.categoryName : null, t.accountName].filter(Boolean).join(" · ")}
                    </p>
                  </button>
                  <span className={cn("num shrink-0 text-sm font-semibold", isIn ? "text-positive" : isTr ? "text-ink-2" : "text-ink")}>
                    {isIn ? "+" : isTr ? "" : "−"}
                    {formatMoney(t.amount, t.currency)}
                  </span>
                  <div className="hidden shrink-0 items-center gap-0.5 sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                    <button
                      type="button"
                      onClick={() => openTransaction({ ...t })}
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-surface hover:text-ink"
                      aria-label="Editar"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <ConfirmButton
                      action={() => deleteTransaction(t.id)}
                      confirmLabel="¿Eliminar?"
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-negative-50 hover:text-negative"
                    >
                      <Trash2 className="size-4" aria-label="Eliminar" />
                    </ConfirmButton>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {pages > 1 && (
        <nav className="flex items-center justify-between border-t border-line px-5 py-3 text-sm" aria-label="Paginación">
          <span className="text-muted">
            {count} movimientos · página {page} de {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="rounded-lg border border-line px-3 py-1.5 font-semibold hover:bg-canvas">
                Anterior
              </Link>
            )}
            {page < pages && (
              <Link href={pageHref(page + 1)} className="rounded-lg border border-line px-3 py-1.5 font-semibold hover:bg-canvas">
                Siguiente
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
