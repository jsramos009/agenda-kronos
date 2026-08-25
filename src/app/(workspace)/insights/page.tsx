"use client";

import { ArrowRight, Check, Clock3, Sparkles, X } from "lucide-react";
import { useNiche } from "@/components/niche-provider";
import { PageHeader } from "@/components/ui";

export default function InsightsPage() {
  const { niche } = useNiche();
  return (
    <>
      <PageHeader eyebrow="Inteligência · Sob seu controle" title="Insights" description={`Sugestões explicadas a partir da sua operação e do modelo de ${niche.label.toLowerCase()}.`} action={null} />
      <div className="tabs"><button className="active">Novos <span>3</span></button><button>Aplicados</button><button>Dispensados</button></div>
      <section className="insights-list">
        {niche.insights.map((insight, index) => <article key={insight.title}><div className="insight-index"><Sparkles size={18} /><span>0{index + 1}</span></div><div className="insight-copy"><p>{index === 0 ? "OPORTUNIDADE" : index === 1 ? "PADRÃO IDENTIFICADO" : "AJUSTE SUGERIDO"}</p><h2>{insight.title}</h2><span>{insight.evidence}</span><div><small><strong>Impacto</strong>{insight.impact}</small><small><strong>Origem</strong>{index === 0 ? "Sua agenda" : `Modelo de ${niche.label}`}</small><small><strong>Esforço</strong>{index === 2 ? "10 minutos" : "2 minutos"}</small></div></div><aside><button className="button button--primary">Revisar e aplicar <ArrowRight size={16} /></button><button className="button button--ghost"><Clock3 size={15} /> Lembrar depois</button><button className="dismiss"><X size={14} /> Dispensar</button></aside></article>)}
      </section>
      <p className="insight-note"><Check size={15} /> Nenhuma mudança é aplicada sem sua confirmação.</p>
    </>
  );
}

