"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { fail, str, zodFail } from "./helpers";
import type { ActionState } from "./types";

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return process.env.NEXT_PUBLIC_SITE_URL && !host ? process.env.NEXT_PUBLIC_SITE_URL : `${proto}://${host}`;
}

const safeNext = (n: string) => (n.startsWith("/") && !n.startsWith("//") ? n : "/inicio");

export async function signIn(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  if (!email || !password) return fail("Escribe tu correo y contraseña.");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed")
      return fail("Tu correo aún no está verificado. Revisa tu bandeja de entrada.");
    return fail("Correo o contraseña incorrectos.");
  }
  redirect(safeNext(str(fd, "next")));
}

const signUpSchema = z.object({
  first_name: z.string().min(1, "Escribe tu nombre").max(80),
  last_name: z.string().max(80),
  email: z.email("Correo no válido"),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .regex(/[A-Za-z]/, "Incluye al menos una letra")
    .regex(/\d/, "Incluye al menos un número"),
  terms: z.literal("on", { message: "Debes aceptar el tratamiento de datos" }),
});

export async function signUp(_: ActionState, fd: FormData): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    first_name: str(fd, "first_name"),
    last_name: str(fd, "last_name"),
    email: str(fd, "email").toLowerCase(),
    password: str(fd, "password"),
    terms: fd.get("terms") ?? "",
  });
  if (!parsed.success) return zodFail(parsed.error);
  const { first_name, last_name, email, password } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { first_name, last_name },
      emailRedirectTo: `${await origin()}/auth/confirm?next=/bienvenida`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists") return fail("Ya existe una cuenta con ese correo.");
    if (error.code === "over_email_send_rate_limit")
      return fail("Se alcanzó el límite de correos. Espera unos minutos e intenta de nuevo.");
    return fail(error.message);
  }
  // Si la confirmación de correo está desactivada, ya hay sesión
  if (data.session) redirect("/bienvenida");
  return { ok: true, message: email, ts: Date.now() };
}

export async function signInWithGoogle(fd: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await origin()}/auth/confirm?next=${encodeURIComponent(safeNext(str(fd, "next")))}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function requestPasswordReset(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email").toLowerCase();
  if (!z.email().safeParse(email).success) return fail("Escribe un correo válido.");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await origin()}/auth/confirm?next=/nueva-clave`,
  });
  // Siempre la misma respuesta para no revelar si el correo existe
  return { ok: true, message: email, ts: Date.now() };
}

export async function updatePassword(_: ActionState, fd: FormData): Promise<ActionState> {
  const password = str(fd, "password");
  const confirm = str(fd, "confirm");
  if (password.length < 8 || !/\d/.test(password) || !/[A-Za-z]/.test(password))
    return fail("La contraseña debe tener mínimo 8 caracteres, con letras y números.");
  if (password !== confirm) return fail("Las contraseñas no coinciden.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail(error.code === "same_password" ? "Usa una contraseña distinta a la anterior." : error.message);
  redirect("/inicio?clave=ok");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
