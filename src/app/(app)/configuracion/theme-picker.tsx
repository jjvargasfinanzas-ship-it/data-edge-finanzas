"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { updateTheme } from "@/app/actions/finance";
import { cn } from "@/components/ui/cn";
import { THEMES } from "@/lib/themes";

export function ThemePicker({ current }: { current: string }) {
  const [selected, setSelected] = useState(current);
  const [pending, start] = useTransition();

  const pick = (id: string) => {
    const prev = selected;
    setSelected(id);
    // Vista previa inmediata
    const html = document.documentElement;
    if (id === "data-edge") delete html.dataset.theme;
    else html.dataset.theme = id;
    start(async () => {
      const r = await updateTheme(id);
      if (r.ok) toast.success(r.message);
      else {
        toast.error(r.error ?? "No se pudo guardar");
        setSelected(prev);
      }
    });
  };

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Paleta de color" aria-busy={pending}>
      {THEMES.map((t) => {
        const active = selected === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => pick(t.id)}
            className={cn(
              "overflow-hidden rounded-2xl border text-left transition-all",
              active ? "border-teal-500 ring-4 ring-teal-500/15" : "border-line hover:border-line-strong",
            )}
          >
            <div className="flex h-16" aria-hidden>
              <div className="flex flex-1 items-end p-2" style={{ background: t.dark }}>
                <span className="h-1.5 w-8 rounded-full" style={{ background: t.accent }} />
              </div>
              <div className="w-10" style={{ background: t.accent }} />
              <div className="w-8" style={{ background: t.soft }} />
            </div>
            <div className="flex items-center justify-between gap-2 px-3 py-2.5">
              <span>
                <span className="block text-sm font-semibold text-ink">{t.name}</span>
                <span className="block text-xs text-muted">{t.hint}</span>
              </span>
              {active && (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-teal-500 text-white">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
