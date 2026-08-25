import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Mail } from "lucide-react";
import { requestPasswordReset } from "@/app/auth-actions";
import { KronosMark } from "@/components/kronos-mark";

export const metadata: Metadata = { title: "Recuperar senha | Kronos" };

export default async function RecuperarSenhaPage({ searchParams }: { searchParams: Promise<{ erro?: string; mensagem?: string }> }) {
  const params = await searchParams;
  return <main className="auth-page"><section className="auth-card"><KronosMark /><p className="eyebrow">Recuperação de acesso</p><h1>Receba um link seguro.</h1><p>Informe o e-mail usado na conta. Não confirmamos publicamente se ele está cadastrado.</p>{params.erro ? <div className="form-message form-message--error">{params.erro}</div> : null}{params.mensagem ? <div className="form-message form-message--success">{params.mensagem}</div> : null}<form action={requestPasswordReset} className="auth-form auth-form--login"><label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="email" required /></label><button className="button button--primary"><Mail size={16} /> Enviar link de recuperação</button></form><footer><Link href="/entrar"><ArrowLeft size={14} /> Voltar para entrar</Link></footer></section></main>;
}
