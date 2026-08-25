import Link from "next/link";
import { ArrowRight, CalendarCheck2, LayoutDashboard, Sparkles } from "lucide-react";
import { KronosMark } from "@/components/kronos-mark";

export default function Home() {
  return (
    <main className="landing-page">
      <nav><KronosMark /><div><Link href="/entrar">Entrar</Link><Link className="button button--primary" href="/criar-conta">Começar agora</Link></div></nav>
      <section className="landing-hero">
        <p className="eyebrow">Agenda adaptativa para negócios de serviço</p>
        <h1>Seu nicho.<br />Seu ritmo.<br /><em>Seu sistema.</em></h1>
        <p>A Kronos transforma o modo como sua empresa atende em agenda, fluxo de trabalho e decisões claras — sem exigir que você monte tudo do zero.</p>
        <div><Link className="button button--primary" href="/criar-conta">Criar meu espaço <ArrowRight size={17} /></Link><Link className="button button--secondary" href="/onboarding">Ver demonstração</Link></div>
      </section>
      <section className="landing-proof">
        <article><CalendarCheck2 /><strong>Agenda sem conflito</strong><span>Disponibilidade, recursos e deslocamento no mesmo motor.</span></article>
        <article><LayoutDashboard /><strong>Operação em um olhar</strong><span>Kanban e indicadores usam a mesma fonte de dados.</span></article>
        <article><Sparkles /><strong>Configuração por nicho</strong><span>Vocabulário, serviços e insights que fazem sentido para você.</span></article>
      </section>
    </main>
  );
}
