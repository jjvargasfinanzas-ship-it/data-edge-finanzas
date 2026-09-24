import { describe, expect, it } from "vitest";
import { projectCashflow, type AccountLite, type PlannedLite } from "@/lib/cashflow";
import type { RateTable } from "@/lib/money";

const rates: RateTable = { COP: 1, USD: 4000, EUR: 4400, MXN: 200, GBP: 5000 };

const accounts: AccountLite[] = [
  { id: "bank", name: "Banco", type: "bank_savings", currency: "COP", balance: 1_000_000, due_day: null, is_archived: false },
  { id: "usd", name: "Cuenta USD", type: "bank_savings", currency: "USD", balance: 100, due_day: null, is_archived: false },
  { id: "visa", name: "Visa", type: "credit_card", currency: "COP", balance: -300_000, due_day: 5, is_archived: false },
  { id: "inv", name: "Fondo", type: "investment", currency: "COP", balance: 2_000_000, due_day: null, is_archived: false },
];

const base = { accounts, rates, baseCurrency: "COP" as const, today: "2026-09-24", horizonEnd: "2026-10-31" };

const p = (x: Partial<PlannedLite>): PlannedLite => ({
  id: x.id ?? "p",
  kind: "expense",
  name: "x",
  amount: 0,
  account_id: "bank",
  to_account_id: null,
  category_id: null,
  frequency: "monthly",
  start_date: "2026-01-01",
  end_date: null,
  is_active: true,
  ...x,
});

describe("projectCashflow", () => {
  it("saldo inicial solo con cuentas líquidas convertidas", () => {
    const r = projectCashflow({ ...base, planned: [], registered: [] });
    expect(r.startBalance).toBe(1_000_000 + 400_000);
  });

  it("proyecta ingresos, gastos y pago estimado de tarjeta", () => {
    const planned = [
      p({ id: "sal", kind: "income", name: "Salario", amount: 3_000_000, start_date: "2026-01-30" }),
      p({ id: "arr", kind: "expense", name: "Arriendo", amount: 1_500_000, start_date: "2026-01-01" }),
      p({ id: "net", kind: "expense", name: "Netflix", amount: 40_000, account_id: "visa", start_date: "2026-01-10" }),
    ];
    const r = projectCashflow({ ...base, planned, registered: [] });
    const day = (d: string) => r.days.find((x) => x.date === d)!;
    expect(day("2026-09-30").inflow).toBe(3_000_000);
    expect(day("2026-10-01").outflow).toBe(1_500_000);
    expect(day("2026-10-05").outflow).toBe(300_000); // pago estimado Visa
    expect(day("2026-10-10").outflow).toBe(0); // Netflix va a la tarjeta
    expect(r.endBalance).toBe(1_400_000 + 6_000_000 - 1_500_000 - 300_000);
  });

  it("no estima pago si ya hay pago programado a la tarjeta", () => {
    const planned = [
      p({ id: "pv", kind: "transfer", name: "Pago Visa", amount: 200_000, to_account_id: "visa", start_date: "2026-10-03", frequency: "once" }),
    ];
    const r = projectCashflow({ ...base, planned, registered: [] });
    expect(r.occurrences.some((o) => o.flow === "card_estimate")).toBe(false);
    expect(r.occurrences.find((o) => o.plannedItemId === "pv")!.cashEffect).toBe(-200_000);
  });

  it("vencidos sin registrar pasan a hoy y los registrados se excluyen", () => {
    const planned = [
      p({ id: "luz", kind: "expense", name: "Energía", amount: 100_000, start_date: "2026-01-20" }),
      p({ id: "agua", kind: "expense", name: "Agua", amount: 50_000, start_date: "2026-01-22" }),
    ];
    const r = projectCashflow({
      ...base,
      planned,
      registered: [{ planned_item_id: "agua", planned_date: "2026-09-22" }],
    });
    const today = r.days[0];
    expect(today.items.map((o) => o.name)).toEqual(["Energía"]);
    expect(today.items[0].overdue).toBe(true);
  });

  it("transferencia entre cuentas líquidas no cambia la caja; a inversión sí", () => {
    const planned = [
      p({ id: "t1", kind: "transfer", amount: 100_000, to_account_id: "usd", start_date: "2026-09-25", frequency: "once" }),
      p({ id: "t2", kind: "transfer", amount: 200_000, to_account_id: "inv", start_date: "2026-09-26", frequency: "once" }),
    ];
    const r = projectCashflow({ ...base, planned, registered: [] });
    expect(r.days.find((d) => d.date === "2026-09-25")!.outflow).toBe(0);
    expect(r.days.find((d) => d.date === "2026-09-26")!.outflow).toBe(200_000);
  });

  it("detecta primer saldo negativo", () => {
    const planned = [p({ id: "big", kind: "expense", amount: 2_000_000, start_date: "2026-10-15", frequency: "once" })];
    const r = projectCashflow({ ...base, planned, registered: [] });
    expect(r.firstNegativeDate).toBe("2026-10-15");
    expect(r.minBalance).toBe(1_400_000 - 300_000 - 2_000_000);
  });
});
