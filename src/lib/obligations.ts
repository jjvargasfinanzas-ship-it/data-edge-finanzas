import { addDays, addMonthsClamped, diffDays, type ISODate } from "./dates";
import { occurrencesBetween, type Frequency } from "./recurrence";
import type { Currency } from "./money";

/**
 * Obligaciones: cronograma de cuotas, aplicación de pagos y estado.
 *
 * - Total a pagar = cuota × número de cuotas (si se definió la cuota) o el valor original.
 * - Los pagos se aplican en orden a las cuotas más antiguas (cascada).
 * - Estado: pagada, anulada, vencida (alguna cuota vencida sin cubrir),
 *   por vencer (la próxima cuota vence en ≤ DUE_SOON_DAYS días) o al día.
 */

export const DUE_SOON_DAYS = 7;

export type ObligationKind =
  | "bank_loan" | "mortgage" | "vehicle" | "personal" | "tax" | "service" | "education" | "health" | "rent" | "other";

export const OBLIGATION_KIND_LABELS: Record<ObligationKind, string> = {
  bank_loan: "Crédito bancario",
  mortgage: "Crédito de vivienda",
  vehicle: "Crédito de vehículo",
  personal: "Deuda con persona",
  tax: "Impuestos",
  service: "Servicios",
  education: "Educación",
  health: "Salud",
  rent: "Arriendo",
  other: "Otra",
};

/** Categoría principal de la clasificación de acreedores (independiente de ingresos y gastos). */
export const OBLIGATION_ROOT_CATEGORY = "Obligaciones financieras";
export const UNCLASSIFIED = "Sin clasificar";

export interface ObligationRecord {
  id: string;
  creditor: string;
  /** Subcategoría de Obligaciones financieras (tipo de acreedor). */
  class_id: string | null;
  class_name: string | null;
  kind: ObligationKind;
  concept: string;
  currency: Currency;
  original_amount: number;
  installment_amount: number | null;
  installments: number;
  frequency: Frequency;
  first_due_date: ISODate;
  status: string;
  account_id: string | null;
}

export type InstallmentStatus = "paid" | "partial" | "overdue" | "due_soon" | "pending";

export interface Installment {
  n: number;
  date: ISODate;
  amount: number;
  paid: number;
  remaining: number;
  status: InstallmentStatus;
}

export type ObligationState = "paid" | "cancelled" | "overdue" | "due_soon" | "current";

export const STATE_LABELS: Record<ObligationState, string> = {
  paid: "Pagada",
  cancelled: "Anulada",
  overdue: "Vencida",
  due_soon: "Por vencer",
  current: "Al día",
};

export interface ObligationSummary {
  obligation: ObligationRecord;
  schedule: Installment[];
  totalToPay: number;
  paid: number;
  pending: number;
  paidPct: number;
  installmentsPaid: number;
  next: Installment | null;
  overdueAmount: number;
  overdueCount: number;
  state: ObligationState;
  lastDueDate: ISODate;
}

const round2 = (v: number) => Math.round(v * 100) / 100;

/** Fechas de las cuotas, en orden. */
export function installmentDates(o: Pick<ObligationRecord, "frequency" | "first_due_date" | "installments">): ISODate[] {
  const n = Math.max(1, o.frequency === "once" ? 1 : o.installments);
  if (n === 1) return [o.first_due_date];
  const horizon = addMonthsClamped(o.first_due_date, 12 * 60);
  return occurrencesBetween({ frequency: o.frequency, start_date: o.first_due_date }, o.first_due_date, horizon, n + 2).slice(0, n);
}

/** Valor de cada cuota. Sin cuota definida, reparte el valor original y la última absorbe el redondeo. */
export function installmentAmounts(o: Pick<ObligationRecord, "original_amount" | "installment_amount" | "installments" | "frequency" | "currency">): number[] {
  const n = Math.max(1, o.frequency === "once" ? 1 : o.installments);
  if (o.installment_amount && o.installment_amount > 0) return Array(n).fill(round2(o.installment_amount));
  const decimals = o.currency === "COP" ? 0 : 2;
  const f = 10 ** decimals;
  const base = Math.floor((o.original_amount / n) * f) / f;
  const out = Array(n).fill(base);
  out[n - 1] = round2(o.original_amount - base * (n - 1));
  return out;
}

