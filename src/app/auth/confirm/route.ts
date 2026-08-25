import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const supabase = await createClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("Link de confirmação inválido.") };

  const url = request.nextUrl.clone();
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = next === "/redefinir-senha" ? next : null;
  url.pathname = result.error ? "/entrar" : safeNext ?? (type === "recovery" ? "/redefinir-senha" : "/onboarding");
  url.search = result.error ? "?erro=Não+foi+possível+confirmar+a+conta." : "";
  return NextResponse.redirect(url);
}
