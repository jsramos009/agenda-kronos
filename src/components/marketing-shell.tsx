import Link from "next/link";
import { KronosMark } from "@/components/kronos-mark";

export function MarketingHeader() {
  return (
    <header className="marketing-header">
      <Link href="/" aria-label="Kronos — página inicial"><KronosMark /></Link>
      <nav aria-label="Navegação pública">
        <Link href="/#como-funciona">Como funciona</Link>
        <Link href="/#nichos">Nichos</Link>
        <Link href="/faq">FAQ</Link>
      </nav>
      <div className="marketing-header__actions"><Link href="/entrar">Entrar</Link><Link className="button button--primary" href="/criar-conta">Criar meu espaço</Link></div>
    </header>
  );
}

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div><KronosMark /><p>Agenda, operação e decisões moldadas ao jeito que cada empresa atende.</p></div>
      <nav aria-label="Links institucionais"><Link href="/faq">Central de ajuda</Link><Link href="/entrar">Entrar</Link><Link href="/criar-conta">Criar conta</Link></nav>
      <small>© 2026 Kronos · <Link href="/privacidade">Privacidade</Link> · <Link href="/termos">Termos de uso</Link></small>
    </footer>
  );
}
