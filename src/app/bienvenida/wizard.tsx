"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, CreditCard, Plus, Sparkles, Trash2 } from "lucide-react";
import { completeOnboarding, type OnboardingPayload } from "@/app/actions/finance";
import { Logo } from "@/components/brand/logo";
import { AmountInput } from "@/components/app/forms/amount-input";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Field, Input, Select } from "@/components/ui/field";
import { ACCOUNT_TYPE_LABELS, MAIN_GOALS } from "@/lib/constants";
import { addMonthsClamped, endOfMonth } from "@/lib/dates";
import { parseAmountInput } from "@/lib/money";

type AccountRow = { key: number; type: OnboardingPayload["accounts"][number]["type"]; name: string; balance: string; limit: string; cut: string; due: string };

const EXPENSES = [
  { name: "Arriendo o cuota de vivienda", cat: "Vivienda" },
  { name: "Servicios públicos", cat: "Servicios" },
  { name: "Internet y celular", cat: "Servicios" },
  { name: "Mercado", cat: "Alimentación" },
  { name: "Transporte", cat: "Transporte" },
  { name: "Educación", cat: "Educación" },
  { name: "Salud y seguros", cat: "Salud" },
  { name: "Suscripciones", cat: "Suscripciones" },
];

const STEPS = ["Objetivo", "Cuentas", "Ingresos", "Gastos fijos"];

