import { CategoryIcon } from "@/components/ui/icons";
import { formatMoney, formatPct, type Currency } from "@/lib/money";

export interface CategoryRow {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  value: number;
}

/** Barras horizontales ordenadas: magnitud en un solo tono, identidad por ícono y nombre. */
export function CategoryBars({ rows, total, currency }: { rows: CategoryRow[]; total: number; currency: Currency }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center gap-3">
          <CategoryIcon icon={r.icon} color={r.color} size="sm" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-semibold text-ink">{r.name}</span>
              <span className="num shrink-0 font-semibold text-ink">{formatMoney(r.value, currency)}</span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-canvas">
                <div className="h-full rounded-full bg-series-out" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
              <span className="num w-11 text-right text-xs font-semibold text-muted">{formatPct(total ? (r.value / total) * 100 : 0, { digits: 0 })}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
