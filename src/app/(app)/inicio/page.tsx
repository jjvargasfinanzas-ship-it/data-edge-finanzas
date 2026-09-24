import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, CheckCircle2, Circle, CreditCard, ExternalLink, TriangleAlert, Waves } from "lucide-react";
import { BalanceChart } from "@/components/charts/balance-chart";
import { CategoryBars, type CategoryRow } from "@/components/charts/category-bars";
import { CashPosition } from "@/components/app/cash-position";
import { NewAccountButton, NewPlannedButton, NewTransactionButton } from "@/components/app/open-buttons";
import { PendingList } from "@/components/app/pending-list";
import { PlanVsActual } from "@/components/app/plan-vs-actual";
import { Badge, Card, CardHeader, EmptyState, Money, Progress } from "@/components/ui/misc";
import { cn } from "@/components/ui/cn";
import { getAccounts, getCashflow, getCategories, getContext, getMonthTotals, getPeriodPlan, getRates } from "@/lib/data";
import { addDays, diffDays, endOfMonth, formatLong, formatShort, hourInTz, monthShort, startOfMonth } from "@/lib/dates";
import { convert, formatMoney, formatPct } from "@/lib/money";
import { quoteForDate } from "@/lib/quotes";
import { EVENT_TYPE_LABELS } from "@/lib/constants";
import { isLiquid } from "@/lib/cashflow";
import { nextDayOfMonth, occurrencesBetween } from "@/lib/recurrence";

export const metadata: Metadata = { title: "Inicio" };

