import { describe, expect, it } from "vitest";
import { buildPortfolio, installmentAmounts, installmentDates, summarizeObligation, type ObligationRecord } from "../src/lib/obligations";

const base: ObligationRecord = {
  id: "o1",
  creditor: "Banco Uno",
  creditor_type: "entity",
  kind: "bank_loan",
  concept: "Libre inversión",
  currency: "COP",
  original_amount: 1_000_000,
  installment_amount: null,
  installments: 3,
  frequency: "monthly",
  first_due_date: "2026-01-31",
  status: "active",
  account_id: null,
};

describe("cronograma", () => {
  it("genera fechas mensuales conservando fin de mes", () => {
    expect(installmentDates(base)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });
  it("reparte el valor original y la última cuota absorbe el redondeo", () => {
    const a = installmentAmounts(base);
    expect(a).toEqual([333_333, 333_333, 333_334]);
    expect(a.reduce((s, x) => s + x, 0)).toBe(1_000_000);
  });
  it("usa la cuota definida (con intereses) para el total a pagar", () => {
    const s = summarizeObligation({ ...base, installment_amount: 400_000 }, 0, "2026-01-01");
    expect(s.totalToPay).toBe(1_200_000);
    expect(s.pending).toBe(1_200_000);
  });
  it("pago único ignora las cuotas", () => {
    expect(installmentDates({ ...base, frequency: "once", installments: 1 })).toEqual(["2026-01-31"]);
  });
});

describe("pagos y estado", () => {
  it("aplica pagos en cascada y detecta vencidas", () => {
    const s = summarizeObligation(base, 400_000, "2026-03-05");
    expect(s.schedule.map((i) => i.status)).toEqual(["paid", "overdue", "pending"]);
    expect(s.schedule[1].remaining).toBe(266_666);
    expect(s.state).toBe("overdue");
    expect(s.overdueAmount).toBe(266_666);
    expect(s.pending).toBe(600_000);
    expect(s.next?.n).toBe(2);
  });
  it("marca por vencer cuando la próxima cuota está cerca", () => {
    const s = summarizeObligation(base, 333_333, "2026-02-25");
    expect(s.state).toBe("due_soon");
    expect(s.installmentsPaid).toBe(1);
  });
  it("queda pagada al cubrir el total y no tiene próximo pago", () => {
    const s = summarizeObligation(base, 1_000_000, "2026-02-01");
    expect(s.state).toBe("paid");
    expect(s.next).toBeNull();
    expect(s.paidPct).toBe(100);
  });
  it("respeta la anulación", () => {
    expect(summarizeObligation({ ...base, status: "cancelled" }, 0, "2026-05-01").state).toBe("cancelled");
  });
});

describe("tablero", () => {
  it("consolida saldos, vencidos, próximos y agrupaciones", () => {
    const a = summarizeObligation(base, 400_000, "2026-03-05");
    const b = summarizeObligation(
      { ...base, id: "o2", creditor: "Ana", creditor_type: "person", kind: "personal", original_amount: 500_000, installments: 1, frequency: "once", first_due_date: "2026-03-20" },
      0,
      "2026-03-05",
    );
    const c = summarizeObligation({ ...base, id: "o3", creditor: "Pagada SA" }, 1_000_000, "2026-03-05");
    const p = buildPortfolio([a, b, c], (v) => v, "2026-03-05", "2026-04-30");
    expect(p.activeCount).toBe(2);
    expect(p.paidCount).toBe(1);
    expect(p.pending).toBe(1_100_000);
    expect(p.overdueCount).toBe(1);
    expect(p.soonCount).toBe(2); // 20-mar y 31-mar
    expect(p.byCreditor[0].label).toBe("Banco Uno");
    expect(p.byCreditorType.map((r) => r.key).sort()).toEqual(["entity", "person"]);
    expect(p.upcoming[0].status).toBe("overdue");
    expect(p.upcoming.map((u) => u.date)).toEqual(["2026-02-28", "2026-03-20", "2026-03-31"]);
  });
});
