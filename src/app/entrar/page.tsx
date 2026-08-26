import Link from "next/link";
import { KronosMark } from "@/components/kronos-mark";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signIn, signInWithGoogle } from "@/app/auth-actions";

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
        <form action={signInWithGoogle}>
          <button className="button button--google" disabled={!isSupabaseConfigured}><GoogleIcon /> Continuar com Google</button>
        </form>
        <div className="auth-divider"><span>ou entre com e-mail</span></div>
        <form action={signIn} className="auth-form auth-form--login">
          <label className="field"><span>E-mail</span><input name="email" type="email" autoComplete="email" required /></label>
          <label className="field"><span>Senha</span><input name="password" type="password" autoComplete="current-password" minLength={8} required /></label>
          <button className="button button--primary" disabled={!isSupabaseConfigured}>Entrar</button>
        </form>
        <Link className="auth-help-link" href="/recuperar-senha">Esqueci minha senha</Link>
        <footer>Ainda não tem uma conta? <Link href="/criar-conta">Criar conta</Link></footer>
        <Link className="button button--secondary" href="/demonstracao">Explorar demonstração</Link>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4L15.4 17c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.3-2.6Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.8-2.8A9.4 9.4 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>;
}
