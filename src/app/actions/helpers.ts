import "server-only";
import { revalidatePath } from "next/cache";
import type { ZodError } from "zod";
import type { ActionState } from "./types";

export function fail(error: string, fieldErrors?: Record<string, string>): ActionState {
  return { ok: false, error, fieldErrors, ts: Date.now() };
}

export function done(message?: string): ActionState {
  revalidatePath("/", "layout");
  return { ok: true, message, ts: Date.now() };
}

export function zodFail(err: ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "form");
    if (!fieldErrors[k]) fieldErrors[k] = i.message;
  }
  return fail("Revisa los campos marcados.", fieldErrors);
}

/** Traduce errores de Postgres a mensajes entendibles. */
export function dbError(e: { code?: string; message?: string } | null): ActionState {
  const code = e?.code;
  if (code === "23505") return fail("Ya existe un registro igual.");
  if (code === "23503") return fail("Una de las cuentas o categorías seleccionadas no es válida.");
  if (code === "23514") return fail("Algún dato no cumple las reglas (revisa montos y fechas).");
  if (code === "42501") return fail("No tienes permiso para esta acción.");
  console.error("[db]", e);
  return fail("No pudimos guardar. Intenta de nuevo.");
}

export const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
};
export const optStr = (fd: FormData, k: string) => str(fd, k) || null;
