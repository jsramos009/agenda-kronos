"use client";

import { Check, Palette, RotateCcw } from "lucide-react";
import { useNiche } from "@/components/niche-provider";
import { PageHeader } from "@/components/ui";
import { nicheList, type NicheId } from "@/lib/niches";

export default function ConfiguracoesPage() {
  const { niche, nicheId, setNicheId, companyName, setCompanyName } = useNiche();
  return (
    <>
      <PageHeader eyebrow="Sistema · Personalização" title="Identidade e nicho" description="Ajuste como a Kronos representa a sua operação. Veja as mudanças em tempo real." action={null} />
      <section className="settings-layout">
        <nav><button className="active">Empresa e marca</button><button>Nicho e modelos</button><button>Agenda</button><button>Equipe e acesso</button><button>Notificações</button><button>Kanban</button><button>Segurança</button></nav>
        <div className="settings-panel">
          <section><div className="settings-heading"><div><h2>Dados da empresa</h2><p>Informações exibidas no sistema e em comunicações.</p></div></div><div className="form-grid"><label className="field"><span>Nome da empresa</span><input value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></label><label className="field"><span>Nicho atual</span><select value={nicheId} onChange={(event) => setNicheId(event.target.value as NicheId)}>{nicheList.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select></label></div></section>
          <section><div className="settings-heading"><div><h2>Tabela de cores</h2><p>As cores específicas de {niche.label.toLowerCase()} preservam contraste e reconhecimento.</p></div><span><Palette size={17} /> Modelo do nicho</span></div><div className="settings-swatches">{Object.entries(niche.theme).map(([name, color]) => <div key={name}><i style={{ background: color }} /><span>{name}</span><small>{color}</small></div>)}</div><div className="settings-note"><Check size={16} /><p><strong>Contraste aprovado</strong><span>Os controles e textos atendem à referência WCAG AA.</span></p></div></section>
          <footer><button className="button button--ghost"><RotateCcw size={16} /> Restaurar modelo</button><button className="button button--primary">Salvar alterações</button></footer>
        </div>
        <aside className="settings-preview"><p className="eyebrow">PRÉVIA EM TEMPO REAL</p><div className="preview-card"><span>Hoje · 10:30</span><h3>Maria Santos</h3><p>{niche.services[0].name}</p><div><em>Confirmado</em><strong>{niche.services[0].duration}</strong></div></div><button className="button button--primary">Ação principal</button><small>A assinatura Kronos permanece constante.</small></aside>
      </section>
    </>
  );
}

