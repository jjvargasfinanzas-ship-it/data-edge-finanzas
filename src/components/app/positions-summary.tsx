import Link from "next/link";
import { ChartLine, CreditCard, PiggyBank, Smartphone } from "lucide-react";
import { StatTile, TileGrid } from "@/components/ui/tiles";
import type { Currency } from "@/lib/money";

export interface PositionTile {
  key: "ahorros" | "billeteras" | "inversiones" | "tarjetas";
  label: string;
  value: number;
  hint: string;
  href: string;
  empty?: boolean;
}

const ICONS = { ahorros: PiggyBank, billeteras: Smartphone, inversiones: ChartLine, tarjetas: CreditCard };

/** Resumen de posiciones financieras: tarjetas simétricas y clicables hacia su detalle. */
export function PositionsSummary({ tiles, currency }: { tiles: PositionTile[]; currency: Currency }) {
  return (
    <section aria-label="Posiciones financieras">
      <div className="mb-2.5 flex items-baseline justify-between px-0.5">
        <h2 className="text-sm font-semibold text-ink">Posiciones financieras</h2>
        <Link href="/cuentas" className="text-xs font-semibold text-teal-700 hover:underline">
          Todas las cuentas
        </Link>
      </div>
      <TileGrid cols={4}>
        {tiles.map((t) => {
          const I = ICONS[t.key];
          return (
            <StatTile
              key={t.key}
              label={t.label}
              value={t.value}
              currency={currency}
              hint={t.hint}
              hintAccent={t.empty}
              icon={<I strokeWidth={2.2} />}
              href={t.href}
            />
          );
        })}
      </TileGrid>
    </section>
  );
}
