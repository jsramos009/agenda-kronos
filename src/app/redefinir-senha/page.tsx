import type { Metadata } from "next";
import { updatePassword } from "@/app/auth-actions";
import { KronosMark } from "@/components/kronos-mark";

export const metadata: Metadata = { title: "Criar nova senha | Kronos" };

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <main className="auth-page"><section className="auth-card"><KronosMark /><p className="eyebrow">Nova senha</p><h1>Proteja novamente sua conta.</h1><p>Use ao menos oito caracteres, incluindo letras e números.</p>{erro ? <div className="form-message form-message--error">{erro}</div> : null}<form action={updatePassword} className="auth-form auth-form--login"><label className="field"><span>Nova senha</span><input name="password" type="password" autoComplete="new-password" minLength={8} required /></label><label className="field"><span>Repita a senha</span><input name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></label><button className="button button--primary">Atualizar senha</button></form></section></main>;
}
