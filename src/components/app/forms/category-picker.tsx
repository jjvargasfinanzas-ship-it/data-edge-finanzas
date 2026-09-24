"use client";

import { useMemo } from "react";
import { CategoryIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { Select } from "@/components/ui/field";
import type { CategoryOption } from "../app-data";

/** Selector rápido: chips de categoría principal + subcategoría opcional. */
export function CategoryPicker({
  categories,
  kind,
  value,
  onChange,
  name = "category_id",
}: {
  categories: CategoryOption[];
  kind: "income" | "expense";
  value: string;
  onChange: (id: string) => void;
  name?: string;
}) {
  const parents = useMemo(
    () => categories.filter((c) => c.kind === kind && !c.parent_id && (!c.is_archived || c.id === value)),
    [categories, kind, value],
  );
  const selected = categories.find((c) => c.id === value);
  const parentId = selected?.parent_id ?? selected?.id ?? "";
  const subs = categories.filter((c) => c.parent_id === parentId && (!c.is_archived || c.id === value));

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {parents.map((c) => {
          const active = parentId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(active && value === c.id ? "" : c.id)}
              aria-pressed={active}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-1 py-2 text-center transition-all",
                active ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/20" : "border-line hover:border-line-strong hover:bg-canvas",
              )}
            >
              <CategoryIcon icon={c.icon} color={c.color} size="sm" />
              <span className="line-clamp-1 w-full text-[11px] font-semibold text-ink-2">{c.name}</span>
            </button>
          );
        })}
      </div>
      {subs.length > 0 && (
        <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label="Subcategoría">
          <option value={parentId}>Sin subcategoría</option>
          {subs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      )}
    </div>
  );
}