export function summarizeObligation(o: ObligationRecord, paidTotal: number, today: ISODate): ObligationSummary {
  const dates = installmentDates(o);
  const amounts = installmentAmounts(o);
  const totalToPay = round2(amounts.reduce((s, a) => s + a, 0));
  const paid = round2(Math.max(0, paidTotal));

  let pool = paid;
  const schedule: Installment[] = dates.map((date, i) => {
    const amount = amounts[i] ?? amounts[amounts.length - 1];
    const applied = Math.min(amount, Math.max(0, pool));
    pool = round2(pool - applied);
    const remaining = round2(amount - applied);
    let status: InstallmentStatus;
    if (remaining <= 0.005) status = "paid";
    else if (date < today) status = "overdue";
    else if (diffDays(date, today) <= DUE_SOON_DAYS) status = applied > 0 ? "partial" : "due_soon";
    else status = applied > 0 ? "partial" : "pending";
    return { n: i + 1, date, amount, paid: round2(applied), remaining: Math.max(0, remaining), status };
  });

  const pending = round2(Math.max(0, totalToPay - paid));
  const overdue = schedule.filter((s) => s.status === "overdue");
  const next = schedule.find((s) => s.remaining > 0) ?? null;
  const cancelled = o.status === "cancelled";

  let state: ObligationState;
  if (cancelled) state = "cancelled";
  else if (pending <= 0.005) state = "paid";
  else if (overdue.length) state = "overdue";
  else if (next && diffDays(next.date, today) <= DUE_SOON_DAYS) state = "due_soon";
  else state = "current";

  return {
    obligation: o,
    schedule,
    totalToPay,
    paid,
    pending,
    paidPct: totalToPay > 0 ? Math.min(100, (paid / totalToPay) * 100) : 0,
    installmentsPaid: schedule.filter((s) => s.status === "paid").length,
    next: state === "paid" || cancelled ? null : next,
    overdueAmount: round2(overdue.reduce((s, i) => s + i.remaining, 0)),
    overdueCount: overdue.length,
    state,
    lastDueDate: dates[dates.length - 1],
  };
}

export interface UpcomingPayment {
  obligationId: string;
  creditor: string;
  concept: string;
  n: number;
  of: number;
  date: ISODate;
  /** Por pagar de esa cuota, en moneda base. */
  amount: number;
  status: InstallmentStatus;
}

export interface GroupRow {
  key: string;
  label: string;
  pending: number;
  count: number;
}

export interface Portfolio {
  totalDebt: number;
  paid: number;
  pending: number;
  paidPct: number;
  overdueAmount: number;
  overdueCount: number;
  soonAmount: number;
  soonCount: number;
  activeCount: number;
  paidCount: number;
  byCreditor: GroupRow[];
  byKind: GroupRow[];
  byClass: GroupRow[];
  upcoming: UpcomingPayment[];
}

/**
 * Consolida todas las obligaciones en moneda base.
 * `soonDays`: ventana de "próximas a vencer" para el tablero.
 */
export function buildPortfolio(
  list: ObligationSummary[],
  toBase: (v: number, c: Currency) => number,
  today: ISODate,
  horizonEnd: ISODate,
  soonDays = 30,
): Portfolio {
  const live = list.filter((s) => s.state !== "cancelled");
  const open = live.filter((s) => s.state !== "paid");
  const soonLimit = addDays(today, soonDays);

  const group = (keyOf: (s: ObligationSummary) => [string, string]) => {
    const m = new Map<string, GroupRow>();
    for (const s of open) {
      const [key, label] = keyOf(s);
      const r = m.get(key) ?? { key, label, pending: 0, count: 0 };
      r.pending += toBase(s.pending, s.obligation.currency);
      r.count += 1;
      m.set(key, r);
    }
    return [...m.values()].sort((a, b) => b.pending - a.pending);
  };

  const upcoming: UpcomingPayment[] = [];
  let overdueAmount = 0;
  let overdueCount = 0;
  let soonAmount = 0;
  let soonCount = 0;
  for (const s of open) {
    const c = s.obligation.currency;
    for (const i of s.schedule) {
      if (i.remaining <= 0) continue;
      const amt = toBase(i.remaining, c);
      if (i.status === "overdue") {
        overdueAmount += amt;
        overdueCount += 1;
      } else if (i.date <= soonLimit) {
        soonAmount += amt;
        soonCount += 1;
      }
      if (i.status === "overdue" || i.date <= horizonEnd)
        upcoming.push({
          obligationId: s.obligation.id,
          creditor: s.obligation.creditor,
          concept: s.obligation.concept,
          n: i.n,
          of: s.schedule.length,
          date: i.date,
          amount: amt,
          status: i.status,
        });
    }
  }
  upcoming.sort((a, b) => (a.date === b.date ? b.amount - a.amount : a.date < b.date ? -1 : 1));

  const totalDebt = live.reduce((s, x) => s + toBase(x.totalToPay, x.obligation.currency), 0);
  const paid = live.reduce((s, x) => s + toBase(Math.min(x.paid, x.totalToPay), x.obligation.currency), 0);
  const pending = open.reduce((s, x) => s + toBase(x.pending, x.obligation.currency), 0);

  return {
    totalDebt,
    paid,
    pending,
    paidPct: totalDebt > 0 ? Math.min(100, (paid / totalDebt) * 100) : 0,
    overdueAmount,
    overdueCount,
    soonAmount,
    soonCount,
    activeCount: open.length,
    paidCount: live.length - open.length,
    byCreditor: group((s) => [s.obligation.creditor.trim().toLowerCase(), s.obligation.creditor.trim()]),
    byKind: group((s) => [s.obligation.kind, OBLIGATION_KIND_LABELS[s.obligation.kind]]),
    byClass: group((s) => [s.obligation.class_id ?? "none", s.obligation.class_name ?? UNCLASSIFIED]),
    upcoming,
  };
}
