import type { Enums } from "@/lib/supabase/database.types";
import { addDays, addMonthsClamped, daysInMonth, fromISO, toISO, type ISODate } from "./dates";

export type Frequency = Enums<"frequency">;

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  once: "Único",
  weekly: "Semanal",
  biweekly: "Cada 14 días",
  semimonthly: "Quincenal (15 y fin de mes)",
  monthly: "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  yearly: "Anual",
};

const MONTH_STEP: Partial<Record<Frequency, number>> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semiannual: 6,
  yearly: 12,
};

export interface Recurring {
  frequency: Frequency;
  start_date: ISODate;
  end_date?: ISODate | null;
}

/**
 * Devuelve las fechas en que ocurre un elemento recurrente dentro de [from, to].
 * - Mensual y superiores conservan el día de la fecha inicial (31 → último día del mes).
 * - Quincenal: día 15 y último día de cada mes, desde la fecha inicial.
 */
export function occurrencesBetween(item: Recurring, from: ISODate, to: ISODate, max = 1000): ISODate[] {
  const out: ISODate[] = [];
  const last = item.end_date && item.end_date < to ? item.end_date : to;
  const start = item.start_date;
  if (start > last || from > last) return out;

  const push = (d: ISODate) => {
    if (d >= from && d <= last && d >= start) out.push(d);
  };

  switch (item.frequency) {
    case "once":
      push(start);
      break;

    case "weekly":
    case "biweekly": {
      const step = item.frequency === "weekly" ? 7 : 14;
      let d = start;
      if (d < from) {
        const skip = Math.floor((fromISO(from).getTime() - fromISO(d).getTime()) / 86_400_000 / step);
        d = addDays(d, skip * step);
      }
      for (let i = 0; d <= last && i < max; i++, d = addDays(d, step)) push(d);
      break;
    }

    case "semimonthly": {
      const s = fromISO(start < from ? from : start);
      let y = s.getUTCFullYear();
      let m = s.getUTCMonth();
      for (let i = 0; i < max; i++) {
        const mid = toISO(new Date(Date.UTC(y, m, 15)));
        const end = toISO(new Date(Date.UTC(y, m, daysInMonth(y, m))));
        if (mid > last) break;
        push(mid);
        push(end);
        m++;
        if (m === 12) {
          m = 0;
          y++;
        }
      }
      break;
    }

    default: {
      const step = MONTH_STEP[item.frequency]!;
      const anchor = fromISO(start).getUTCDate();
      let n = 0;
      if (start < from) {
        const s = fromISO(start);
        const f = fromISO(from);
        const months = (f.getUTCFullYear() - s.getUTCFullYear()) * 12 + f.getUTCMonth() - s.getUTCMonth();
        n = Math.max(0, Math.floor(months / step) - 1);
      }
      for (let i = 0; i < max; i++, n++) {
        const d = addMonthsClamped(start, n * step, anchor);
        if (d > last) break;
        push(d);
      }
    }
  }
  return out;
}

/** Próxima fecha con día fijo del mes (p. ej. pago de tarjeta el día 5), en o después de `from`. */
export function nextDayOfMonth(day: number, from: ISODate): ISODate {
  const f = fromISO(from);
  const y = f.getUTCFullYear();
  const m = f.getUTCMonth();
  const thisMonth = toISO(new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m)))));
  if (thisMonth >= from) return thisMonth;
  return addMonthsClamped(`${y}-${String(m + 1).padStart(2, "0")}-01`, 1, day);
}

/** Veces por mes que ocurre algo con esta frecuencia (para equivalente mensual). */
export const MONTHLY_FACTOR: Record<Frequency, number> = {
  once: 0,
  weekly: 52 / 12,
  biweekly: 26 / 12,
  semimonthly: 2,
  monthly: 1,
  bimonthly: 1 / 2,
  quarterly: 1 / 3,
  semiannual: 1 / 6,
  yearly: 1 / 12,
};

/** Próxima ocurrencia en o después de `from`, o null si ya terminó. */
export function nextOccurrence(item: Recurring, from: ISODate): ISODate | null {
  const horizon = addMonthsClamped(from, 13);
  return occurrencesBetween(item, from, horizon, 2)[0] ?? null;
}
