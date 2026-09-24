import { describe, expect, it } from "vitest";
import { buildPlanRows, summarizePlan, type PlanItem } from "@/lib/month-plan";

const item = (x: Partial<PlanItem>): PlanItem => ({
  id: "x", kind: "income", name: "x", amount: 0, account_id: "bank", to_account_id: null, category_id: null,
  frequency: "monthly", start_date: "2026-01-01", end_date: null, is_active: true, ...x,
});

describe("programado vs real", () => {
  const planned = [
    item({ id: "sal", name: "Salario", amount: 3_000_000, start_date: "2026-01-15" }),
    item({ id: "hon", name: "Honorarios", amount: 1_000_000, start_date: "2026-01-10" }),
    item({ id: "com", name: "Comisión", amount: 500_000, start_date: "2026-01-30" }),
    item({ id: "arr", kind: "expense", name: "Arriendo", amount: 2_000_000, start_date: "2026-01-01" }),
    item({ id: "gym", kind: "expense", name: "Gimnasio", amount: 150_000, start_date: "2026-01-05" }),
    item({ id: "luz", kind: "expense", name: "Energía", amount: 200_000, start_date: "2026-01-24" }),
  ];
  const rows = buildPlanRows({
    planned,
    settlements: [
      { planned_item_id: "sal", planned_date: "2026-09-15", received: 2_800_000, status: null },
      { planned_item_id: "arr", planned_date: "2026-09-01", received: 2_000_000, status: null },
      { planned_item_id: "gym", planned_date: "2026-09-05", received: 0, status: "skipped" },
    ],
    from: "2026-09-01",
    to: "2026-09-30",
    today: "2026-09-24",
  });
  const by = (id: string) => rows.find((r) => r.plannedItemId === id)!;

  it("estados", () => {
    expect(by("sal").status).toBe("partial");
    expect(by("sal").pending).toBe(200_000);
    expect(by("hon").status).toBe("overdue");
    expect(by("com").status).toBe("upcoming");
    expect(by("arr").status).toBe("done");
    expect(by("gym").status).toBe("skipped");
    expect(by("luz").status).toBe("today");
  });

  it("resumen de ingresos", () => {
    const s = summarizePlan(rows, "income", (v) => v);
    expect(s.planned).toBe(4_500_000);
    expect(s.received).toBe(2_800_000);
    expect(s.pending).toBe(1_700_000);
    expect(s.countOverdue).toBe(1);
  });

  it("resumen de gastos excluye omitidos", () => {
    const s = summarizePlan(rows, "expense", (v) => v);
    expect(s.planned).toBe(2_200_000);
    expect(s.received).toBe(2_000_000);
    expect(s.pending).toBe(200_000);
    expect(s.countDone).toBe(1);
  });

  it("cerrado con diferencia", () => {
    const r = buildPlanRows({
      planned: [item({ id: "sal", amount: 3_000_000, start_date: "2026-09-15", frequency: "once" })],
      settlements: [{ planned_item_id: "sal", planned_date: "2026-09-15", received: 2_800_000, status: "closed" }],
      from: "2026-09-01", to: "2026-09-30", today: "2026-09-24",
    })[0];
    expect(r.status).toBe("closed");
    expect(r.pending).toBe(0);
    expect(r.difference).toBe(-200_000);
  });
});
