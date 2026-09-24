"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { ActionState } from "@/app/actions/types";

/** Muestra el toast y ejecuta onSuccess una vez por respuesta del servidor. */
export function useFormResult(state: ActionState, onSuccess?: () => void) {
  const seen = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!state.ts || state.ts === seen.current) return;
    seen.current = state.ts;
    if (state.ok) {
      if (state.message) toast.success(state.message);
      onSuccess?.();
    } else if (state.error && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, onSuccess]);
}
