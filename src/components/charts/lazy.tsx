"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/misc";

/** Gráficos cargados bajo demanda para que las páginas abran más rápido. */
export const BalanceChartLazy = dynamic(() => import("./balance-chart").then((m) => m.BalanceChart), {
  ssr: false,
  loading: () => <Skeleton className="h-[180px] w-full rounded-xl" />,
});

export const FlowBarsLazy = dynamic(() => import("./flow-bars").then((m) => m.FlowBars), {
  ssr: false,
  loading: () => <Skeleton className="h-[220px] w-full rounded-xl" />,
});
