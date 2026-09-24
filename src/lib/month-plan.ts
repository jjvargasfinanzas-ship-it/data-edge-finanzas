/**
 * Programado vs. real para un periodo (normalmente el mes).
 *
 * Cada ocurrencia de un programado de ingreso o gasto tiene un estado:
 * - done     recibido/pagado completo (o de más)
 * - closed   dado por completo manualmente con diferencia
 * - partial  se registró una parte; queda saldo pendiente
 * - overdue  la fecha pasó y no se ha registrado nada
 * - today    vence hoy
 * - upcoming aún no llega la fecha
 * - skipped  omitido (no ocurrirá)
 */
import type { ISODate } from "./dates";
import type { Settlement } from "./cashflow";
import { occurrencesBetween, type Frequency } from "./recurrence";

export type OccStatus = "done" | "closed" | "partial" | "overdue" | "today" | "upcoming" | "skipped";

export const OCC_STATUS_LABEL: Record<OccStatus, { income: string; expense: string }> = {
  done: { income: "Recibido", expense: "Pagado" },
  closed: { income: "Cerrado", expense: "Cerrado" },
  partial: { income: "Parcial", expense: "Parcial" },
  overdue: { income: "Vencido", expense: "Vencido" },
  today: { income: "Hoy", expense: "Hoy" },
  upcoming: { income: "Pendiente", expense: "Pendiente" },
  skipped: { income: "Omitido", expense: "Omitido" },
};

export interface PlanItem {
  id: string;
  kind: "income" | "expense" | "transfer";
  name: string;
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  frequency: Frequency;
  start_date: ISODate;
  end_date: ISODate | null;
  is_active: boolean;
  created_at?: string;
}

export interface PlanRow {
  key: string;
  plannedItemId: string;
  name: string;
  kind: "income" | "expense" | "transfer";
  date: ISODate;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  /** Montos en la moneda de la cuenta del programado */
  planned: number;
  received: number;
  /** Lo que falta (0 si está completo, cerrado u omitido) */
  pending: number;
  /** received − planned (solo con sentido cuando está completo o cerrado) */
  difference: number;
  status: OccStatus;
}

export function buildPlanRows(p: {
  planned: PlanItem[];
  settlements: Settlement[];
  from: ISODate;
  to: ISODate;
  today: ISODate;
}): PlanRow[] {
  const settled = new Map(p.settlements.map((s) => [`${s.planned_item_id}|${s.planned_date}`, s]));
  const rows: PlanRow[] = [];
  for (const item of p.planned) {
    if (!item.is_active) continue;
    const createdOn = item.created_at?.slice(0, 10);
    for (const d of occurrencesBetween(item, p.from, p.to)) {
      const st = settled.get(`${item.id}|${d}`);
      // Fechas anteriores a la creación del programado no cuentan, salvo que se hayan registrado
      if (createdOn && d < createdOn && d < p.today && !st) continue;
      const received = st?.received ?? 0;
      let status: OccStatus;
      if (st?.status === "skipped") status = "skipped";
      else if (received >= item.amount) status = "done";
      else if (st?.status === "closed") status = "closed";
      else if (received > 0) status = "partial";
      else if (d < p.today) status = "overdue";
      else if (d === p.today) status = "today";
      else status = "upcoming";
      const open = status === "partial" || status === "overdue" || status === "today" || status === "upcoming";
      rows.push({
        key: `${item.id}|${d}`,
        plannedItemId: item.id,
        name: item.name,
        kind: item.kind,
        date: d,
        accountId: item.account_id,
        toAccountId: item.to_account_id,
        categoryId: item.category_id,
        planned: item.amount,
        received,
        pending: open ? Math.max(0, Math.round((item.amount - received) * 100) / 100) : 0,
        difference: status === "skipped" ? 0 : Math.round((received - item.amount) * 100) / 100,
        status,
      });
    }
  }
  return rows.sort((a, b) => (a.date === b.date ? a.name.localeCompare(b.name) : a.date < b.date ? -1 : 1));
}

export interface PlanSummary {
  planned: number;
  received: number;
  pending: number;
  /** Diferencias de lo ya cerrado/completo (recibido − programado) */
  difference: number;
  count: number;
  countDone: number;
  countPending: number;
  countOverdue: number;
}

/** Totaliza filas de un tipo convirtiendo a moneda base con `toBase(monto, fila)`. */
export function summarizePlan(rows: PlanRow[], kind: "income" | "expense", toBase: (v: number, r: PlanRow) => number): PlanSummary {
  const s: PlanSummary = { planned: 0, received: 0, pending: 0, difference: 0, count: 0, countDone: 0, countPending: 0, countOverdue: 0 };
  for (const r of rows) {
    if (r.kind !== kind || r.status === "skipped") continue;
    s.count++;
    s.planned += toBase(r.planned, r);
    s.received += toBase(r.received, r);
    s.pending += toBase(r.pending, r);
    if (r.status === "done" || r.status === "closed") {
      s.countDone++;
      s.difference += toBase(r.difference, r);
    } else s.countPending++;
    if (r.status === "overdue") s.countOverdue++;
  }
  return s;
}
