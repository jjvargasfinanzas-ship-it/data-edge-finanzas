import type { Metadata } from "next";
import { LoginForm } from "./form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <>
      <h1 className="font-display text-3xl font-semibold text-ink">Bienvenido de nuevo</h1>
      <p className="mt-2 text-sm text-muted">Ingresa a tu cuenta Data Edge.</p>
      {sp.error && (
        <p className="mt-5 rounded-xl bg-negative-50 px-4 py-3 text-sm font-medium text-negative">
          {sp.error === "link"
            ? "El enlace no es válido o ya expiró. Solicita uno nuevo."
            : "No pudimos iniciar sesión con ese método."}
        </p>
      )}
      {sp.verificado && (
        <p className="mt-5 rounded-xl bg-positive-50 px-4 py-3 text-sm font-medium text-positive">
          Correo verificado. Ya puedes ingresar.
        </p>
      )}
      <LoginForm next={sp.next ?? "/inicio"} google={process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true"} />
    </>
  );
}
