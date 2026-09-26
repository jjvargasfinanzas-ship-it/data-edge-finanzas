import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronRight, Wallet } from "lucide-react";
import { NewAccountButton } from "@/components/app/open-buttons";
import { Badge, Card, EmptyState, Money, PageHeader } from "@/components/ui/misc";
import { StatTile, TileGrid } from "@/components/ui/tiles";
import { AccountIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { getAccounts, getContext, getRates } from "@/lib/data";
import { ACCOUNT_GROUPS, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/constants";
import { convert } from "@/lib/money";
import { isLiquid } from "@/lib/cashflow";

export const metadata: Metadata = { title: "Cuentas" };

/** Filtros por tipo, usados desde el resumen de posiciones de Inicio. */
const TYPE_FILTERS: Record<string, { title: string; subtitle: string; type: AccountType; empty: string }> = {
  ahorros: { title: "Cuentas de ahorro", subtitle: "Detalle de tus cuentas de ahorro y sus saldos.", type: "bank_savings", empty: "No tienes cuentas de ahorro" },
  billeteras: { title: "Billeteras digitales", subtitle: "Nequi, Daviplata y demás billeteras con sus saldos.", type: "digital_wallet", empty: "No tienes billeteras digitales" },
  inversiones: { title: "Inversiones", subtitle: "Tus cuentas de inversión y su valor actual.", type: "investment", empty: "No tienes inversiones registradas" },
};

export default async function CuentasPage({ searchParams }: { searchParams: Promise<{ archivadas?: string; tipo?: string }> }) {
  const sp = await searchParams;
  const showArchived = sp.archivadas === "1";
  const filter = sp.tipo ? TYPE_FILTERS[sp.tipo] : undefined;
  const [{ currency }, accounts, rates] = await Promise.all([getContext(), getAccounts(), getRates()]);
  const visible = accounts.filter((a) => showArchived || !a.is_archived);
  const active = accounts.filter((a) => !a.is_archived);
  const base = (a: (typeof accounts)[number]) => convert(a.balance, a.currency, currency, rates);
  const liquid = active.filter((a) => isLiquid(a.type)).reduce((s, a) => s + base(a), 0);
  const assets = active.filter((a) => a.include_in_net_worth && a.balance > 0).reduce((s, a) => s + base(a), 0);
  const liabilities = active.filter((a) => a.include_in_net_worth && a.balance < 0).reduce((s, a) => s - base(a), 0);
  const archivedCount = accounts.length - active.length;

  if (filter) {
    const items = active.filter((a) => a.type === filter.type).sort((a, b) => base(b) - base(a));
    const total = items.reduce((s, a) => s + base(a), 0);
    return (
      <>
        <Link href="/inicio" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
          <ArrowLeft className="size-4" /> Inicio
        </Link>
        <PageHeader
          title={filter.title}
          subtitle={filter.subtitle}
          actions={<NewAccountButton initial={{ type: filter.type }}>Agregar</NewAccountButton>}
        />
        {items.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Wallet className="size-7" />}
              title={filter.empty}
              action={<NewAccountButton initial={{ type: filter.type }}>Agregar {ACCOUNT_TYPE_LABELS[filter.type].toLowerCase()}</NewAccountButton>}
            />
          </Card>
        ) : (
          <>
            <Card className="mb-4 flex items-center justify-between gap-3 border-transparent bg-pastel-teal px-5 py-4">
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-ink-2">Saldo total</p>
                <p className="text-xs text-muted">
                  {items.length} {items.length === 1 ? "cuenta" : "cuentas"}
                  {items.some((a) => a.currency !== currency) && ` · convertido a ${currency}`}
                </p>
              </div>
              <Money value={total} currency={currency} className={cn("shrink-0 text-2xl font-semibold", total < 0 ? "text-negative" : "text-ink")} />
            </Card>
            <Card>
              <ul className="divide-y divide-line">
                {items.map((a) => {
                  const share = total > 0 ? Math.max(0, (base(a) / total) * 100) : 0;
                  return (
                    <li key={a.id}>
                      <Link href={`/cuentas/${a.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-tint/70">
                        <AccountIcon type={a.type} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
                            {a.name}
                            {a.currency !== "COP" && <Badge tone="brand">{a.currency}</Badge>}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {[a.institution, total > 0 ? `${share.toFixed(0)}% del total` : null].filter(Boolean).join(" · ") || ACCOUNT_TYPE_LABELS[a.type]}
                          </p>
                        </div>
                        <div className="text-right">
                          <Money value={a.balance} currency={a.currency} className={cn("text-sm font-semibold whitespace-nowrap", a.balance < 0 ? "text-negative" : "text-ink")} />
                          {a.currency !== currency && (
                            <p className="num text-[11px] text-muted">≈ <Money value={base(a)} currency={currency} /></p>
                          )}
                        </div>
                        <ChevronRight className="size-4 text-muted" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Cuentas"
        subtitle="Saldos calculados automáticamente con tus movimientos."
        actions={<NewAccountButton>Nueva cuenta</NewAccountButton>}
      />

      <TileGrid cols={3} className="mb-5">
        <StatTile label="Disponible" value={liquid} currency={currency} hint="Bancos, efectivo, billeteras" accent="teal" href="/flujo-de-caja" />
        <StatTile label="Activos" value={assets} currency={currency} hint="Incluye inversiones y lo que me deben" accent="mix" />
        <StatTile label="Deudas" value={liabilities} currency={currency} hint="Tarjetas y préstamos" accent="navy" href="/tarjetas" />
      </TileGrid>

      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={<Wallet className="size-7" />} title="Aún no tienes cuentas" action={<NewAccountButton>Agregar cuenta</NewAccountButton>} />
        </Card>
      ) : (
        <div className="space-y-6">
          {ACCOUNT_GROUPS.map((g) => {
            const items = visible.filter((a) => g.types.includes(a.type));
            if (!items.length) return null;
            const total = items.filter((a) => !a.is_archived).reduce((s, a) => s + base(a), 0);
            return (
              <section key={g.label}>
                <div className="mb-2 flex items-baseline justify-between px-1">
                  <h2 className="text-xs font-semibold tracking-[0.14em] text-muted uppercase">{g.label}</h2>
                  <Money value={total} currency={currency} className="text-sm font-semibold text-ink-2" />
                </div>
                <Card>
                  <ul className="divide-y divide-line">
                    {items.map((a) => (
                      <li key={a.id}>
                        <Link href={`/cuentas/${a.id}`} className={cn("flex items-center gap-3 px-5 py-4 hover:bg-tint/70", a.is_archived && "opacity-60")}>
                          <AccountIcon type={a.type} />
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 truncate text-sm font-semibold text-ink">
                              {a.name}
                              {a.is_archived && <Badge>Archivada</Badge>}
                              {a.currency !== "COP" && <Badge tone="brand">{a.currency}</Badge>}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {[ACCOUNT_TYPE_LABELS[a.type], a.institution].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <Money value={a.balance} currency={a.currency} className={cn("text-sm font-semibold", a.balance < 0 ? "text-negative" : "text-ink")} />
                            {a.currency !== currency && (
                              <p className="num text-[11px] text-muted">≈ <Money value={base(a)} currency={currency} /></p>
                            )}
                          </div>
                          <ChevronRight className="size-4 text-muted" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              </section>
            );
          })}
        </div>
      )}

      {archivedCount > 0 && (
        <p className="mt-6 text-center text-sm">
          <Link href={showArchived ? "/cuentas" : "/cuentas?archivadas=1"} className="font-semibold text-teal-700 hover:underline">
            {showArchived ? "Ocultar archivadas" : `Ver ${archivedCount} archivada${archivedCount > 1 ? "s" : ""}`}
          </Link>
        </p>
      )}
    </>
  );
}
