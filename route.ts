import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { endOfMonth, isValidMonth } from "@/lib/dates";

const KIND = { income: "Ingreso", expense: "Gasto", transfer: "Transferencia" } as const;

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  // Evita inyección de fórmulas al abrir en Excel
  const safe = /^[=+\-@\t\r]/.test(s) && isNaN(Number(s)) ? `'${s}` : s;
  return /[";\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const mes = req.nextUrl.searchParams.get("mes");
  let q = supabase
    .from("transactions")
    .select("date, kind, amount, to_amount, description, notes, account_id, to_account_id, category_id, obligation_id")
    .order("date");
  let name = "movimientos-todos";
  if (isValidMonth(mes)) {
    q = q.gte("date", `${mes}-01`).lte("date", endOfMonth(`${mes}-01`));
    name = `movimientos-${mes}`;
  }
  const [{ data: txs }, { data: accounts }, { data: cats }, { data: obls }, { data: classes }] = await Promise.all([
    q.limit(50000),
    supabase.from("accounts").select("id, name, currency"),
    supabase.from("categories").select("id, name, parent_id"),
    supabase.from("obligations").select("id, class_id"),
    supabase.from("obligation_categories").select("id, name"),
  ]);
  // Pagos y desembolsos de obligaciones: no son gasto ni ingreso.
  const oblClass = new Map((obls ?? []).map((o) => [o.id, o.class_id]));
  const className = new Map((classes ?? []).map((c) => [c.id, c.name]));
  const acc = new Map((accounts ?? []).map((a) => [a.id, a]));
  const cat = new Map((cats ?? []).map((c) => [c.id, c]));

  const header = ["Fecha", "Tipo", "Monto", "Moneda", "Cuenta", "Cuenta destino", "Monto destino", "Categoría", "Subcategoría", "Descripción", "Notas"];
  const lines = (txs ?? []).map((t) => {
    const c = t.category_id ? cat.get(t.category_id) : undefined;
    const parent = c?.parent_id ? cat.get(c.parent_id) : undefined;
    const a = acc.get(t.account_id);
    const obl = t.obligation_id;
    const oblCls = obl ? oblClass.get(obl) : null;
    return [
      t.date,
      obl ? (t.kind === "income" ? "Obligación - desembolso" : "Obligación - pago") : KIND[t.kind],
      String(t.amount).replace(".", ","),
      a?.currency ?? "",
      a?.name ?? "",
      t.to_account_id ? (acc.get(t.to_account_id)?.name ?? "") : "",
      t.to_amount ? String(t.to_amount).replace(".", ",") : "",
      obl ? "Obligaciones financieras" : parent ? parent.name : (c?.name ?? ""),
      obl ? (oblCls ? (className.get(oblCls) ?? "") : "") : parent ? c?.name : "",
      t.description ?? "",
      t.notes ?? "",
    ]
      .map(csvCell)
      .join(";");
  });
  const body = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
