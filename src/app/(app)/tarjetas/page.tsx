import type { Metadata } from "next";
import { CreditCard, TriangleAlert } from "lucide-react";
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
                <div className="relative overflow-hidden bg-gradient-to-br from-navy-800 via-navy-900 to-navy-950 p-6 text-white">
                  <div className="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-teal-500/25 blur-2xl" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.16em] text-white/60 uppercase">{c.institution || "Tarjeta de crédito"}</p>
                      <p className="mt-1 text-lg font-bold">{c.name}</p>
                    </div>
                    <CreditCard className="size-7 text-teal-300" />
                  </div>
                  <div className="relative mt-8 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-white/60">Utilizado</p>
                      <p className="num text-3xl font-bold">{formatMoney(used, c.currency)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-white/60">Disponible</p>
                      <p className="num text-lg font-bold text-teal-300">{formatMoney(available, c.currency)}</p>
                    </div>
                  </div>
                  <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                    <div
                      className={cn("h-full rounded-full", pct >= 90 ? "bg-[#ff8f7a]" : pct >= 70 ? "bg-[#f5c451]" : "bg-teal-400")}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <p className="relative mt-1.5 text-xs text-white/60">
                    {formatPct(pct, { digits: 0 })} de {formatMoney(limit, c.currency)}
                  </p>
                </div>
                <dl className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
                  <div className="p-4">
                    <dt className="text-xs font-semibold text-muted">Próximo corte</dt>
                    <dd className="mt-0.5 text-sm font-bold text-ink">{formatShort(cut)}</dd>
                  </div>
                  <div className="p-4">
                    <dt className="text-xs font-semibold text-muted">Fecha de pago</dt>
                    <dd className={cn("mt-0.5 text-sm font-bold", used > 0 && dueIn <= 3 ? "text-warning" : "text-ink")}>{formatShort(due)}</dd>
                  </div>
                  <div className="p-4">
                    <dt className="text-xs font-semibold text-muted">Compras del periodo</dt>
                    <dd className="num mt-0.5 text-sm font-bold text-ink">{formatMoney(periodSpend, c.currency, { compact: periodSpend >= 1e7 })}</dd>
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
