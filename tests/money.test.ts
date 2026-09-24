import { describe, expect, it } from "vitest";
import { buildRateTable, convert, parseAmountInput, pctChange } from "@/lib/money";

describe("parseAmountInput", () => {
  it.each([
    ["8.500.000", 8500000],
    ["45000", 45000],
    ["$ 45.000", 45000],
    ["1.234,56", 1234.56],
    ["12.5", 12.5],
    ["abc", NaN],
  ])("%s → %s", (raw, expected) => {
    expect(parseAmountInput(raw)).toEqual(expected);
  });
});

describe("tasas", () => {
  const rates = buildRateTable([
    { base: "USD", quote: "COP", rate: 4000, rate_date: "2026-09-20", user_id: null },
    { base: "USD", quote: "COP", rate: 3200, rate_date: "2026-09-23", user_id: null },
    { base: "USD", quote: "COP", rate: 3300, rate_date: "2026-09-23", user_id: "u1" },
    { base: "EUR", quote: "COP", rate: 3600, rate_date: "2026-09-23", user_id: null },
  ]);
  it("usa la más reciente y prefiere la manual", () => expect(rates.USD).toBe(3300));
  it("convierte USD → COP", () => expect(convert(10, "USD", "COP", rates)).toBe(33000));
  it("convierte cruzado EUR → USD", () => expect(convert(33, "EUR", "USD", rates)).toBeCloseTo(36));
  it("variación", () => {
    expect(pctChange(110, 100)).toBeCloseTo(10);
    expect(pctChange(5, 0)).toBeNull();
  });
});

import { formatMoney } from "@/lib/money";
describe("formatMoney compacto", () => {
  it.each([
    [154166, "$ 154 mil"],
    [1850000, "$ 1,9 M"],
    [3000000, "$ 3 M"],
    [-2300000000, "−$ 2.300 M"],
    [950, "$ 950"],
  ])("%s → %s", (v, s) => expect(formatMoney(v, "COP", { compact: true })).toBe(s));
  it("USD", () => expect(formatMoney(2500, "USD", { compact: true })).toBe("USD 3 mil"));
});
