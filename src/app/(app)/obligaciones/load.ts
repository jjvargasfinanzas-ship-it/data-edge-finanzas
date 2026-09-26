import "server-only";
import { getContext, getObligations } from "@/lib/data";
import { addDays } from "@/lib/dates";
import { convert, type Currency } from "@/lib/money";
import { buildPortfolio, type ObligationState, type ObligationSummary } from "@/lib/obligations";

export const HORIZONS = [30, 90, 180, 365] as const;

/** Orden de prioridad: primero lo vencido y lo que vence pronto. */
const STATE_ORDER: Record<ObligationState, number> = { overdue: 0, due_soon: 1, current: 2, paid: 3, cancelled: 4 };
export const byPriority = (a: ObligationSummary, b: ObligationSummary) =>
  STATE_ORDER[a.state] - STATE_ORDER[b.state] || (a.next?.date ?? "9999").localeCompare(b.next?.date ?? "9999");

export async function loadObligations(horizonDays = 90) {
  const [{ today, currency }, { items, rates }] = await Promise.all([getContext(), getObligations()]);
  const toBase = (v: number, c: Currency) => convert(v, c, currency, rates);
  const summaries = items.map((i) => i.summary);
  const portfolio = buildPortfolio(summaries, toBase, today, addDays(today, horizonDays));
  return { today, currency, items, summaries, portfolio, toBase };
}
