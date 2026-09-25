/**
 * Flujo real: solo movimientos registrados (ya ocurridos) sobre las cuentas
 * líquidas (bancos, efectivo, billeteras). Reconstruye el saldo de cada día
 * hacia atrás desde el saldo real de hoy.
 */
import { addDays, type ISODate } from "./dates";
import { isLiquid, type AccountLite } from "./cashflow";
import { convert, type Currency, type RateTable } from "./money";

export interface RealTx {
  id: string;
  date: ISODate;
  kind: "income" | "expense" | "transfer";
  amount: number;
  to_amount: number | null;
  account_id: string;
  to_account_id: string | null;
}

export interface RealMove {
  tx: RealTx;
  /** efecto en caja disponible (moneda base) */
  effect: number;
}

export interface RealDay {
  date: ISODate;
  opening: number;
  inflow: number;
  outflow: number;
  closing: number;
  moves: RealMove[];
}

export function cashEffect(t: RealTx, accounts: Map<string, AccountLite>, base: Currency, rates: RateTable): number {
  const a = accounts.get(t.account_id);
  if (!a) return 0;
  const from = isLiquid(a.type);
  if (t.kind === "income") return from ? convert(t.amount, a.currency, base, rates) : 0;
  if (t.kind === "expense") return from ? -convert(t.amount, a.currency, base, rates) : 0;
  const to = t.to_account_id ? accounts.get(t.to_account_id) : undefined;
  const toL = to ? isLiquid(to.type) : false;
  if (from && !toL) return -convert(t.amount, a.currency, base, rates);
  if (!from && toL && to) return convert(t.to_amount ?? t.amount, to.currency, base, rates);
  return 0;
}

/**
 * @param currentBalance saldo líquido real de hoy (moneda base)
 * @param txs movimientos con fecha entre `from` y `today` (inclusive)
 */
export function buildRealFlow(p: {
  accounts: AccountLite[];
  txs: RealTx[];
  currentBalance: number;
  from: ISODate;
  to: ISODate; // último día a mostrar (≤ hoy)
  today: ISODate;
  baseCurrency: Currency;
  rates: RateTable;
}) {
  const acc = new Map(p.accounts.map((a) => [a.id, a]));
  const moves = p.txs
    .filter((t) => t.date >= p.from && t.date <= p.today)
    .map((tx) => ({ tx, effect: cashEffect(tx, acc, p.baseCurrency, p.rates) }));
  const totalSinceFrom = moves.reduce((s, m) => s + m.effect, 0);
  const opening = p.currentBalance - totalSinceFrom;

  const byDate = new Map<ISODate, RealMove[]>();
  for (const m of moves) {
    if (!byDate.has(m.tx.date)) byDate.set(m.tx.date, []);
    byDate.get(m.tx.date)!.push(m);
  }
  const days: RealDay[] = [];
  let running = opening;
  let inflow = 0;
  let outflow = 0;
  for (let d = p.from; d <= p.to; d = addDays(d, 1)) {
    const list = byDate.get(d) ?? [];
    const inc = list.reduce((s, m) => s + Math.max(0, m.effect), 0);
    const out = list.reduce((s, m) => s + Math.max(0, -m.effect), 0);
    const o = running;
    running = o + inc - out;
    inflow += inc;
    outflow += out;
    days.push({ date: d, opening: o, inflow: inc, outflow: out, closing: running, moves: list });
  }
  return { opening, closing: running, inflow, outflow, days };
}
