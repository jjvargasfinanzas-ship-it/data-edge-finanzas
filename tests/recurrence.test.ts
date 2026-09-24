import { describe, expect, it } from "vitest";
import { nextDayOfMonth, occurrencesBetween } from "@/lib/recurrence";

describe("occurrencesBetween", () => {
  it("mensual conserva el día y ajusta fin de mes", () => {
    expect(
      occurrencesBetween({ frequency: "monthly", start_date: "2026-01-31" }, "2026-01-01", "2026-05-31"),
    ).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30", "2026-05-31"]);
  });

  it("mensual con inicio anterior al rango", () => {
    expect(
      occurrencesBetween({ frequency: "monthly", start_date: "2025-03-05" }, "2026-09-24", "2026-11-30"),
    ).toEqual(["2026-10-05", "2026-11-05"]);
  });

  it("quincenal: 15 y último día", () => {
    expect(
      occurrencesBetween({ frequency: "semimonthly", start_date: "2026-09-01" }, "2026-09-01", "2026-10-31"),
    ).toEqual(["2026-09-15", "2026-09-30", "2026-10-15", "2026-10-31"]);
  });

  it("semanal respeta fecha final", () => {
    expect(
      occurrencesBetween(
        { frequency: "weekly", start_date: "2026-09-01", end_date: "2026-09-20" },
        "2026-09-10",
        "2026-12-31",
      ),
    ).toEqual(["2026-09-15"]);
  });

  it("cada 14 días desde inicio lejano", () => {
    expect(
      occurrencesBetween({ frequency: "biweekly", start_date: "2026-01-02" }, "2026-09-20", "2026-10-20"),
    ).toEqual(["2026-09-25", "2026-10-09"]);
  });

  it("único fuera de rango", () => {
    expect(occurrencesBetween({ frequency: "once", start_date: "2026-01-01" }, "2026-02-01", "2026-03-01")).toEqual([]);
  });

  it("anual en año bisiesto", () => {
    expect(
      occurrencesBetween({ frequency: "yearly", start_date: "2024-02-29" }, "2025-01-01", "2028-12-31"),
    ).toEqual(["2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]);
  });
});

describe("nextDayOfMonth", () => {
  it("mismo mes si no ha pasado", () => expect(nextDayOfMonth(30, "2026-09-24")).toBe("2026-09-30"));
  it("mes siguiente si ya pasó", () => expect(nextDayOfMonth(5, "2026-09-24")).toBe("2026-10-05"));
  it("día 31 en mes corto", () => expect(nextDayOfMonth(31, "2026-11-10")).toBe("2026-11-30"));
});
