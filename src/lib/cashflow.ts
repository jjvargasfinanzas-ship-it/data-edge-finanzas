/**
 * Motor de flujo de caja futuro.
 *
 * Parte del saldo disponible hoy (cuentas líquidas) y proyecta día a día
 * con los programados (ingresos, gastos, pagos, transferencias) y el pago
 * estimado de las tarjetas de crédito.
 *
 * Reglas de efecto en caja:
 * - Cuentas líquidas: ahorros, corriente, efectivo y billeteras digitales.
 * - Ingreso a una cuenta líquida suma; gasto desde una cuenta líquida resta.
 * - Gasto cargado a tarjeta no mueve caja hoy: se refleja en el pago de la tarjeta.
 * - Transferencia de líquida a no líquida (tarjeta, inversión) resta;
 *   de no líquida a líquida suma; entre líquidas no cambia el total.
 * - Tarjeta con deuda y sin pago programado antes de su fecha límite:
 *   se proyecta el pago total de la deuda en su próxima fecha de pago.
 * - Programados vencidos (últimos 45 días) sin registrar se muestran hoy como pendientes.
 */
import { addDays, monthKey, startOfWeek, type ISODate } from "./dates";
import { convert, type Currency, type RateTable } from "./money";
import { lastOccurrenceBefore, nextDayOfMonth, occurrencesBetween, type Frequency } from "./recurrence";
import type { Enums } from "./supabase/database.types";

export type AccountType = Enums<"account_type">;
export type TxKind = Enums<"transaction_kind">;

export const LIQUID_TYPES: AccountType[] = ["bank_savings", "bank_checking", "cash", "digital_wallet"];
export const isLiquid = (t: AccountType) => LIQUID_TYPES.includes(t);

export interface AccountLite {
  id: string;
  name: string;
  type: AccountType;
  currency: Currency;
  balance: number;
  due_day: number | null;
  is_archived: boolean;
}

export interface PlannedLite {
  id: string;
  kind: TxKind;
  name: string;
  amount: number;
  account_id: string;
  to_account_id: string | null;
  category_id: string | null;
  frequency: Frequency;
  start_date: ISODate;
  end_date: ISODate | null;
  is_active: boolean;
  /** Fecha de creación: las ocurrencias pasadas anteriores a ella no quedan pendientes */
  created_at?: string;
}

/** Lo ya registrado (y su estado manual) para una ocurrencia programada. */
export interface Settlement {
  planned_item_id: string;
  planned_date: ISODate;
  /** Suma registrada, en la moneda de la cuenta del programado */
  received: number;
  status: "closed" | "skipped" | null;
}

/** Estado de una ocurrencia pendiente. */
export type PendingState = "overdue" | "today" | "upcoming" | "partial";

export type FlowType = "income" | "expense" | "payment" | "transfer" | "card_estimate";

export interface Occurrence {
  key: string;
  date: ISODate; // fecha efectiva (vencidos → hoy)
  state: PendingState;
  /** Monto programado original */
  plannedAmount: number;
  /** Ya registrado (parciales) */
  receivedAmount: number;
  dueDate: ISODate; // fecha original
  overdue: boolean;
  name: string;
  plannedItemId: string | null;
  kind: TxKind;
  flow: FlowType;
  /** Monto pendiente, en la moneda de la cuenta origen */
  amount: number;
  currency: Currency;
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
  /** Efecto en caja disponible, en moneda base (positivo entra, negativo sale, 0 no mueve caja) */
  cashEffect: number;
}

export interface CashflowDay {
  date: ISODate;
  opening: number;
  inflow: number;
  outflow: number;
  closing: number;
  items: Occurrence[];
}

export interface CashflowBucket {
  key: string; // fecha de inicio del periodo
  label: string;
  from: ISODate;
  to: ISODate;
  opening: number;
  inflow: number;
  outflow: number;
  closing: number;
}

export interface CashflowResult {
  startBalance: number;
  endBalance: number;
  totalInflow: number;
  totalOutflow: number;
  minBalance: number;
  minDate: ISODate;
  firstNegativeDate: ISODate | null;
  days: CashflowDay[];
  occurrences: Occurrence[]; // incluye movimientos sin efecto en caja (para calendario)
}

interface Params {
  accounts: AccountLite[];
  planned: PlannedLite[];
  settlements: Settlement[];
  rates: RateTable;
  baseCurrency: Currency;
  today: ISODate;
  horizonEnd: ISODate;
  overdueLookbackDays?: number;
}

