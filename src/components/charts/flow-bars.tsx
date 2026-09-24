"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, type Currency } from "@/lib/money";

export interface FlowBucket {
  label: string;
  inflow: number;
  outflow: number;
}

function TooltipBox({ active, payload, currency }: { active?: boolean; payload?: { payload: FlowBucket }[]; currency: Currency }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-pop">
      <p className="font-semibold text-muted">{p.label}</p>
      <p className="num mt-1 flex items-center gap-1.5 text-ink">
        <span className="size-2 rounded-full bg-series-in" /> Entradas {formatMoney(p.inflow, currency)}
      </p>
      <p className="num flex items-center gap-1.5 text-ink">
        <span className="size-2 rounded-full bg-series-out" /> Salidas {formatMoney(p.outflow, currency)}
      </p>
      <p className="num mt-1 border-t border-line pt-1 font-bold text-ink">Neto {formatMoney(p.inflow - p.outflow, currency, { signed: true })}</p>
    </div>
  );
}

/** Entradas vs salidas por periodo (dos series, con leyenda). */
export function FlowBars({ data, currency, height = 220 }: { data: FlowBucket[]; currency: Currency; height?: number }) {
  return (
    <div>
      <div className="mb-2 flex gap-4 text-xs font-semibold text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-series-in" /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-series-out" /> Salidas
        </span>
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="#e9edf3" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#66758b" }} tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })}
              tick={{ fontSize: 11, fill: "#66758b" }}
              tickLine={false}
              axisLine={false}
              width={64}
            />
            <Tooltip content={<TooltipBox currency={currency} />} cursor={{ fill: "#0b1628", fillOpacity: 0.04 }} />
            <Bar dataKey="inflow" fill="var(--color-series-in)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
            <Bar dataKey="outflow" fill="var(--color-series-out)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
