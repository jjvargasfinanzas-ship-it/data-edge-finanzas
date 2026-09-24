import type { Enums, Tables } from "@/lib/supabase/database.types";

export type Currency = Enums<"currency_code">;
export const CURRENCIES: Currency[] = ["COP", "USD", "EUR", "MXN", "GBP"];

export const CURRENCY_LABELS: Record<Currency, string> = {
  COP: "Peso colombiano",
  USD: "Dólar estadounidense",
  EUR: "Euro",
  MXN: "Peso mexicano",
  GBP: "Libra esterlina",
};

const DECIMALS: Record<Currency, number> = { COP: 0, USD: 2, EUR: 2, MXN: 2, GBP: 2 };

const cache = new Map<string, Intl.NumberFormat>();
function nf(currency: Currency, compact: boolean): Intl.NumberFormat {
  const key = `${currency}-${compact}`;
  let f = cache.get(key);
  if (!f) {
    f = new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency,
      currencyDisplay: currency === "COP" ? "narrowSymbol" : "symbol",
      notation: compact ? "compact" : "standard",
      minimumFractionDigits: compact ? 0 : DECIMALS[currency],
      maximumFractionDigits: compact ? 1 : DECIMALS[currency],
    });
    cache.set(key, f);
  }
  return f;
}

/**
 * Formato compacto propio (igual en servidor y navegador, sin depender de ICU):
 * 154.200 → "$ 154 mil", 1.850.000 → "$ 1,9 M", 2.300.000.000 → "$ 2.300 M".
 */
function compact(abs: number, currency: Currency): string {
  const prefix = currency === "COP" ? "$" : currency;
  const dec = (n: number, d: number) => {
    const [i, f] = n.toFixed(d).split(".");
    const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return f && Number(f) !== 0 ? `${int},${f.replace(/0+$/, "")}` : int;
  };
  if (abs >= 1e6) return `${prefix} ${dec(abs / 1e6, abs >= 1e8 ? 0 : 1)} M`;
  if (abs >= 1e3) return `${prefix} ${dec(abs / 1e3, 0)} mil`;
  return `${prefix} ${dec(abs, currency === "COP" ? 0 : 2)}`;
}

export function formatMoney(
  amount: number,
  currency: Currency = "COP",
  opts: { compact?: boolean; signed?: boolean } = {},
): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const s = opts.compact ? compact(Math.abs(value), currency) : nf(currency, false).format(Math.abs(value));
  if (value < 0) return `−${s}`;
  if (opts.signed && value > 0) return `+${s}`;
  return s;
}

export function formatPct(value: number | null, opts: { signed?: boolean; digits?: number } = {}): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const s = new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: opts.digits ?? 1,
    minimumFractionDigits: 0,
  }).format(Math.abs(value));
  const sign = value < 0 ? "−" : opts.signed && value > 0 ? "+" : "";
  return `${sign}${s}%`;
}

/** Variación porcentual; null cuando no hay base de comparación. */
export function pctChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

/**
 * Convierte texto escrito por el usuario en número.
 * Acepta formato colombiano: "8.500.000", "45000", "1.234,56", "$ 20.000".
 */
export function parseAmountInput(raw: string): number {
  let s = String(raw ?? "").replace(/[^\d.,-]/g, "");
  if (!s) return NaN;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = s.split(".");
    // "1.5" o "12.50" → decimal; "45.000" o "1.200.000" → miles
    if (parts.length === 2 && parts[1].length !== 3) {
      // decimal
    } else {
      s = s.replace(/\./g, "");
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

/** Tasas hacia COP: 1 unidad de la moneda = X COP. */
export type RateTable = Record<Currency, number>;

type RateRow = Pick<Tables<"exchange_rates">, "base" | "quote" | "rate" | "rate_date" | "user_id">;

/** Toma la tasa más reciente por moneda; la tasa manual del usuario prevalece en empate de fecha. */
export function buildRateTable(rows: RateRow[]): RateTable {
  const table: RateTable = { COP: 1, USD: NaN, EUR: NaN, MXN: NaN, GBP: NaN };
  const best: Partial<Record<Currency, RateRow>> = {};
  for (const r of rows) {
    if (r.quote !== "COP") continue;
    const cur = best[r.base];
    if (
      !cur ||
      r.rate_date > cur.rate_date ||
      (r.rate_date === cur.rate_date && r.user_id && !cur.user_id)
    ) {
      best[r.base] = r;
    }
  }
  for (const c of CURRENCIES) {
    if (c !== "COP" && best[c]) table[c] = Number(best[c]!.rate);
  }
  return table;
}

export function convert(amount: number, from: Currency, to: Currency, rates: RateTable): number {
  if (from === to) return amount;
  const inCop = amount * rates[from];
  const out = inCop / rates[to];
  return Number.isFinite(out) ? out : 0;
}
