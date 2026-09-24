"use client";

import { useActionState } from "react";
import { updatePassword } from "@/app/actions/auth";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function NuevaClavePage() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-ink">Crea una contraseña nueva</h1>
      <p className="mt-2 text-sm text-muted">Mínimo 8 caracteres, con letras y números.</p>
      <form action={action} className="mt-8 space-y-4">
        <Field label="Contraseña nueva" htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <Field label="Confirma la contraseña" htmlFor="confirm">
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        {state.error && <p className="rounded-xl bg-negative-50 px-4 py-3 text-sm font-medium text-negative">{state.error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Guardar contraseña
        </Button>
      </form>
    </>
  );
}
