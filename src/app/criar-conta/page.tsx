import Link from "next/link";
import { KronosMark } from "@/components/kronos-mark";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signUp } from "@/app/auth-actions";

export default async function CriarContaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <KronosMark />
        <p className="eyebrow">Comece pela sua operação</p>
        <h1>Um sistema que aprende o seu jeito de atender.</h1>
        <p>Crie sua conta. Na etapa seguinte, a Kronos monta o primeiro espaço para o seu nicho.</p>
        {erro ? <div className="form-message form-message--error">{erro}</div> : null}
        {!isSupabaseConfigured ? <div className="form-message">O cadastro real fica disponível após conectar um projeto Supabase.</div> : null}
        <form action={signUp} className="auth-form">
          <label className="field"><span>Seu nome</span><input name="fullName" autoComplete="name" required /></label>
          <label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="email" required /></label>
          <label className="field"><span>Senha</span><input name="password" type="password" autoComplete="new-password" minLength={8} required /><small>8 caracteres, com letras e números.</small></label>
          <button className="button button--primary" disabled={!isSupabaseConfigured}>Criar minha conta</button>
        </form>
        <footer>Já usa a Kronos? <Link href="/entrar">Entrar</Link></footer>
      </section>
    </main>
  );
}
