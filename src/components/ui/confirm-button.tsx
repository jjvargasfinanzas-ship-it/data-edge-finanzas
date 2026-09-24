"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/app/actions/types";
import { cn } from "./cn";

/** Botón con confirmación en línea (sin diálogos del navegador). */
export function ConfirmButton({
  action,
  children,
  confirmLabel = "¿Confirmar?",
  className,
  onDone,
}: {
  action: () => Promise<ActionState>;
  children: React.ReactNode;
  confirmLabel?: string;
  className?: string;
  onDone?: () => void;
}) {
  const [asking, setAsking] = useState(false);
  const [pending, start] = useTransition();

  if (!asking)
    return (
      <button type="button" onClick={() => setAsking(true)} className={className}>
        {children}
      </button>
    );

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <span className="text-ink-2">{confirmLabel}</span>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await action();
            if (r.ok) {
              if (r.message) toast.success(r.message);
              onDone?.();
            } else toast.error(r.error ?? "No se pudo completar");
            setAsking(false);
          })
        }
        className={cn("rounded-lg bg-negative px-2 py-1 text-white", pending && "opacity-60")}
      >
        {pending ? "…" : "Sí"}
      </button>
      <button type="button" onClick={() => setAsking(false)} className="rounded-lg px-2 py-1 text-muted hover:bg-canvas">
        No
      </button>
    </span>
  );
}
