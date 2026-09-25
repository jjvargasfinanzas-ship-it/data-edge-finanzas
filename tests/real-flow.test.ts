import { describe, expect, it } from "vitest";
import { buildRealFlow } from "@/lib/real-flow";
import type { AccountLite } from "@/lib/cashflow";

const accounts: AccountLite[] = [
  { id: "bank", name: "Banco", type: "bank_savings", currency: "COP", balance: 900, due_day: null, is_archived: false },
  { id: "nequi", name: "Nequi", type: "digital_wallet", currency: "COP", balance: 100, due_day: null, is_archived: false },
  { id: "visa", name: "Visa", type: "credit_card", currency: "COP", balance: -50, due_day: 5, is_archived: false },
];
const rates = { COP: 1, USD: 4000, EUR: 4400, MXN: 200, GBP: 5000 };

describe("flujo real", () => {
  const r = buildRealFlow({
    accounts,
    currentBalance: 1000,
    from: "2026-09-01",
    to: "2026-09-25",
    today: "2026-09-25",
    baseCurrency: "COP",
    rates,
    txs: [
      { id: "1", date: "2026-09-02", kind: "income", amount: 500, to_amount: null, account_id: "bank", to_account_id: null },
      { id: "2", date: "2026-09-05", kind: "expense", amount: 200, to_amount: null, account_id: "bank", to_account_id: null },
      { id: "3", date: "2026-09-06", kind: "expense", amount: 80, to_amount: null, account_id: "visa", to_account_id: null },
      { id: "4", date: "2026-09-07", kind: "transfer", amount: 100, to_amount: null, account_id: "bank", to_account_id: "nequi" },
      { id: "5", date: "2026-09-10", kind: "transfer", amount: 30, to_amount: null, account_id: "bank", to_account_id: "visa" },
    ],
  });
  it("saldo inicial reconstruido", () => expect(r.opening).toBe(1000 - 500 + 200 + 30));
  it("gasto con tarjeta y transferencia entre cuentas no mueven caja", () => {
    expect(r.days.find((d) => d.date === "2026-09-06")!.outflow).toBe(0);
    expect(r.days.find((d) => d.date === "2026-09-07")!.outflow).toBe(0);
  });
  it("pago de tarjeta sí sale de caja", () => expect(r.days.find((d) => d.date === "2026-09-10")!.outflow).toBe(30));
  it("cierra en el saldo de hoy", () => expect(r.closing).toBe(1000));
  it("totales", () => {
    expect(r.inflow).toBe(500);
    expect(r.outflow).toBe(230);
  });
});
