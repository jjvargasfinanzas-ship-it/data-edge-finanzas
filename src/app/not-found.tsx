import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <Logo className="justify-center" />
        <p className="mt-10 font-display text-6xl font-semibold text-teal-500">404</p>
        <h1 className="mt-2 text-xl font-semibold text-ink">Esta página no existe</h1>
        <ButtonLink href="/inicio" className="mt-6">
          Volver al inicio
        </ButtonLink>
      </div>
    </main>
  );
}
