import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Actualiza las tasas globales (base → COP).
 * - USD: TRM oficial de la Superintendencia Financiera (datos.gov.co).
 * - EUR, MXN, GBP: cruce con tasas de referencia de open.er-api.com sobre la TRM.
 * Vercel Cron lo llama con Authorization: Bearer $CRON_SECRET.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const trmRes = await fetch(
      "https://www.datos.gov.co/resource/32sa-8pi3.json?$order=vigenciadesde%20DESC&$limit=1",
      { cache: "no-store" },
    );
    const [trm] = (await trmRes.json()) as { valor: string; vigenciadesde: string }[];
    const usdCop = Number(trm?.valor);
    if (!usdCop) throw new Error("TRM no disponible");
    const rateDate = trm.vigenciadesde.slice(0, 10);

    const fxRes = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
    const fx = (await fxRes.json()) as { result: string; rates: Record<string, number> };

    const rows = [{ base: "USD" as const, rate: usdCop, source: "trm-superfinanciera" }];
    if (fx.result === "success") {
      for (const c of ["EUR", "MXN", "GBP"] as const) {
        const perUsd = fx.rates[c];
        if (perUsd) rows.push({ base: c as never, rate: Math.round((usdCop / perUsd) * 10000) / 10000, source: "open-er-api+trm" });
      }
    }

    const admin = createAdminClient();
    // Tasas globales: user_id nulo
    for (const r of rows) {
      await admin.from("exchange_rates").delete().is("user_id", null).eq("base", r.base).eq("quote", "COP").eq("rate_date", rateDate);
    }
    const { error } = await admin
      .from("exchange_rates")
      .insert(rows.map((r) => ({ ...r, quote: "COP" as const, rate_date: rateDate, user_id: null })));
    if (error) throw error;

    return NextResponse.json({ ok: true, rate_date: rateDate, rates: rows });
  } catch (e) {
    console.error("[cron:exchange-rates]", e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
