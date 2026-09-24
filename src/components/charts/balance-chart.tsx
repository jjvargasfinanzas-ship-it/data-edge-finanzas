"use client";

import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, type Currency } from "@/lib/money";
import { formatLong, formatShort } from "@/lib/dates";

export interface BalancePoint {
  date: string;
  closing: number;
  inflow: number;
  outflow: number;
}

function TooltipBox({ active, payload, currency }: { active?: boolean; payload?: { payload: BalancePoint }[]; currency: Currency }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs shadow-pop">
      <p className="font-semibold text-muted first-letter:uppercase">{formatLong(p.date)}</p>
      <p className="num mt-1 text-sm font-bold text-ink">{formatMoney(p.closing, currency)}</p>
      {(p.inflow > 0 || p.outflow > 0) && (
        <div className="mt-1.5 space-y-0.5 border-t border-line pt-1.5">
          {p.inflow > 0 && (
            <p className="num flex items-center gap-1.5 text-ink-2">
              <span className="size-2 rounded-full bg-series-in" /> Entra {formatMoney(p.inflow, currency)}
            </p>
          )}
          {p.outflow > 0 && (
            <p className="num flex items-center gap-1.5 text-ink-2">
              <span className="size-2 rounded-full bg-series-out" /> Sale {formatMoney(p.outflow, currency)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Saldo disponible proyectado día a día (una sola serie). */
export function BalanceChart({ data, currency, height = 240 }: { data: BalancePoint[]; currency: Currency; height?: number }) {
  const min = Math.min(0, ...data.map((d) => d.closing));
  const hasNegative = min < 0;
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="balFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-series-in)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--color-series-in)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e9edf3" />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => formatShort(d)}
            tick={{ fontSize: 11, fill: "#66758b" }}
            tickLine={false}
            axisLine={false}
            minTickGap={28}
          />
          <YAxis
            tickFormatter={(v: number) => formatMoney(v, currency, { compact: true })}
            tick={{ fontSize: 11, fill: "#66758b" }}
            tickLine={false}
            axisLine={false}
            width={64}
            domain={[hasNegative ? "auto" : 0, "auto"]}
          />
          {hasNegative && <ReferenceLine y={0} stroke="#d64545" strokeDasharray="0" strokeWidth={1} />}
          <Tooltip content={<TooltipBox currency={currency} />} cursor={{ stroke: "#0b1628", strokeOpacity: 0.15 }} />
          <Area
            type="stepAfter"
            dataKey="closing"
            stroke="var(--color-series-in)"
            strokeWidth={2}
            fill="url(#balFill)"
            activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: "var(--color-series-in)" }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
