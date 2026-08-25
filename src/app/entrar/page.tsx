import Link from "next/link";
import { KronosMark } from "@/components/kronos-mark";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signIn } from "@/app/auth-actions";

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ erro?: string; mensagem?: string }> }) {
  const params = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card">
        <KronosMark />
        <p className="eyebrow">Acesso ao espaço</p>
        <h1>Organize o tempo. Cuide do trabalho.</h1>
        <p>Entre para acessar agenda, atendimentos e indicadores da sua empresa.</p>
        {params.erro ? <div className="form-message form-message--error">{params.erro}</div> : null}
        {params.mensagem ? <div className="form-message form-message--success">{params.mensagem}</div> : null}
        {!isSupabaseConfigured ? <div className="form-message">Modo local: configure o arquivo <code>.env.local</code> para ativar contas reais.</div> : null}
        <form action={signIn} className="auth-form auth-form--login">
          <label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="email" required /></label>
          <label className="field"><span>Senha</span><input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
          <button className="button button--primary" disabled={!isSupabaseConfigured}>Entrar</button>
        </form>
        <Link className="auth-help-link" href="/recuperar-senha">Esqueci minha senha</Link>
        <footer>Ainda não tem uma conta? <Link href="/criar-conta">Criar conta</Link></footer>
        {!isSupabaseConfigured ? <Link className="button button--secondary" href="/onboarding">Explorar demonstração</Link> : null}
      </section>
    </main>
  );
}
