import type { Metadata } from "next";
import { FaqExplorer } from "@/components/faq-explorer";
import { MarketingFooter, MarketingHeader } from "@/components/marketing-shell";

export const metadata: Metadata = { title: "Perguntas frequentes | Kronos", description: "Respostas sobre contas, agenda, personalização e segurança na Kronos." };

export default function FaqPage() {
  return <main className="marketing-page"><MarketingHeader /><section className="faq-hero"><p className="eyebrow">Central de ajuda</p><h1>Perguntas claras para decisões tranquilas.</h1><p>Pesquise por assunto, veja a resposta completa e envie uma nova pergunta quando precisar.</p></section><FaqExplorer /><MarketingFooter /></main>;
}