/** Expande los programados en ocurrencias con su efecto en caja. */
export function expandPlanned(p: Params): Occurrence[] {
  const lookback = p.overdueLookbackDays ?? 45;
  const from = addDays(p.today, -lookback);
  const accounts = new Map(p.accounts.map((a) => [a.id, a]));
  const settled = new Map(p.settlements.map((x) => [`${x.planned_item_id}|${x.planned_date}`, x]));
  const out: Occurrence[] = [];

  for (const item of p.planned) {
    if (!item.is_active) continue;
    const acc = accounts.get(item.account_id);
    if (!acc) continue;
    const to = item.to_account_id ? accounts.get(item.to_account_id) : undefined;

    const createdOn = item.created_at?.slice(0, 10);
    const keepBefore = createdOn ? lastOccurrenceBefore(item, createdOn, from) : null;
    for (const d of occurrencesBetween(item, from, p.horizonEnd)) {
      if (createdOn && d < createdOn && d < p.today && d !== keepBefore) continue;
      const st = settled.get(`${item.id}|${d}`);
      if (st?.status) continue; // cerrada u omitida
      const received = st?.received ?? 0;
      const pending = Math.round((item.amount - received) * 100) / 100;
      if (pending <= 0) continue; // ya recibida/pagada completa
      const overdue = d < p.today;
      const state: PendingState = received > 0 ? "partial" : overdue ? "overdue" : d === p.today ? "today" : "upcoming";
      const base = convert(pending, acc.currency, p.baseCurrency, p.rates);
      let cashEffect = 0;
      let flow: FlowType = item.kind === "income" ? "income" : item.kind === "expense" ? "expense" : "transfer";

      if (item.kind === "income") {
        cashEffect = isLiquid(acc.type) ? base : 0;
      } else if (item.kind === "expense") {
        cashEffect = isLiquid(acc.type) ? -base : 0;
      } else if (to) {
        const fromL = isLiquid(acc.type);
        const toL = isLiquid(to.type);
        if (fromL && !toL) cashEffect = -base;
        else if (!fromL && toL) cashEffect = base;
        if (to.type === "credit_card") flow = "payment";
      }

      out.push({
        key: `${item.id}|${d}`,
        date: overdue ? p.today : d,
        state,
        plannedAmount: item.amount,
        receivedAmount: received,
        dueDate: d,
        overdue,
        name: item.name,
        plannedItemId: item.id,
        kind: item.kind,
        flow,
        amount: pending,
        currency: acc.currency,
        accountId: acc.id,
        toAccountId: item.to_account_id,
        categoryId: item.category_id,
        cashEffect,
      });
    }
  }

  // Pago estimado de tarjetas sin pago programado antes de la fecha límite
  for (const card of p.accounts) {
    if (card.type !== "credit_card" || card.is_archived || !card.due_day || card.balance >= 0) continue;
    const due = nextDayOfMonth(card.due_day, p.today);
    if (due > p.horizonEnd) continue;
    const hasPayment = out.some((o) => o.toAccountId === card.id && o.dueDate <= due);
    if (hasPayment) continue;
    const debt = -card.balance;
    out.push({
      key: `card|${card.id}|${due}`,
      date: due,
      state: due === p.today ? "today" : "upcoming",
      plannedAmount: debt,
      receivedAmount: 0,
      dueDate: due,
      overdue: false,
      name: `Pago tarjeta ${card.name}`,
      plannedItemId: null,
      kind: "transfer",
      flow: "card_estimate",
      amount: debt,
      currency: card.currency,
      accountId: card.id,
      toAccountId: card.id,
      categoryId: null,
      cashEffect: -convert(debt, card.currency, p.baseCurrency, p.rates),
    });
  }

  out.sort((a, b) => (a.date === b.date ? b.cashEffect - a.cashEffect : a.date < b.date ? -1 : 1));
  return out;
}

export function projectCashflow(p: Params): CashflowResult {
  const occurrences = expandPlanned(p);
  const startBalance = p.accounts
    .filter((a) => !a.is_archived && isLiquid(a.type))
    .reduce((s, a) => s + convert(a.balance, a.currency, p.baseCurrency, p.rates), 0);

  const byDate = new Map<ISODate, Occurrence[]>();
  for (const o of occurrences) {
    if (!byDate.has(o.date)) byDate.set(o.date, []);
    byDate.get(o.date)!.push(o);
  }

  const days: CashflowDay[] = [];
  let running = startBalance;
  let minBalance = startBalance;
  let minDate = p.today;
  let firstNegativeDate: ISODate | null = startBalance < 0 ? p.today : null;
  let totalInflow = 0;
  let totalOutflow = 0;

  for (let d = p.today; d <= p.horizonEnd; d = addDays(d, 1)) {
    const items = byDate.get(d) ?? [];
    const inflow = items.reduce((s, o) => s + Math.max(0, o.cashEffect), 0);
    const outflow = items.reduce((s, o) => s + Math.max(0, -o.cashEffect), 0);
    const opening = running;
    running = opening + inflow - outflow;
    totalInflow += inflow;
    totalOutflow += outflow;
    if (running < minBalance) {
      minBalance = running;
      minDate = d;
    }
    if (running < 0 && !firstNegativeDate) firstNegativeDate = d;
    days.push({ date: d, opening, inflow, outflow, closing: running, items });
  }

  return {
    startBalance,
    endBalance: running,
    totalInflow,
    totalOutflow,
    minBalance,
    minDate,
    firstNegativeDate,
    days,
    occurrences,
  };
}

/** Agrupa los días en semanas (lunes) o meses. */
export function bucketize(days: CashflowDay[], by: "week" | "month", labeler: (from: ISODate) => string): CashflowBucket[] {
  const buckets: CashflowBucket[] = [];
  for (const d of days) {
    const key = by === "week" ? startOfWeek(d.date) : monthKey(d.date);
    let b = buckets[buckets.length - 1];
    if (!b || b.key !== key) {
      b = { key, label: labeler(d.date), from: d.date, to: d.date, opening: d.opening, inflow: 0, outflow: 0, closing: d.closing };
      buckets.push(b);
    }
    b.to = d.date;
    b.inflow += d.inflow;
    b.outflow += d.outflow;
    b.closing = d.closing;
  }
  return buckets;
}
