import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { NewAccountButton } from "@/components/app/open-buttons";
import { Badge, Card, EmptyState, Money, PageHeader } from "@/components/ui/misc";
import { AccountIcon } from "@/components/ui/icons";
import { cn } from "@/components/ui/cn";
import { getAccounts, getContext, getRates } from "@/lib/data";
import { ACCOUNT_GROUPS, ACCOUNT_TYPE_LABELS } from "@/lib/constants";
import { convert } from "@/lib/money";
import { isLiquid } from "@/lib/cashflow";

export const metadata: Metadata = { title: "Cuentas" };

export default async function CuentasPage({ searchParams }: { searchParams: Promise<{ archivadas?: string }> }) {
  const sp = await searchParams;
  const showArchived = sp.archivadas === "1";
  const [{ currency }, accounts, rates] = await Promise.all([getContext(), getAccounts(), getRates()]);
  const visible = accounts.filter((a) => showArchived || !a.is_archived);
  const active = accounts.filter((a) => !a.is_archived);
  const base = (a: (typeof accounts)[number]) => convert(a.balance, a.currency, currency, rates);
  const liquid = active.filter((a) => isLiquid(a.type)).reduce((s, a) => s + base(a), 0);
  const assets = active.filter((a) => a.include_in_net_worth && a.balance > 0).reduce((s, a) => s + base(a), 0);
  const liabilities = active.filter((a) => a.include_in_net_worth && a.balance < 0).reduce((s, a) => s - base(a), 0);
  const archivedCount = accounts.length - active.length;

  return (
    <>
      <PageHeader
        title="Cuentas"
        subtitle="Saldos calculados automáticamente con tus movimientos."
        actions={<NewAccountButton>Nueva cuenta</NewAccountButton>}
      />

      <Card className="mb-4 grid grid-cols-3 divide-x divide-line">
        {[
          { l: "Disponible", v: liquid, h: "Bancos, efectivo, billeteras" },
          { l: "Activos", v: assets, h: "Incluye inversiones y lo que me deben" },
          { l: "Deudas", v: liabilities, h: "Tarjetas y préstamos" },
        ].map((k) => (
          <div key={k.l} className="min-w-0 px-3 py-2.5 sm:px-5 sm:py-3">
            <p className="truncate text-[11px] font-semibold text-muted sm:text-xs">{k.l}</p>
            <Money value={k.v} currency={currency} compact className="text-[15px] font-bold sm:hidden" />
            <Money value={k.v} currency={currency} className="hidden text-lg font-bold sm:inline" />
            <p className="hidden truncate text-[11px] text-muted sm:block">{k.h}</p>
          </div>
        ))}
      </Card>

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
                  <h2 className="text-xs font-bold tracking-[0.14em] text-muted uppercase">{g.label}</h2>
                  <Money value={total} currency={currency} className="text-sm font-bold text-ink-2" />
                </div>
                <Card>
                  <ul className="divide-y divide-line">
                    {items.map((a) => (
                      <li key={a.id}>
                        <Link href={`/cuentas/${a.id}`} className={cn("flex items-center gap-3 px-5 py-4 hover:bg-canvas/60", a.is_archived && "opacity-60")}>
                          <AccountIcon type={a.type} />
                          <div className="min-w-0 flex-1">
                            <p className="flex items-center gap-2 truncate text-sm font-bold text-ink">
                              {a.name}
                              {a.is_archived && <Badge>Archivada</Badge>}
                              {a.currency !== "COP" && <Badge tone="brand">{a.currency}</Badge>}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {[ACCOUNT_TYPE_LABELS[a.type], a.institution].filter(Boolean).join(" · ")}
                            </p>
                          </div>
                          <div className="text-right">
                            <Money value={a.balance} currency={a.currency} className={cn("text-[15px] font-bold", a.balance < 0 ? "text-negative" : "text-ink")} />
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
