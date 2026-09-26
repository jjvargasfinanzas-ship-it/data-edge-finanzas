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

  /** Aplica la paleta en la página actual (html y contenedor de la app). */
  const apply = (id: string) => {
    const targets = new Set<HTMLElement>([document.documentElement, ...document.querySelectorAll<HTMLElement>("[data-theme], [data-theme-root]")]);
    for (const el of targets) {
      if (id === "data-edge") delete el.dataset.theme;
      else el.dataset.theme = id;
    }
  };

  const pick = (id: string) => {
    if (id === selected || pending) return;
    const prev = selected;
    setSelected(id);
    apply(id); // vista previa inmediata
    start(async () => {
      const r = await updateTheme(id);
      if (r.ok) toast.success(r.message);
      else {
        // No se guardó: vuelve a la paleta anterior para que lo que ves sea lo guardado.
        toast.error(r.error ?? "No se pudo guardar la paleta");
        setSelected(prev);
        apply(prev);
      }
    });
  };

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Paleta de color" aria-busy={pending}>
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
              active ? "border-primary ring-4 ring-primary/15" : "border-card-border bg-card hover:border-line-strong",
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
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-on-primary">
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
