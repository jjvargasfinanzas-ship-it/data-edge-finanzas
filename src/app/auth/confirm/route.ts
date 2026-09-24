import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Verificación de correo, recuperación de contraseña y retorno de OAuth.
 * Soporta los dos formatos de enlace de Supabase:
 *  - ?token_hash=...&type=...  (plantillas de correo recomendadas)
 *  - ?code=...                  (PKCE / OAuth)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/inicio";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/inicio";

  const supabase = await createClient();
  let ok = false;

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  if (ok) return NextResponse.redirect(`${origin}${type === "recovery" ? "/nueva-clave" : next}`);
  return NextResponse.redirect(`${origin}/login?error=link`);
}
