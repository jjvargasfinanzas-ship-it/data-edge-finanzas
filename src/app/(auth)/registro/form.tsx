"use client";

import Link from "next/link";
import { useActionState } from "react";
import { MailCheck } from "lucide-react";
import { signInWithGoogle, signUp } from "@/app/actions/auth";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { GoogleButton } from "../google-button";

export function SignUpForm({ google }: { google: boolean }) {
  const [state, action, pending] = useActionState(signUp, initialState);
  const fe = state.fieldErrors ?? {};

  if (state.ok) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-2xl bg-teal-50 text-teal-600">
          <MailCheck className="size-8" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-ink">Revisa tu correo</h1>
        <p className="mt-3 text-sm text-muted">
          Enviamos un enlace de verificación a <strong className="text-ink">{state.message}</strong>. Ábrelo desde este
          mismo navegador para activar tu cuenta.
        </p>
        <Link href="/login" className="mt-8 inline-block text-sm font-semibold text-teal-700 hover:underline">
          Volver a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-ink">Crea tu cuenta Data Edge</h1>
      <p className="mt-2 text-sm text-muted">Una sola cuenta para todos los productos del ecosistema.</p>
      <form action={action} className="mt-8 space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre" htmlFor="first_name" error={fe.first_name}>
            <Input id="first_name" name="first_name" autoComplete="given-name" required />
          </Field>
          <Field label="Apellido" htmlFor="last_name" error={fe.last_name}>
            <Input id="last_name" name="last_name" autoComplete="family-name" />
          </Field>
        </div>
        <Field label="Correo" htmlFor="email" error={fe.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
        </Field>
        <Field label="Contraseña" htmlFor="password" error={fe.password} hint="Mínimo 8 caracteres, con letras y números.">
          <Input id="password" name="password" type="password" autoComplete="new-password" required />
        </Field>
        <label className="flex items-start gap-3 text-[13px] text-ink-2">
          <input type="checkbox" name="terms" className="mt-0.5 size-4 accent-teal-600" />
          <span>
            Autorizo el tratamiento de mis datos personales para usar Data Edge Finanzas, conforme a la Ley 1581 de 2012.
            {fe.terms && <span className="mt-1 block font-medium text-negative">{fe.terms}</span>}
          </span>
        </label>
        {state.error && !Object.keys(fe).length && (
          <p className="rounded-xl bg-negative-50 px-4 py-3 text-sm font-medium text-negative">{state.error}</p>
        )}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Comenzar gratis
        </Button>
      </form>
      {google && (
        <form action={signInWithGoogle} className="mt-3">
          <input type="hidden" name="next" value="/bienvenida" />
          <GoogleButton />
        </form>
      )}
      <p className="mt-8 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-teal-700 hover:underline">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
