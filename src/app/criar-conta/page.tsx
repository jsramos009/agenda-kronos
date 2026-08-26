import Link from "next/link";
import { KronosMark } from "@/components/kronos-mark";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signInWithGoogle, signUp } from "@/app/auth-actions";

export default async function CriarContaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return (
    <main className="auth-page">
      <section className="auth-card auth-card--signup">
        <KronosMark />
        <p className="eyebrow">Comece pela sua operação</p>
        <h1>Um sistema que aprende o seu jeito de atender.</h1>
        <p>Crie sua conta. Na etapa seguinte, a Kronos monta o primeiro espaço para o seu nicho.</p>
        {erro ? <div className="form-message form-message--error">{erro}</div> : null}
        {!isSupabaseConfigured ? <div className="form-message">O cadastro real fica disponível após conectar um projeto Supabase.</div> : null}
        <form action={signInWithGoogle}>
          <button className="button button--google" disabled={!isSupabaseConfigured}><GoogleIcon /> Criar conta com Google</button>
        </form>
        <div className="auth-divider"><span>ou use seu e-mail</span></div>
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

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.8 3-4.3 3-7.3Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4L15.4 17c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.3-2.6Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.9 1.5l2.8-2.8A9.4 9.4 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6C7.2 7.8 9.4 6 12 6Z"/></svg>;
}
