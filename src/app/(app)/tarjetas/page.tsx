import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CreditCard, TriangleAlert } from "lucide-react";
import { NewAccountButton } from "@/components/app/open-buttons";
import { Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import { getAccounts, getContext } from "@/lib/data";
import { addMonthsClamped, diffDays, formatMedium, formatShort } from "@/lib/dates";
import { formatMoney, formatPct } from "@/lib/money";
import { nextDayOfMonth } from "@/lib/recurrence";
import { CardActions } from "./card-actions";

export const metadata: Metadata = { title: "Tarjetas" };

export default async function TarjetasPage() {
  const [{ supabase, today }, accounts] = await Promise.all([getContext(), getAccounts()]);
  const cards = accounts.filter((a) => a.type === "credit_card" && !a.is_archived);

  // Compras desde el último corte
  const lastCut = (day: number) => {
    const next = nextDayOfMonth(day, today);
    return next === today ? today : addMonthsClamped(next, -1, day);
  };
  const since = cards.length ? cards.map((c) => lastCut(c.statement_day ?? 1)).sort()[0] : today;
  const { data: purchases } = cards.length
    ? await supabase
        .from("transactions")
        .select("account_id, amount, date")
        .eq("kind", "expense")
        .in("account_id", cards.map((c) => c.id))
        .gte("date", since)
    : { data: [] };

  return (
    <>
      <PageHeader
        title="Tarjetas de crédito"
        subtitle="Cupo, uso y fechas clave. El pago de la tarjeta se registra como transferencia desde tu banco."
        actions={<NewAccountButton initial={{ type: "credit_card" }}>Nueva tarjeta</NewAccountButton>}
      />

      {!cards.length ? (
        <Card>
          <EmptyState
            icon={<CreditCard className="size-7" />}
            title="No tienes tarjetas registradas"
            description="Agrega tu tarjeta con su cupo, día de corte y día de pago para ver alertas y el pago estimado en tu flujo de caja."
            action={<NewAccountButton initial={{ type: "credit_card" }}>Agregar tarjeta</NewAccountButton>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {cards.map((c) => {
            const used = Math.max(0, -c.balance);
            const limit = c.credit_limit ?? 0;
            const available = Math.max(0, limit - used);
            const pct = limit ? (used / limit) * 100 : 0;
            const cut = nextDayOfMonth(c.statement_day ?? 1, today);
            const due = nextDayOfMonth(c.due_day ?? 1, today);
            const dueIn = diffDays(due, today);
            const periodStart = lastCut(c.statement_day ?? 1);
            const periodSpend = (purchases ?? [])
              .filter((p) => p.account_id === c.id && p.date >= periodStart)
              .reduce((s, p) => s + Number(p.amount), 0);
            const alerts: string[] = [];
            if (pct >= 80) alerts.push(`Has utilizado el ${formatPct(pct, { digits: 0 })} de tu cupo.`);
            if (used > 0 && dueIn <= 3) alerts.push(dueIn === 0 ? "Tu tarjeta vence hoy." : `Tu tarjeta vence en ${dueIn} día${dueIn > 1 ? "s" : ""}.`);

            return (
              <Card key={c.id} className="overflow-hidden">
                <Link href={`/cuentas/${c.id}`} className="group relative block overflow-hidden bg-gradient-to-br from-tint to-tint-2 p-5 transition-colors hover:from-tint-strong/70">
                  <div className="pointer-events-none absolute -top-16 -right-10 size-44 rounded-full bg-surface/60 blur-2xl" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted">{c.institution || "Tarjeta de crédito"}</p>
                      <p className="mt-0.5 text-base font-semibold text-ink">{c.name}</p>
                    </div>
                    <span className="flex items-center gap-1 text-teal-700"><CreditCard className="size-5" /><ChevronRight className="size-4 transition group-hover:translate-x-0.5" /></span>
                  </div>
                  <div className="relative mt-6 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted">Utilizado</p>
                      <p className="num text-2xl font-semibold text-ink">{formatMoney(used, c.currency)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted">Disponible</p>
                      <p className="num text-base font-semibold text-teal-700">{formatMoney(available, c.currency)}</p>
                    </div>
                  </div>
                  <div className="relative mt-4 h-1.5 overflow-hidden rounded-full bg-surface/80">
                    <div
                      className={cn("h-full rounded-full", pct >= 90 ? "bg-negative/70" : pct >= 70 ? "bg-warning/70" : "bg-teal-400")}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="relative mt-1.5 text-xs text-muted">
                    {formatPct(pct, { digits: 0 })} de {formatMoney(limit, c.currency)}
                  </p>
                </Link>
                <dl className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
                  <div className="p-4">
                    <dt className="text-xs font-semibold text-muted">Próximo corte</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink">{formatShort(cut)}</dd>
                  </div>
                  <div className="p-4">
                    <dt className="text-xs font-semibold text-muted">Fecha de pago</dt>
                    <dd className={cn("mt-0.5 text-sm font-semibold", used > 0 && dueIn <= 3 ? "text-warning" : "text-ink")}>{formatShort(due)}</dd>
                  </div>
                  <div className="p-4">
                    <dt className="text-xs font-semibold text-muted">Compras del periodo</dt>
                    <dd className="num mt-0.5 text-sm font-semibold text-ink">{formatMoney(periodSpend, c.currency, { compact: periodSpend >= 1e7 })}</dd>
                  </div>
                </dl>
                {alerts.length > 0 && (
                  <ul className="space-y-1 border-b border-line bg-warning-50 px-5 py-3">
                    {alerts.map((a) => (
                      <li key={a} className="flex items-center gap-2 text-sm font-semibold text-warning">
                        <TriangleAlert className="size-4 shrink-0" /> {a}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
                  <p className="text-xs text-muted">Periodo desde {formatMedium(periodStart)}</p>
                  <CardActions card={c} debt={used} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
