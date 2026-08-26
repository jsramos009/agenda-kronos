"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

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

  if (error) redirect(`/criar-conta?erro=${encodeURIComponent("Não foi possível criar a conta. Revise os dados ou tente entrar.")}`);
  if (data.session) redirect("/onboarding");
  redirect("/entrar?mensagem=Confira+seu+e-mail+para+confirmar+a+conta.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/entrar");
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) redirect("/entrar?erro=Conecte+o+Supabase+para+usar+o+Google.");
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${siteUrl}/auth/confirm?next=/dashboard`,
      queryParams: { access_type: "offline", prompt: "select_account" },
    },
  });
  if (error || !data.url) redirect("/entrar?erro=O+login+com+Google+ainda+não+está+disponível.");
  redirect(data.url);
}

export async function requestPasswordReset(formData: FormData) {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) redirect("/recuperar-senha?erro=Informe+um+e-mail+válido.");
  if (!isSupabaseConfigured) redirect("/recuperar-senha?mensagem=Fluxo+de+recuperação+pronto.+Conecte+o+Supabase+para+enviar+o+e-mail.");
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${siteUrl}/auth/confirm?next=/redefinir-senha` });
  if (error) redirect(`/recuperar-senha?erro=${encodeURIComponent("Não foi possível enviar o link. Tente novamente.")}`);
  redirect("/recuperar-senha?mensagem=Se+o+e-mail+estiver+cadastrado,+você+receberá+um+link+de+recuperação.");
}

export async function updatePassword(formData: FormData) {
  const password = z.string().min(8).regex(/[A-Za-z]/).regex(/\d/).safeParse(formData.get("password"));
  const confirmation = formData.get("confirmation");
  if (!password.success || password.data !== confirmation) redirect("/redefinir-senha?erro=Use+8+caracteres,+letras+e+números,+e+repita+a+mesma+senha.");
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error) redirect(`/redefinir-senha?erro=${encodeURIComponent("Não foi possível atualizar a senha. Solicite um novo link.")}`);
  redirect("/entrar?mensagem=Senha+atualizada.+Entre+com+os+novos+dados.");
}
