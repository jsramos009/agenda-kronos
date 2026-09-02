import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";

export async function POST(request: NextRequest) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin) return new NextResponse("Origem inválida.", { status: 403 });

  const response = NextResponse.redirect(
    new URL("/entrar?mensagem=Você+saiu+da+sua+conta+com+segurança.", request.url),
    { status: 303 },
  );
  if (isSupabaseConfigured) {
    const { supabaseUrl, supabasePublishableKey } = getSupabaseConfig();
    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
      },
    });
    await supabase.auth.signOut({ scope: "local" });
  }
  const expiredCookie = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 };
  response.cookies.set("kronos_demo", "", expiredCookie);
  response.cookies.set("kronos_workspace", "", expiredCookie);
  return response;
}
