"use client";

import { ArrowDownRight, ArrowUpRight, Download } from "lucide-react";
import { PageHeader } from "@/components/ui";

const bars = [42, 58, 47, 76, 68, 84, 62, 91, 73, 86, 78, 94];

export default function RelatoriosPage() {
  return (
    <>
      <PageHeader eyebrow="Análise · Operação" title="Relatórios" description="Veja onde o tempo rende mais e onde a operação pede ajuste." action={null} />
      <div className="toolbar"><div className="filter-pills"><button>Últimos 7 dias</button><button className="active">Últimos 30 dias</button><button>Este ano</button></div><button className="chip"><Download size={15} /> Exportar</button></div>
      <section className="report-stats"><article><span>Ocupação da agenda</span><strong>84%</strong><small className="positive"><ArrowUpRight size={14} /> 6,2%</small></article><article><span>Taxa de faltas</span><strong>4,8%</strong><small className="positive"><ArrowDownRight size={14} /> 1,4%</small></article><article><span>Tempo médio</span><strong>1h12</strong><small className="neutral">Estável</small></article><article><span>Receita estimada</span><strong>R$ 18,4 mil</strong><small className="positive"><ArrowUpRight size={14} /> 9,1%</small></article></section>
      <section className="reports-grid"><article className="panel report-chart"><div className="section-heading"><div><p className="eyebrow">OCUPAÇÃO</p><h2>Ritmo das últimas semanas</h2></div><span>Média 78%</span></div><div className="bar-chart">{bars.map((bar, index) => <div key={index}><i style={{ height: `${bar}%` }} /><span>{index % 2 ? "" : `${index + 1}/8`}</span></div>)}</div></article><article className="panel distribution"><div className="section-heading"><div><p className="eyebrow">DISTRIBUIÇÃO</p><h2>Tempo por etapa</h2></div></div>{[["Em atendimento", "42%"], ["Deslocamento/espera", "24%"], ["Aguardando confirmação", "18%"], ["Concluído/registro", "16%"]].map(([label, value], index) => <div key={label}><span><i style={{ opacity: 1 - index * 0.18 }} />{label}</span><strong>{value}</strong></div>)}</article></section>
    </>
  );
}

