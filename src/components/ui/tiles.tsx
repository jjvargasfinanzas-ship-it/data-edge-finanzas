import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn";
import { formatMoney, type Currency } from "@/lib/money";

/**
 * Cifra que se ajusta al ancho real de su contenedor (container query units),
 * para que nunca se corte ni se vea desproporcionada.
 * ~0,62em por carácter en Manrope tabular. Entre `min` y `max` px; si el texto
 * es muy largo se usa formato compacto ("$ 1,9 M") y el valor completo queda en el title.
 * El padre debe tener la clase `@container` (StatTile ya la incluye).
 */
export function FitMoney({
  value,
  currency,
  max = 22,
  min = 13,
  signed,
  className,
}: {
  value: number;
  currency: Currency;
  max?: number;
  min?: number;
  signed?: boolean;
  className?: string;
}) {
  const full = formatMoney(value, currency, { signed });
  const short = formatMoney(value, currency, { compact: true, signed });
  const long = full.length > 17 ? short : full;
  const size = (t: string) => `clamp(${min}px, calc(100cqi / ${(t.length * 0.62).toFixed(2)}), ${max}px)`;
  const base = "num overflow-hidden leading-tight font-semibold text-ellipsis";
  return (
    <p className={cn(base, className)} title={full}>
      {/* Contenedor angosto (< 120px): formato compacto. Ancho: cifra completa ajustada. */}
      <span className="block @min-[120px]:hidden" style={{ fontSize: size(short) }}>
        {short}
      </span>
      <span className="hidden @min-[120px]:block" style={{ fontSize: size(long) }}>
        {long}
      </span>
    </p>
  );
}

export type TileTone = "neutral" | "positive" | "negative" | "brand";

/**
 * Fondo pastel de la tarjeta, derivado de la paleta activa (ver globals.css).
 * "card" es el tono base de todas las tarjetas; los demás dan identidad a cada indicador.
 */
export type TileAccent = "card" | "teal" | "navy" | "mix" | "sky" | "alert" | "warn";

const accentBg: Record<TileAccent, string> = {
  card: "bg-card border-card-border",
  teal: "bg-pastel-teal border-transparent",
  navy: "bg-pastel-navy border-transparent",
  mix: "bg-pastel-mix border-transparent",
  sky: "bg-pastel-sky border-card-border",
  alert: "bg-negative-50 border-transparent",
  warn: "bg-warning-50 border-transparent",
};

const valueTone: Record<TileTone, string> = {
  neutral: "text-ink",
  positive: "text-positive",
  negative: "text-negative",
  brand: "text-teal-700",
};

export interface StatTileProps {
  label: string;
  value: number;
  currency: Currency;
  /** Línea secundaria corta (nº de cuentas, cupo, periodo…). */
  hint?: React.ReactNode;
  /** Ícono pequeño en un círculo pastel. */
  icon?: React.ReactNode;
  tone?: TileTone;
  /** Si existe, la tarjeta completa es un enlace al detalle. */
  href?: string;
  signed?: boolean;
  /** Resalta la pista (p. ej. "Agregar"). */
  hintAccent?: boolean;
  accent?: TileAccent;
  /** Reemplaza la cifra de dinero por un texto (p. ej. un conteo). */
  valueText?: string;
}

/** Tarjeta indicador: misma altura, mismo ritmo y misma tipografía en todas las pantallas. */
export function StatTile({ label, value, currency, hint, icon, tone, href, signed, hintAccent, accent = "card", valueText }: StatTileProps) {
  const t = tone ?? (value < 0 ? "negative" : "neutral");
  const body = (
    <>
      <div className="flex items-start gap-2">
        {icon && (
          <span className="-my-1 grid size-7 shrink-0 place-items-center rounded-lg bg-white/70 text-teal-700 shadow-[0_1px_2px_rgb(30_42_59/0.06)] max-[380px]:hidden [&_svg]:size-3.5" aria-hidden>
            {icon}
          </span>
        )}
        <p className="line-clamp-2 min-w-0 flex-1 text-xs leading-snug font-medium text-ink-2">{label}</p>
        {href && <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-ink-2/50 transition group-hover:translate-x-0.5 group-hover:text-teal-700" aria-hidden />}
      </div>
      <div className="@container mt-auto pt-2.5">
        {valueText !== undefined ? (
          <p className={cn("num text-[22px] leading-tight font-semibold", valueTone[t])}>{valueText}</p>
        ) : (
          <FitMoney value={value} currency={currency} signed={signed} className={valueTone[t]} />
        )}
        {hint && <p className={cn("mt-0.5 truncate text-[11px]", hintAccent ? "font-semibold text-teal-700" : "text-ink-2/75")}>{hint}</p>}
      </div>
    </>
  );
  const cls = cn("card group flex h-full min-h-[104px] flex-col p-3.5 sm:p-4", accentBg[accent]);
  return href ? (
    <Link href={href} aria-label={`${label}: ${valueText ?? formatMoney(value, currency)}. Ver detalle`} className={cn(cls, "card-link")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Rejilla simétrica: todas las tarjetas con el mismo ancho y la misma altura. */
export function TileGrid({ children, cols = 4, className }: { children: React.ReactNode; cols?: 2 | 3 | 4 | 6; className?: string }) {
  return (
    <div
      className={cn(
        "grid auto-rows-fr gap-3",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-3 max-sm:gap-2",
        cols === 4 && "grid-cols-2 lg:grid-cols-4",
        cols === 6 && "grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