function greeting(hour: number) {
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default async function InicioPage() {
  const { profile, today, tz, currency, supabase } = await getContext();
  const monthFrom = startOfMonth(today);
  const eom = endOfMonth(today);
  const horizon = addDays(today, 30) > eom ? addDays(today, 30) : eom;

  const [accounts, categories, rates, totals, flow, plan, eventsRes, txCount] = await Promise.all([
    getAccounts(),
    getCategories(),
    getRates(),
    getMonthTotals(monthFrom, today),
    getCashflow(horizon),
    getPeriodPlan(monthFrom, eom),
    supabase.from("calendar_events").select("*").lte("event_date", addDays(today, 14)),
    supabase.from("transactions").select("id", { count: "exact", head: true }),
  ]);

  const active = accounts.filter((a) => !a.is_archived);
  const toBase = (v: number, c: (typeof accounts)[number]["currency"]) => convert(v, c, currency, rates);

  // Posición de caja hasta fin de mes
  const monthOcc = flow.occurrences.filter((o) => o.date <= eom);
  const incoming = monthOcc.filter((o) => o.cashEffect > 0);
  const outgoing = monthOcc.filter((o) => o.cashEffect < 0);
  const toReceive = incoming.reduce((s, o) => s + o.cashEffect, 0);
  const toPay = outgoing.reduce((s, o) => s - o.cashEffect, 0);
  const monthDays = flow.days.filter((d) => d.date <= eom);
  const projected = monthDays[monthDays.length - 1]?.closing ?? flow.startBalance;
  const low = monthDays.reduce((m, d) => (d.closing < m.closing ? d : m), monthDays[0] ?? { closing: flow.startBalance, date: today });

  // Pendientes (vencidos + próximos 14 días); se ocultan transferencias entre cuentas líquidas
  const pending = flow.occurrences.filter((o) => o.date <= addDays(today, 14) && !(o.flow === "transfer" && o.cashEffect === 0));

  // Gastos por categoría principal
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const byParent = new Map<string, CategoryRow>();
  for (const [catId, value] of totals.byCategory) {
    const c = catId ? catMap.get(catId) : undefined;
    const parent = c?.parent_id ? catMap.get(c.parent_id) : c;
    const key = parent?.id ?? "none";
    const row = byParent.get(key) ?? { id: key, name: parent?.name ?? "Sin categoría", icon: parent?.icon ?? null, color: parent?.color ?? null, value: 0 };
    row.value += value;
    byParent.set(key, row);
  }
  const catRows = [...byParent.values()].sort((a, b) => b.value - a.value);
  const topCats = catRows.slice(0, 6);
  if (catRows.length > 6) {
    topCats.push({ id: "other", name: "Otras", icon: null, color: "#64748B", value: catRows.slice(6).reduce((s, r) => s + r.value, 0) });
  }

  const cards = active.filter((a) => a.type === "credit_card");
  const events = (eventsRes.data ?? [])
    .flatMap((e) =>
      occurrencesBetween({ frequency: e.frequency, start_date: e.event_date, end_date: e.end_date }, today, addDays(today, 14)).map((d) => ({
        id: `${e.id}|${d}`,
        date: d,
        title: e.title,
        type: e.event_type,
      })),
    )
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .slice(0, 5);

  const hasPlanned = plan.rows.length > 0 || flow.occurrences.some((o) => o.plannedItemId);
  const steps = [
    { done: active.length > 1, label: "Agrega tus cuentas y tarjetas", action: <NewAccountButton variant="secondary" size="sm">Cuenta</NewAccountButton> },
    { done: plan.rows.some((r) => r.kind === "income") || hasPlanned, label: "Programa tus ingresos y pagos fijos", action: <NewPlannedButton variant="secondary" size="sm" initial={{ kind: "income" }}>Programar</NewPlannedButton> },
    { done: (txCount.count ?? 0) > 0, label: "Registra tu primer gasto", action: <NewTransactionButton variant="secondary" size="sm" initial={{ kind: "expense" }}>Gasto</NewTransactionButton> },
  ];
  const showSteps = steps.some((s) => !s.done);
  const next30 = flow.days.slice(0, 31);

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <p className="text-sm font-semibold text-teal-700 first-letter:uppercase">{formatLong(today)}</p>
        <h1 className="mt-0.5 font-display text-[28px] leading-tight font-semibold text-ink sm:text-[32px]">
          {greeting(hourInTz(tz))}, {profile.first_name || "hola"}.
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">“{quoteForDate(today)}”</p>
      </header>

      <CashPosition
        currency={currency}
        available={flow.startBalance}
        toReceive={toReceive}
        toPay={toPay}
        projected={projected}
        projectedLabel={`Al cierre del ${formatShort(eom)}, si todo lo programado ocurre`}
        receiveCount={incoming.length}
        payCount={outgoing.length}
        includesCards={outgoing.some((o) => o.flow === "card_estimate" || o.flow === "payment")}
        overdueCount={outgoing.filter((o) => o.overdue).length}
        lowPoint={low ? { value: low.closing, label: formatShort(low.date) } : null}
        accounts={active
          .filter((a) => isLiquid(a.type))
          .map((a) => ({ id: a.id, name: a.name, type: a.type, currency: a.currency, balance: a.balance, baseBalance: toBase(a.balance, a.currency) }))}
      />

      {showSteps && (
        <Card className="p-5">
          <p className="text-[15px] font-bold text-ink">Completa tu espacio financiero</p>
          <p className="text-sm text-muted">Con estos tres pasos tu flujo de caja empieza a trabajar.</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {steps.map((s) => (
              <li key={s.label} className={cn("flex items-center gap-3 rounded-xl border p-3", s.done ? "border-positive/20 bg-positive-50" : "border-line")}>
                {s.done ? <CheckCircle2 className="size-5 shrink-0 text-positive" /> : <Circle className="size-5 shrink-0 text-line-strong" />}
                <span className={cn("flex-1 text-sm font-semibold", s.done ? "text-positive" : "text-ink")}>{s.label}</span>
                {!s.done && s.action}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[1.35fr_1fr]">
        <Card>
          <CardHeader
            title="Pendientes por registrar"
            subtitle="Lo programado hasta dentro de 14 días. Márcalo cuando ocurra para que tu saldo sea real."
            action={
              <Link href="/flujo-de-caja" className="shrink-0 text-sm font-bold text-teal-700 hover:underline">
                Ver flujo
              </Link>
            }
          />
          <div className="px-5 pb-3">
            <PendingList
              items={pending}
              baseCurrency={currency}
              empty={
                <EmptyState
                  icon={<CalendarDays className="size-7" />}
                  title={hasPlanned ? "Estás al día" : "Aún no tienes nada programado"}
                  description={hasPlanned ? "No hay ingresos ni pagos pendientes en los próximos 14 días." : "Programa tu salario, arriendo, servicios y cuotas para ver lo que viene."}
                  action={!hasPlanned ? <NewPlannedButton initial={{ kind: "income" }}>Programar ingreso</NewPlannedButton> : undefined}
                  className="py-8"
                />
              }
            />
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Este mes: programado vs. real"
            subtitle="Cuánto de lo que programaste ya se recibió o se pagó"
            action={
              <Link href="/programados" className="shrink-0 text-sm font-bold text-teal-700 hover:underline">
                Programación
              </Link>
            }
          />
          <div className="p-5">
            {plan.rows.length ? (
              <PlanVsActual
                income={plan.income}
                expense={plan.expense}
                unplannedIncome={plan.unplannedIncome}
                unplannedExpense={plan.unplannedExpense}
                currency={currency}
              />
            ) : (
              <p className="text-sm text-muted">Cuando programes ingresos y gastos verás aquí cuánto se ha cumplido.</p>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs">
              <div>
                <p className="text-muted">Total ingresos registrados</p>
                <Money value={totals.income} currency={currency} className="text-sm font-bold text-positive" />
              </div>
              <div>
                <p className="text-muted">Total gastos registrados</p>
                <Money value={totals.expense} currency={currency} className="text-sm font-bold text-ink" />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Tu saldo disponible en los próximos 30 días"
          subtitle="Hoy es real; desde mañana es proyectado con lo pendiente"
          action={
            <Link href="/flujo-de-caja" className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-teal-700 hover:underline">
              Detalle <ArrowRight className="size-4" />
            </Link>
          }
        />
        <div className="px-3 pt-4 pb-3 sm:px-5">
          <BalanceChart currency={currency} data={next30.map((d) => ({ date: d.date, closing: d.closing, inflow: d.inflow, outflow: d.outflow }))} />
        </div>
        {flow.firstNegativeDate && flow.firstNegativeDate <= addDays(today, 30) && (
          <div className="flex items-start gap-3 border-t border-line bg-negative-50 px-5 py-3 text-sm text-negative">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              <strong>El {formatShort(flow.firstNegativeDate)} tu saldo disponible quedaría en negativo.</strong> Revisa los pagos de esos días o
              planea una transferencia.
            </p>
          </div>
        )}
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="¿En qué se va tu dinero este mes?"
            subtitle={totals.expense ? `${formatMoney(totals.expense, currency)} en gastos registrados hasta hoy` : undefined}
            action={
              <Link href="/movimientos" className="shrink-0 text-sm font-bold text-teal-700 hover:underline">
                Movimientos
              </Link>
            }
          />
          <div className="p-5">
            {topCats.length ? (
              <CategoryBars rows={topCats} total={totals.expense} currency={currency} />
            ) : (
              <EmptyState
                title="No tienes gastos registrados este mes."
                action={<NewTransactionButton initial={{ kind: "expense" }}>Registrar mi primer gasto</NewTransactionButton>}
                className="py-6"
              />
            )}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Tarjetas"
              action={
                <Link href="/tarjetas" className="text-sm font-bold text-teal-700 hover:underline">
                  Ver
                </Link>
              }
            />
            <div className="space-y-4 p-5">
              {cards.length ? (
                cards.slice(0, 3).map((c) => {
                  const used = Math.max(0, -c.balance);
                  const pct = c.credit_limit ? (used / c.credit_limit) * 100 : 0;
                  const due = c.due_day ? nextDayOfMonth(c.due_day, today) : null;
                  const dueIn = due ? diffDays(due, today) : null;
                  return (
                    <div key={c.id}>
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="truncate font-semibold text-ink">{c.name}</span>
                        <Money value={used} currency={c.currency} className="font-bold" />
                      </div>
                      <Progress value={pct} tone={pct >= 90 ? "negative" : pct >= 70 ? "warning" : "brand"} className="mt-2" label={`Uso de ${c.name}`} />
                      <p className="mt-1.5 flex items-center justify-between text-xs text-muted">
                        <span>{formatPct(pct, { digits: 0 })} del cupo</span>
                        {due && <span className={cn(dueIn !== null && dueIn <= 3 && used > 0 && "font-bold text-warning")}>Pago {formatShort(due)}</span>}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="flex items-center gap-3 text-sm text-muted">
                  <CreditCard className="size-5" /> Sin tarjetas registradas.
                  <NewAccountButton variant="ghost" size="sm" initial={{ type: "credit_card" }}>
                    Agregar
                  </NewAccountButton>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Próximos eventos"
              action={
                <Link href="/calendario" className="text-sm font-bold text-teal-700 hover:underline">
                  Calendario
                </Link>
              }
            />
            <ul className="space-y-3 p-5">
              {events.length ? (
                events.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 text-sm">
                    <span className="grid w-11 shrink-0 place-items-center rounded-lg bg-canvas py-1 text-center leading-tight">
                      <span className="text-[10px] font-bold text-muted uppercase">{monthShort(e.date)}</span>
                      <span className="num text-base font-bold text-ink">{Number(e.date.slice(8))}</span>
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-ink">{e.title}</span>
                    <Badge>{EVENT_TYPE_LABELS[e.type]}</Badge>
                  </li>
                ))
              ) : (
                <li className="text-sm text-muted">Nada en los próximos 14 días.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-surface to-teal-50 p-5">
        <div className="flex items-center gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-navy-900 text-teal-300">
            <Waves className="size-5" />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">¿Tienes un negocio?</p>
            <p className="text-sm text-muted">Conoce las plantillas, simuladores y modelos financieros de Data Edge para empresas.</p>
          </div>
        </div>
        <a
          href={process.env.NEXT_PUBLIC_DATA_EDGE_URL ?? "https://dataedgeconsulting.com"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-navy-800"
        >
          Ver Data Edge Empresas <ExternalLink className="size-4" />
        </a>
      </Card>
    </div>
  );
}
