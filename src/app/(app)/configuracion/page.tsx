import type { Metadata } from "next";
import { Download, ExternalLink } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui/misc";
import { getCategories, getContext } from "@/lib/data";
import { formatMedium } from "@/lib/dates";
import { ProfileForm } from "./profile-form";
import { CategoriesManager } from "./categories";
import { RatesManager } from "./rates";
import { ThemePicker } from "./theme-picker";

export const metadata: Metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const { supabase, profile, today } = await getContext();
  const [categories, ratesRes] = await Promise.all([
    getCategories(),
    supabase.from("exchange_rates").select("id, base, rate, rate_date, source, user_id").order("rate_date", { ascending: false }).limit(60),
  ]);

  return (
    <>
      <PageHeader title="Configuración" subtitle={`Cuenta Data Edge · ${profile.email ?? ""} · desde ${formatMedium(profile.created_at.slice(0, 10))}`} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Perfil" subtitle="Tu moneda principal se usa para totales, flujo de caja y conversiones." />
          <div className="p-5">
            <ProfileForm profile={profile} />
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Apariencia" subtitle="Elige la paleta de colores. Se aplica en menús, botones, gráficos y calendario." />
          <div className="p-5">
            <ThemePicker current={profile.theme ?? "data-edge"} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Tasas de cambio" subtitle="Se actualizan automáticamente cada día hábil (TRM). Puedes registrar una tasa manual que prevalece." />
          <div className="p-5">
            <RatesManager rates={(ratesRes.data ?? []).map((r) => ({ ...r, rate: Number(r.rate) }))} today={today} />
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Categorías" subtitle="Personaliza categorías y subcategorías. Archivar no borra el historial." />
          <div className="p-5">
            <CategoriesManager categories={categories} />
          </div>
        </Card>

        <Card>
          <CardHeader title="Tus datos" />
          <div className="space-y-3 p-5 text-sm text-ink-2">
            <p>Descarga todos tus movimientos en CSV (se abre en Excel).</p>
            <a
              href="/api/export/movimientos"
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-card-border bg-card px-4 font-semibold text-ink hover:bg-canvas"
            >
              <Download className="size-4" /> Exportar todo
            </a>
            <p className="pt-2 text-xs text-muted">
              Data Edge Finanzas muestra análisis de tu propia información. No constituye asesoría financiera, tributaria ni de inversión.
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Ecosistema Data Edge" />
          <div className="space-y-3 p-5 text-sm text-ink-2">
            <p>Tu cuenta Data Edge te dará acceso a los demás productos del ecosistema: plantillas, simuladores y herramientas para empresas.</p>
            <a
              href={process.env.NEXT_PUBLIC_DATA_EDGE_URL ?? "https://dataedgeconsulting.com"}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy-700 px-4 text-sm font-semibold text-white hover:bg-navy-600"
            >
              Conoce Data Edge Consulting <ExternalLink className="size-4" />
            </a>
          </div>
        </Card>
      </div>
    </>
  );
}
