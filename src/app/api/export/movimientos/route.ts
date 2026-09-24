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
    .select("date, kind, amount, to_amount, description, notes, account_id, to_account_id, category_id")
    .order("date");
  let name = "movimientos-todos";
  if (isValidMonth(mes)) {
    q = q.gte("date", `${mes}-01`).lte("date", endOfMonth(`${mes}-01`));
    name = `movimientos-${mes}`;
  }
  const [{ data: txs }, { data: accounts }, { data: cats }] = await Promise.all([
    q.limit(50000),
    supabase.from("accounts").select("id, name, currency"),
    supabase.from("categories").select("id, name, parent_id"),
  ]);
  const acc = new Map((accounts ?? []).map((a) => [a.id, a]));
  const cat = new Map((cats ?? []).map((c) => [c.id, c]));

  const header = ["Fecha", "Tipo", "Monto", "Moneda", "Cuenta", "Cuenta destino", "Monto destino", "Categoría", "Subcategoría", "Descripción", "Notas"];
  const lines = (txs ?? []).map((t) => {
    const c = t.category_id ? cat.get(t.category_id) : undefined;
    const parent = c?.parent_id ? cat.get(c.parent_id) : undefined;
    const a = acc.get(t.account_id);
    return [
      t.date,
      KIND[t.kind],
      String(t.amount).replace(".", ","),
      a?.currency ?? "",
      a?.name ?? "",
      t.to_account_id ? (acc.get(t.to_account_id)?.name ?? "") : "",
      t.to_amount ? String(t.to_amount).replace(".", ",") : "",
      parent ? parent.name : (c?.name ?? ""),
      parent ? c?.name : "",
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
