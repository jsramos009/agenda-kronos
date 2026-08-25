"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.string().trim().email("Informe um e-mail válido.");

export async function signIn(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  const password = z.string().min(8).safeParse(formData.get("password"));
  if (!email.success || !password.success) redirect("/entrar?erro=Revise+o+e-mail+e+a+senha.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password: password.data });
  if (error) redirect(`/entrar?erro=${encodeURIComponent("E-mail ou senha incorretos.")}`);
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const fullName = z.string().trim().min(2).max(120).safeParse(formData.get("fullName"));
  const email = emailSchema.safeParse(formData.get("email"));
  const password = z.string().min(8).regex(/[A-Za-z]/).regex(/\d/).safeParse(formData.get("password"));

  if (!fullName.success || !email.success || !password.success) {
    redirect("/criar-conta?erro=Preencha+os+campos+e+use+uma+senha+com+8+caracteres,+letras+e+números.");
  }

  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signUp({
    email: email.data,
    password: password.data,
    options: {
      data: { full_name: fullName.data },
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  });

  if (error) redirect(`/criar-conta?erro=${encodeURIComponent(error.message)}`);
  if (data.session) redirect("/onboarding");
  redirect("/entrar?mensagem=Confira+seu+e-mail+para+confirmar+a+conta.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}