export function Wizard({ firstName, today }: { firstName: string; today: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  const [goal, setGoal] = useState<string>("");
  const [name, setName] = useState(firstName);
  const [accounts, setAccounts] = useState<AccountRow[]>([
    { key: 1, type: "bank_savings", name: "Cuenta de ahorros", balance: "", limit: "", cut: "", due: "" },
  ]);
  const [income, setIncome] = useState({ enabled: true, name: "Salario", frequency: "monthly", date: endOfMonth(today), amount: "" });
  const [expenseAmounts, setExpenseAmounts] = useState<Record<string, string>>({});
  const [expenseDays, setExpenseDays] = useState<Record<string, string>>({});

  const update = (key: number, patch: Partial<AccountRow>) => setAccounts((a) => a.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const finish = () => {
    const accs = accounts
      .filter((a) => a.name.trim())
      .map((a) => ({
        name: a.name.trim(),
        type: a.type,
        balance: parseAmountInput(a.balance) || 0,
        credit_limit: a.type === "credit_card" ? parseAmountInput(a.limit) || 0 : null,
        statement_day: a.type === "credit_card" ? Number(a.cut) || null : null,
        due_day: a.type === "credit_card" ? Number(a.due) || null : null,
      }));
    const incomeAmount = parseAmountInput(income.amount);
    const expenses = EXPENSES.map((e, i) => ({ e, amount: parseAmountInput(expenseAmounts[i] ?? ""), day: Number(expenseDays[i] || 1) }))
      .filter((x) => x.amount > 0)
      .map((x) => {
        const d = Math.min(Math.max(x.day, 1), 28);
        let start = `${today.slice(0, 8)}${String(d).padStart(2, "0")}`;
        if (start < today) start = addMonthsClamped(start, 1);
        return { name: x.e.name, amount: x.amount, start_date: start, category_name: x.e.cat };
      });

    const payload: OnboardingPayload = {
      main_goal: goal as OnboardingPayload["main_goal"],
      first_name: name.trim() || "Hola",
      accounts: accs,
      income:
        income.enabled && incomeAmount > 0
          ? {
              name: income.name || "Ingreso principal",
              amount: incomeAmount,
              frequency: income.frequency as "monthly",
              start_date: income.date,
              account_index: accs.findIndex((a) => a.type !== "credit_card" && a.type !== "investment"),
            }
          : null,
      expenses,
    };
    start(async () => {
      const r = await completeOnboarding(payload);
      if (r.ok) setDone(true);
      else toast.error(r.error ?? "No pudimos guardar");
    });
  };

  if (done) {
    return (
      <Shell>
        <div className="py-10 text-center animate-fade-up">
          <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-teal-500 text-navy-950 shadow-[0_20px_50px_-15px_rgb(20_191_168/0.8)]">
            <Sparkles className="size-9" />
          </div>
          <h1 className="mt-8 font-display text-4xl font-semibold text-ink">Tu espacio financiero está listo.</h1>
          <p className="mx-auto mt-3 max-w-md text-[15px] text-muted">
            Ya puedes ver tu saldo disponible, tus próximos pagos y cuánto dinero tendrás cada día del mes.
          </p>
          <Button size="lg" className="mt-8" onClick={() => { router.push("/inicio"); router.refresh(); }}>
            Ir a mi tablero
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <ol className="mb-8 flex gap-2" aria-label="Progreso">
        {STEPS.map((s, i) => (
          <li key={s} className="flex-1">
            <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-teal-500" : "bg-line")} />
            <p className={cn("mt-2 hidden text-xs font-semibold sm:block", i === step ? "text-ink" : "text-muted")}>{s}</p>
          </li>
        ))}
      </ol>

      <form onSubmit={(e) => e.preventDefault()} className="animate-fade-up" key={step}>
        {step === 0 && (
          <>
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">¿Qué quieres mejorar primero?</h1>
            <p className="mt-2 text-muted">Elige una opción. Podrás usar todo el producto igual.</p>
            <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
              {MAIN_GOALS.map((g) => (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => setGoal(g.value)}
                  aria-pressed={goal === g.value}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border bg-card p-4 text-left transition-all",
                    goal === g.value ? "border-teal-500 ring-4 ring-teal-500/15" : "border-line hover:border-line-strong",
                  )}
                >
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2", goal === g.value ? "border-teal-500 bg-teal-500 text-white" : "border-line-strong")}>
                    {goal === g.value && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-ink">{g.label}</span>
                    <span className="block text-sm text-muted">{g.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Tus cuentas</h1>
            <p className="mt-2 text-muted">Bancos, billeteras y tarjetas con su saldo de hoy. La cuenta Efectivo ya está creada.</p>
            <Field label="¿Cómo te llamamos?" htmlFor="name" className="mt-6 max-w-xs">
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <div className="mt-6 space-y-3">
              {accounts.map((a) => (
                <div key={a.key} className="rounded-2xl border border-card-border bg-card p-4">
                  <div className="grid gap-3 sm:grid-cols-[170px_1fr_170px_auto] sm:items-end">
                    <Field label="Tipo">
                      <Select value={a.type} onChange={(e) => update(a.key, { type: e.target.value as AccountRow["type"] })}>
                        {(["bank_savings", "bank_checking", "digital_wallet", "investment", "credit_card"] as const).map((t) => (
                          <option key={t} value={t}>
                            {ACCOUNT_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Nombre">
                      <Input value={a.name} onChange={(e) => update(a.key, { name: e.target.value })} placeholder="Ej. Bancolombia" />
                    </Field>
                    <Field label={a.type === "credit_card" ? "Deuda actual" : "Saldo actual"}>
                      <AmountInput name={`bal_${a.key}`} defaultValue={parseAmountInput(a.balance) || undefined} onValueChange={(v) => update(a.key, { balance: v })} />
                    </Field>
                    <button
                      type="button"
                      onClick={() => setAccounts((all) => all.filter((r) => r.key !== a.key))}
                      className="grid size-11 place-items-center rounded-xl text-muted hover:bg-negative-50 hover:text-negative"
                      aria-label="Quitar cuenta"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  {a.type === "credit_card" && (
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <Field label="Cupo">
                        <AmountInput name={`lim_${a.key}`} defaultValue={parseAmountInput(a.limit) || undefined} onValueChange={(v) => update(a.key, { limit: v })} />
                      </Field>
                      <Field label="Día de corte">
                        <Input type="number" min={1} max={31} value={a.cut} onChange={(e) => update(a.key, { cut: e.target.value })} />
                      </Field>
                      <Field label="Día de pago">
                        <Input type="number" min={1} max={31} value={a.due} onChange={(e) => update(a.key, { due: e.target.value })} />
                      </Field>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAccounts((a) => [...a, { key: Date.now(), type: "bank_savings", name: "", balance: "", limit: "", cut: "", due: "" }])}
              >
                <Plus className="size-4" /> Cuenta
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setAccounts((a) => [...a, { key: Date.now(), type: "credit_card", name: "", balance: "", limit: "", cut: "", due: "" }])}
              >
                <CreditCard className="size-4" /> Tarjeta de crédito
              </Button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Tu ingreso principal</h1>
            <p className="mt-2 text-muted">
              Con esto proyectamos cuándo llega tu dinero. Honorarios, arriendos, comisiones o pensión los programas después en <strong>Programación</strong>.
            </p>
            <div className="mt-6 grid gap-4 rounded-2xl border border-card-border bg-card p-5 sm:grid-cols-2">
              <Field label="Nombre">
                <Input value={income.name} onChange={(e) => setIncome({ ...income, name: e.target.value })} />
              </Field>
              <Field label="Monto neto que recibes">
                <AmountInput name="income_amount" defaultValue={parseAmountInput(income.amount) || undefined} onValueChange={(v) => setIncome({ ...income, amount: v })} />
              </Field>
              <Field label="Frecuencia">
                <Select value={income.frequency} onChange={(e) => setIncome({ ...income, frequency: e.target.value })}>
                  <option value="monthly">Mensual</option>
                  <option value="semimonthly">Quincenal (15 y fin de mes)</option>
                  <option value="biweekly">Cada 14 días</option>
                  <option value="weekly">Semanal</option>
                </Select>
              </Field>
              <Field label="Próxima fecha de pago">
                <Input type="date" value={income.date} onChange={(e) => setIncome({ ...income, date: e.target.value })} />
              </Field>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" checked={!income.enabled} onChange={(e) => setIncome({ ...income, enabled: !e.target.checked })} className="accent-teal-600" />
              Mis ingresos son variables; los registraré a medida que lleguen
            </label>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="font-display text-3xl font-semibold text-ink sm:text-4xl">Tus gastos fijos del mes</h1>
            <p className="mt-2 text-muted">Escribe solo los que tienes. Deja en blanco los demás.</p>
            <div className="mt-6 divide-y divide-line rounded-2xl border border-card-border bg-card">
              {EXPENSES.map((e, i) => (
                <div key={e.name} className="grid grid-cols-[1fr_140px_80px] items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_180px_110px]">
                  <span className="text-sm font-semibold text-ink">{e.name}</span>
                  <AmountInput
                    name={`exp_${i}`}
                    defaultValue={parseAmountInput(expenseAmounts[i] ?? "") || undefined}
                    onValueChange={(v) => setExpenseAmounts((m) => ({ ...m, [i]: v }))}
                  />
                  <Select aria-label={`Día de pago de ${e.name}`} value={expenseDays[i] ?? "1"} onChange={(ev) => setExpenseDays({ ...expenseDays, [i]: ev.target.value })}>
                    {Array.from({ length: 28 }, (_, d) => (
                      <option key={d + 1} value={d + 1}>
                        Día {d + 1}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-muted">Deudas, metas y presupuesto llegan en los próximos bloques. Tus tarjetas ya quedan con su pago estimado.</p>
          </>
        )}

        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" /> Atrás
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button size="lg" disabled={step === 0 && !goal} onClick={() => setStep((s) => s + 1)}>
              Continuar
            </Button>
          ) : (
            <Button size="lg" loading={pending} onClick={finish}>
              Crear mi espacio
            </Button>
          )}
        </div>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="mx-auto flex max-w-3xl items-center px-5 py-6">
        <Logo />
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-16">{children}</main>
    </div>
  );
}
