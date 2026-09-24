"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { signIn, signInWithGoogle } from "@/app/actions/auth";
import { initialState } from "@/app/actions/types";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { GoogleButton } from "../google-button";

export function LoginForm({ next, google }: { next: string; google: boolean }) {
  const [state, action, pending] = useActionState(signIn, initialState);
  const [show, setShow] = useState(false);
  return (
    <>
      <form action={action} className="mt-8 space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Correo" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="tu@correo.com" />
        </Field>
        <Field label="Contraseña" htmlFor="password">
          <div className="relative">
            <Input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required className="pr-11" />
            <button
              type="button"
              onClick={() => setShow((s) => !s)}
              className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted hover:text-ink"
              aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </Field>
        <div className="flex justify-end">
          <Link href="/recuperar" className="text-sm font-semibold text-teal-700 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        {state.error && <p className="rounded-xl bg-negative-50 px-4 py-3 text-sm font-medium text-negative">{state.error}</p>}
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          Ingresar
        </Button>
      </form>
      {google && (
        <form action={signInWithGoogle} className="mt-3">
          <input type="hidden" name="next" value={next} />
          <GoogleButton />
        </form>
      )}
      <p className="mt-8 text-center text-sm text-muted">
        ¿No tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-teal-700 hover:underline">
          Comienza gratis
        </Link>
      </p>
    </>
  );
}
