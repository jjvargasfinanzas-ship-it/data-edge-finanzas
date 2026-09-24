import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";
import { addDays, endOfMonth, todayInTz, type ISODate } from "./dates";
import { buildRateTable, convert, type Currency, type RateTable } from "./money";
import { projectCashflow, type AccountLite } from "./cashflow";

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

/** Referencias de programados ya registrados en una ventana de fechas. */
async function getRegistered(from: ISODate, to: ISODate) {
  const { supabase } = await getContext();
  const { data } = await supabase
    .from("transactions")
    .select("planned_item_id, planned_date")
    .not("planned_item_id", "is", null)
    .gte("planned_date", from)
    .lte("planned_date", to);
  return data ?? [];
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
  const [accounts, planned, rates, registered] = await Promise.all([
    getAccounts(),
    getPlanned(),
    getRates(),
    getRegistered(addDays(today, -40), horizonEnd),
  ]);
  return projectCashflow({
    accounts: accounts.map(toAccountLite),
    planned,
    registered,
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
