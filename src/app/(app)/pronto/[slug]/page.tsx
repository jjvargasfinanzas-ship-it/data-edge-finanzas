import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { Badge, Card } from "@/components/ui/misc";
import { UPCOMING_MODULES } from "@/lib/constants";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: UPCOMING_MODULES[slug]?.title ?? "Próximamente" };
}

export default async function ProntoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const mod = UPCOMING_MODULES[slug];
  if (!mod) notFound();
  return (
    <Card className="mx-auto mt-6 max-w-xl p-8 text-center">
      <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-navy-900 text-teal-300">
        <Lock className="size-6" />
      </div>
      <Badge tone="brand" className="mt-5">{mod.block}</Badge>
      <h1 className="mt-3 font-display text-3xl font-semibold text-ink">{mod.title}</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">{mod.description}</p>
      <p className="mt-6 text-sm text-muted">
        Este módulo llega en un próximo bloque. Mientras tanto, mantén al día tus{" "}
        <Link href="/programados" className="font-semibold text-teal-700 hover:underline">
          programados
        </Link>{" "}
        y{" "}
        <Link href="/movimientos" className="font-semibold text-teal-700 hover:underline">
          movimientos
        </Link>
        : serán la base de este módulo.
      </p>
    </Card>
  );
}
