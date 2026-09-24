"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Pause, Pencil, Play, Trash2 } from "lucide-react";
import { deletePlanned, setPlannedActive } from "@/app/actions/finance";
import { useAppData } from "@/components/app/app-data";
import { Badge, Card, Money } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { CategoryIcon } from "@/components/ui/icons";
import { formatShort } from "@/lib/dates";
import type { Currency } from "@/lib/money";
import type { Frequency } from "@/lib/recurrence";

export interface PlannedRow {
  id: string;
  kind: "income" | "expense" | "transfer";
  name: string;
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  notes: string | null;
  is_active: boolean;
  currency: Currency;
  accountName: string;
  toAccountName: string | null;
  categoryName: string | null;
  icon: string | null;
  color: string | null;
  frequencyLabel: string;
  next: string | null;
  monthly: number;
}

function ToggleButton({ row }: { row: PlannedRow }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await setPlannedActive(row.id, !row.is_active);
          if (r.ok) toast.success(r.message);
          else toast.error(r.error);
        })
      }
      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
      aria-label={row.is_active ? "Pausar" : "Activar"}
      title={row.is_active ? "Pausar" : "Activar"}
    >
      {row.is_active ? <Pause className="size-4" /> : <Play className="size-4" />}
    </button>
  );
}

const GROUPS: { kind: PlannedRow["kind"]; label: string }[] = [
  { kind: "income", label: "Ingresos" },
  { kind: "expense", label: "Gastos y pagos" },
  { kind: "transfer", label: "Transferencias y pagos de tarjeta" },
];

export function PlannedList({ rows, currency }: { rows: PlannedRow[]; currency: Currency }) {
  const { openPlanned } = useAppData();
  return (
    <div className="space-y-6">
      {GROUPS.map((g) => {
        const items = rows.filter((r) => r.kind === g.kind);
        if (!items.length) return null;
        return (
          <section key={g.kind}>
            <h2 className="mb-2 px-1 text-xs font-bold tracking-[0.14em] text-muted uppercase">{g.label}</h2>
            <Card>
              <ul className="divide-y divide-line">
                {items.map((r) => (
                  <li key={r.id} className={cn("flex items-center gap-3 px-5 py-3.5", !r.is_active && "opacity-55")}>
                    {r.kind === "transfer" ? (
                      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900/5 text-navy-700">
                        <ArrowLeftRight className="size-[18px]" />
                      </span>
                    ) : (
                      <CategoryIcon icon={r.icon} color={r.color} />
                    )}
                    <button type="button" onClick={() => openPlanned({ ...r })} className="min-w-0 flex-1 text-left">
                      <p className="flex items-center gap-2 truncate text-sm font-bold text-ink">
                        <span className="truncate">{r.name}</span>
                        {!r.is_active && <Badge>Pausado</Badge>}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {r.frequencyLabel} · {r.kind === "transfer" ? `${r.accountName} → ${r.toAccountName}` : r.accountName}
                        {r.next && <> · próximo <strong className="text-ink-2">{formatShort(r.next)}</strong></>}
                        {!r.next && r.is_active && " · finalizado"}
                      </p>
                    </button>
                    <div className="text-right">
                      <Money value={r.amount} currency={r.currency} className={cn("text-sm font-bold", r.kind === "income" ? "text-positive" : "text-ink")} />
                      {r.frequency !== "monthly" && r.monthly > 0 && (
                        <p className="num text-[11px] text-muted">
                          ≈ <Money value={r.monthly} currency={currency} compact />/mes
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => openPlanned({ ...r })}
                        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                        aria-label="Editar"
                      >
                        <Pencil className="size-4" />
                      </button>
                      <ToggleButton row={r} />
                      <ConfirmButton
                        action={() => deletePlanned(r.id)}
                        confirmLabel="¿Eliminar?"
                        className="grid size-8 place-items-center rounded-lg text-muted hover:bg-negative-50 hover:text-negative"
                      >
                        <Trash2 className="size-4" aria-label="Eliminar" />
                      </ConfirmButton>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
