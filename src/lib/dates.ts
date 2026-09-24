/**
 * Fechas como texto ISO "YYYY-MM-DD" (fechas calendario, sin hora).
 * Toda la aritmética se hace en UTC para evitar corrimientos por zona horaria.
 */

export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toISO(d: Date): ISODate {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Fecha de hoy en la zona horaria del usuario. */
export function todayInTz(timeZone = "America/Bogota"): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Hora actual (0-23) en la zona horaria del usuario. */
export function hourInTz(timeZone = "America/Bogota"): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(new Date()),
  );
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** Suma meses conservando el día; si no existe (31 → feb) usa el último día del mes. */
export function addMonthsClamped(iso: ISODate, n: number, anchorDay?: number): ISODate {
  const d = fromISO(iso);
  const day = anchorDay ?? d.getUTCDate();
  const total = d.getUTCFullYear() * 12 + d.getUTCMonth() + n;
  const y = Math.floor(total / 12);
  const m = total % 12;
  return toISO(new Date(Date.UTC(y, m, Math.min(day, daysInMonth(y, m)))));
}

export function startOfMonth(iso: ISODate): ISODate {
  return iso.slice(0, 7) + "-01";
}

export function endOfMonth(iso: ISODate): ISODate {
  const d = fromISO(iso);
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}

/** Lunes de la semana de la fecha. */
export function startOfWeek(iso: ISODate): ISODate {
  const d = fromISO(iso);
  const dow = (d.getUTCDay() + 6) % 7; // 0 = lunes
  return addDays(iso, -dow);
}

export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((fromISO(a).getTime() - fromISO(b).getTime()) / 86_400_000);
}

export function monthKey(iso: ISODate): string {
  return iso.slice(0, 7);
}

export function isValidISODate(s: unknown): s is ISODate {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(fromISO(s)) === s;
}

export function isValidMonth(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
function fmt(opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(opts);
  let f = fmtCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat("es-CO", { ...opts, timeZone: "UTC" });
    fmtCache.set(key, f);
  }
  return f;
}

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const WEEKDAYS_SHORT = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** "24 sep" (formato propio: idéntico en servidor y navegador) */
export function formatShort(iso: ISODate): string {
  const d = fromISO(iso);
  return `${d.getUTCDate()} ${MONTHS_SHORT[d.getUTCMonth()]}`;
}

export function monthShort(iso: ISODate): string {
  return MONTHS_SHORT[fromISO(iso).getUTCMonth()];
}

/** "jueves, 24 de septiembre" */
export function formatLong(iso: ISODate): string {
  return fmt({ weekday: "long", day: "numeric", month: "long" }).format(fromISO(iso));
}

/** "24 sep 2026" */
export function formatMedium(iso: ISODate): string {
  return `${formatShort(iso)} ${iso.slice(0, 4)}`;
}

/** "septiembre de 2026" */
export function formatMonth(isoOrMonth: string): string {
  const iso = isoOrMonth.length === 7 ? isoOrMonth + "-01" : isoOrMonth;
  const s = fmt({ month: "long", year: "numeric" }).format(fromISO(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "jue" */
export function formatWeekdayShort(iso: ISODate): string {
  return WEEKDAYS_SHORT[fromISO(iso).getUTCDay()];
}

export function dayOfYear(iso: ISODate): number {
  const d = fromISO(iso);
  return diffDays(iso, `${d.getUTCFullYear()}-01-01`) + 1;
}
