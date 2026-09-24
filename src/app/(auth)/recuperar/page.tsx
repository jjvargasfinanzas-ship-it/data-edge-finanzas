"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";

export default function RecuperarPage() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);
  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-ink">Recupera tu contraseña</h1>
      {state.ok ? (
        <p className="mt-4 rounded-xl bg-positive-50 px-4 py-3 text-sm font-medium text-positive">
          Si existe una cuenta con {state.message}, te enviamos un enlace para crear una contraseña nueva.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">Te enviaremos un enlace a tu correo.</p>
          <form action={action} className="mt-8 space-y-4">
            <Field label="Correo" htmlFor="email">
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </Field>
            {state.error && <p className="rounded-xl bg-negative-50 px-4 py-3 text-sm font-medium text-negative">{state.error}</p>}
            <Button type="submit" size="lg" className="w-full" loading={pending}>
              Enviar enlace
            </Button>
          </form>
        </>
      )}
      <Link href="/login" className="mt-8 block text-center text-sm font-semibold text-teal-700 hover:underline">
        Volver a iniciar sesión
      </Link>
    </>
  );
}
