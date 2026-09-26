import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AccountIcon } from "@/components/ui/icons";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import { formatMoney, type Currency } from "@/lib/money";
import type { AccountType } from "@/lib/constants";

export interface PositionTile {
  key: string;
  label: string;
  /** Tipo de cuenta que define el ícono de la tarjeta. */
  icon: AccountType;
  value: number;
  /** Línea secundaria: nº de cuentas, cupo total, etc. */
  hint: string;
  href: string;
  empty?: boolean;
}

/**
 * Ajusta el tamaño de la cifra al ancho real de la tarjeta (container query units),
 * para que nunca se corte: ~0,62em por carácter en la fuente numérica.
 * Tope en 26px (igual que "Disponible") y piso en 14px; si aun así no cabe, se usa formato compacto.
 */
function FitMoney({ value, currency }: { value: number; currency: Currency }) {
  const full = formatMoney(value, currency);
  const text = full.length > 18 ? formatMoney(value, currency, { compact: true }) : full;
  const size = `clamp(14px, calc(100cqi / ${(text.length * 0.62).toFixed(2)}), 26px)`;
  return (
    <p
      className={cn("num mt-1 overflow-hidden leading-tight font-bold whitespace-nowrap text-ellipsis", value < 0 ? "text-negative" : "text-ink")}
      style={{ fontSize: size }}
      title={full}
    >
      {text}
    </p>
  );
}

/** Resumen de posiciones financieras: tarjetas simétricas y clicables hacia su detalle. */
export function PositionsSummary({ tiles, currency }: { tiles: PositionTile[]; currency: Currency }) {
  return (
    <section aria-label="Posiciones financieras">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
          Posiciones financieras <Badge tone="positive">Real</Badge>
        </h2>
        <Link href="/cuentas" className="text-sm font-bold text-teal-700 hover:underline">
          Cuentas
        </Link>
      </div>
      <ul className="grid auto-rows-fr grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <li key={t.key} className="min-w-0">
            <Link
              href={t.href}
              aria-label={`${t.label}: ${formatMoney(t.value, currency)}. Ver detalle`}
              className="card group flex h-full min-h-[132px] flex-col p-4 transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:outline-none sm:p-5"
            >
              <div className="flex items-center gap-2">
                <AccountIcon type={t.icon} className="size-8 rounded-lg [&_svg]:size-4" />
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-muted">{t.label}</p>
                <ChevronRight className="size-4 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-teal-700" />
              </div>
              <div className="@container mt-auto pt-3">
                <FitMoney value={t.value} currency={currency} />
                <p className={cn("mt-0.5 truncate text-xs", t.empty ? "font-semibold text-teal-700" : "text-muted")}>{t.hint}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
