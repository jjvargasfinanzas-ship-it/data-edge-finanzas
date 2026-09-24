import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { addDays, endOfMonth, todayInTz, type ISODate } from "./dates";
import { buildRateTable, convert, type Currency, type RateTable } from "./money";
import { projectCashflow, type AccountLite, type Settlement } from "./cashflow";
import { buildPlanRows, summarizePlan } from "./month-plan";

export type Profile = Tables<"profiles">;
export type Account = Tables<"accounts"> & { balance: number };
export type Category = Tables<"categories">;
export type PlannedItem = Tables<"planned_items">;
export type Transaction = Tables<"transactions">;
export type CalendarEvent = Tables<"calendar_events">;

/** Usuario autenticado + perfil. Redirige a /login si no hay sesión. */
export const getContext = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profile) redirect("/login");

  const tz = profile.timezone || "America/Bogota";
  return {
    supabase,
    userId,
    profile,
    tz,
    today: todayInTz(tz),
    currency: profile.base_currency as Currency,
  };
});

export const getAccounts = cache(async (): Promise<Account[]> => {
  const { supabase } = await getContext();
  const [{ data: accounts }, { data: balances }] = await Promise.all([
    supabase.from("accounts").select("*").order("sort_order").order("created_at"),
    supabase.from("account_balances").select("account_id, balance"),
  ]);
  const map = new Map((balances ?? []).map((b) => [b.account_id, Number(b.balance ?? 0)]));
  return (accounts ?? []).map((a) => ({ ...a, balance: map.get(a.id) ?? Number(a.opening_balance) }));
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const { supabase } = await getContext();
  const { data } = await supabase.from("categories").select("*").order("sort_order").order("name");
  return data ?? [];
});

export const getRates = cache(async (): Promise<RateTable> => {
  const { supabase } = await getContext();
  const { data } = await supabase
    .from("exchange_rates")
    .select("base, quote, rate, rate_date, user_id")
    .order("rate_date", { ascending: false })
    .limit(200);
  return buildRateTable(data ?? []);
});

export const getPlanned = cache(async (): Promise<PlannedItem[]> => {
  const { supabase } = await getContext();
  const { data } = await supabase.from("planned_items").select("*").order("start_date");
  return data ?? [];
});

/**
 * Lo registrado contra cada ocurrencia programada (suma de pagos, en la moneda
 * de la cuenta del programado) y su estado manual (cerrada / omitida).
 */
export async function getSettlements(from: ISODate, to: ISODate): Promise<Settlement[]> {
  const { supabase } = await getContext();
  const [{ data: txs }, { data: statuses }, planned, accounts, rates] = await Promise.all([
    supabase
      .from("transactions")
      .select("planned_item_id, planned_date, amount, account_id")
      .not("planned_item_id", "is", null)
      .gte("planned_date", from)
      .lte("planned_date", to),
    supabase
      .from("planned_occurrence_status")
      .select("planned_item_id, planned_date, status")
      .gte("planned_date", from)
      .lte("planned_date", to),
    getPlanned(),
    getAccounts(),
    getRates(),
  ]);
  const accCur = new Map(accounts.map((a) => [a.id, a.currency]));
  const itemCur = new Map(planned.map((p) => [p.id, accCur.get(p.account_id) ?? "COP"]));
  const map = new Map<string, Settlement>();
  const get = (id: string, d: string) => {
    const k = `${id}|${d}`;
    let s = map.get(k);
    if (!s) {
      s = { planned_item_id: id, planned_date: d, received: 0, status: null };
      map.set(k, s);
    }
    return s;
  };
  for (const t of txs ?? []) {
    if (!t.planned_item_id || !t.planned_date) continue;
    const s = get(t.planned_item_id, t.planned_date);
    const from = accCur.get(t.account_id) ?? "COP";
    const to = itemCur.get(t.planned_item_id) ?? from;
    s.received += convert(Number(t.amount), from, to, rates);
  }
  for (const st of statuses ?? []) {
    get(st.planned_item_id, st.planned_date).status = st.status as Settlement["status"];
  }
  return [...map.values()];
}

export function toAccountLite(a: Account): AccountLite {
  return {
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: a.balance,
    due_day: a.due_day,
    is_archived: a.is_archived,
  };
}

/** Proyección de flujo de caja desde hoy hasta `horizonEnd`. */
export const getCashflow = cache(async (horizonEnd: ISODate) => {
  const { today, currency } = await getContext();
  const [accounts, planned, rates, settlements] = await Promise.all([
    getAccounts(),
    getPlanned(),
    getRates(),
    getSettlements(addDays(today, -40), horizonEnd),
  ]);
  return projectCashflow({
    accounts: accounts.map(toAccountLite),
    planned,
    settlements,
    rates,
    baseCurrency: currency,
    today,
    horizonEnd,
  });
});

/** Totales del mes por tipo, en moneda base. Excluye transferencias. */
export async function getMonthTotals(from: ISODate, to: ISODate) {
  const { supabase, currency } = await getContext();
  const [accounts, rates] = await Promise.all([getAccounts(), getRates()]);
  const accCur = new Map(accounts.map((a) => [a.id, a.currency]));
  const { data } = await supabase
    .from("transactions")
    .select("kind, amount, account_id, category_id, date")
    .in("kind", ["income", "expense"])
    .gte("date", from)
    .lte("date", to)
    .limit(10000);

  let income = 0;
  let expense = 0;
  const byCategory = new Map<string | null, number>();
  for (const t of data ?? []) {
    const v = convert(Number(t.amount), accCur.get(t.account_id) ?? currency, currency, rates);
    if (t.kind === "income") income += v;
    else {
      expense += v;
      byCategory.set(t.category_id, (byCategory.get(t.category_id) ?? 0) + v);
    }
  }
  return { income, expense, savings: income - expense, byCategory, count: data?.length ?? 0 };
}

export function monthRange(month: string) {
  const from = `${month}-01`;
  return { from, to: endOfMonth(from) };
}

/**
 * Programado vs. real del periodo: filas por ocurrencia + resúmenes en moneda base
 * + lo registrado sin programar (ingresos y gastos "no programados").
 */
export const getPeriodPlan = cache(async (from: ISODate, to: ISODate) => {
  const { supabase, today, currency } = await getContext();
  const [planned, settlements, accounts, rates, unplannedRes] = await Promise.all([
    getPlanned(),
    getSettlements(from, to),
    getAccounts(),
    getRates(),
    supabase
      .from("transactions")
      .select("kind, amount, account_id")
      .in("kind", ["income", "expense"])
      .is("planned_item_id", null)
      .gte("date", from)
      .lte("date", to)
      .limit(10000),
  ]);
  const accCur = new Map(accounts.map((a) => [a.id, a.currency]));
  const rows = buildPlanRows({ planned, settlements, from, to, today });
  const toBase = (v: number, r: { accountId: string }) => convert(v, accCur.get(r.accountId) ?? currency, currency, rates);
  let unplannedIncome = 0;
  let unplannedExpense = 0;
  for (const t of unplannedRes.data ?? []) {
    const v = convert(Number(t.amount), accCur.get(t.account_id) ?? currency, currency, rates);
    if (t.kind === "income") unplannedIncome += v;
    else unplannedExpense += v;
  }
  return {
    rows,
    income: summarizePlan(rows, "income", toBase),
    expense: summarizePlan(rows, "expense", toBase),
    unplannedIncome,
    unplannedExpense,
  };
});
