"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import { cn } from "@/components/ui/cn";
import { Input, Select } from "@/components/ui/field";
import { addMonthsClamped, formatMonth } from "@/lib/dates";

export function TransactionFilters({
  month,
  accounts,
  categories,
  values,
}: {
  month: string;
  accounts: { id: string; name: string }[];
  categories: { id: string; name: string; kind: string }[];
  values: { tipo: string; cuenta: string; categoria: string; q: string };
}) {
  const router = useRouter();
  const path = usePathname();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(values.q);
  const active = [values.tipo, values.cuenta, values.categoria].filter(Boolean).length;
  const [open, setOpen] = useState(active > 0);

  const go = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ mes: month, ...values, ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    p.delete("pagina");
    start(() => router.push(`${path}?${p.toString()}`));
  };

  useEffect(() => {
    if (q === values.q) return;
    const t = setTimeout(() => go({ q }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const shift = (n: number) => go({ mes: addMonthsClamped(`${month}-01`, n).slice(0, 7) });

  return (
    <div className="mb-3 space-y-2 sm:mb-4" aria-busy={pending}>
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      <div className="flex shrink-0 items-center rounded-xl border border-line-strong bg-surface">
        <button type="button" onClick={() => shift(-1)} className="grid size-10 place-items-center text-muted hover:text-ink" aria-label="Mes anterior">
          <ChevronLeft className="size-4" />
        </button>
        <span className="min-w-24 text-center text-sm font-bold text-ink sm:min-w-36">{formatMonth(month)}</span>
        <button type="button" onClick={() => shift(1)} className="grid size-10 place-items-center text-muted hover:text-ink" aria-label="Mes siguiente">
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="relative order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
        <Input className="h-10 pl-9" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar" />
      </div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative ml-auto grid size-10 shrink-0 place-items-center rounded-xl border border-line-strong bg-surface text-muted hover:text-ink sm:hidden",
          open && "text-ink",
        )}
        aria-expanded={open}
        aria-label="Filtros"
      >
        <SlidersHorizontal className="size-4" />
        {active > 0 && <span className="absolute -top-1 -right-1 grid size-4 place-items-center rounded-full bg-teal-600 text-[10px] font-bold text-white">{active}</span>}
      </button>
    </div>
    <div className={cn("grid grid-cols-1 gap-2 sm:flex sm:flex-wrap", !open && "hidden sm:flex")}>
      <Select className="h-10 w-full sm:w-auto sm:min-w-36" value={values.tipo} onChange={(e) => go({ tipo: e.target.value })} aria-label="Tipo">
        <option value="">Todos los tipos</option>
        <option value="expense">Gastos</option>
        <option value="income">Ingresos</option>
        <option value="transfer">Transferencias</option>
      </Select>
      <Select className="h-10 w-full sm:w-auto sm:min-w-36" value={values.cuenta} onChange={(e) => go({ cuenta: e.target.value })} aria-label="Cuenta">
        <option value="">Todas las cuentas</option>
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </Select>
      <Select className="h-10 w-full sm:w-auto sm:min-w-40" value={values.categoria} onChange={(e) => go({ categoria: e.target.value })} aria-label="Categoría">
        <option value="">Todas las categorías</option>
        <optgroup label="Gastos">
          {categories.filter((c) => c.kind === "expense").map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
        <optgroup label="Ingresos">
          {categories.filter((c) => c.kind === "income").map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </optgroup>
      </Select>
    </div>
    </div>
  );
}
