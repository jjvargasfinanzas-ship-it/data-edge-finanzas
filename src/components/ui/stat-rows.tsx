import { cn } from "./cn";

export interface StatRow {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  /** operador visual a la izquierda: +, −, = */
  op?: "+" | "−" | "=";
  tone?: "in" | "out" | "neutral" | "total" | "negative";
}

/** Filas etiqueta → valor. Nunca desborda: el valor no se parte y la etiqueta se ajusta. */
export function StatRows({ rows, className }: { rows: StatRow[]; className?: string }) {
  return (
    <dl className={cn("divide-y divide-line", className)}>
      {rows.map((r, i) => (
        <div key={i} className={cn("flex items-center gap-3 py-2.5", r.tone === "total" && "pt-3")}>
          {r.op && (
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-canvas text-xs font-semibold text-muted" aria-hidden>
              {r.op}
            </span>
          )}
          <dt className="min-w-0 flex-1">
            <span className={cn("block text-sm", r.tone === "total" ? "font-semibold text-ink" : "text-ink-2")}>{r.label}</span>
            {r.hint && <span className="block text-xs text-muted">{r.hint}</span>}
          </dt>
          <dd
            className={cn(
              "num shrink-0 text-right whitespace-nowrap",
              r.tone === "total" ? "text-base font-semibold text-ink" : "text-sm font-medium",
              r.tone === "in" && "text-positive",
              r.tone === "out" && "text-ink",
              r.tone === "negative" && "text-negative",
            )}
          >
            {r.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
