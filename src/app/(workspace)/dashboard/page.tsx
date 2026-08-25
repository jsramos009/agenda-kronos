"use client";

import { CalendarCheck2, CircleCheckBig, ClockArrowUp, UsersRound } from "lucide-react";
import { useNiche } from "@/components/niche-provider";
import { PageHeader, SectionHeading, StatCard, TimeRail } from "@/components/ui";
import { appointments } from "@/lib/niches";

export default function DashboardPage() {
  const { companyName, niche } = useNiche();
  return (
    <>
      <TimeRail />
      <PageHeader eyebrow={`${companyName} · ${niche.label}`} title="Bom dia, Ana." description="Seu dia está bem distribuído. Há uma decisão importante antes das 13h." />
      <section className="stats-grid">
        <StatCard label="Atendimentos hoje" value="23" delta="↑ 12% vs. ontem" icon={<UsersRound size={19} />} />
        <StatCard label="Em andamento" value="08" delta="3 dentro do prazo" icon={<ClockArrowUp size={19} />} />
        <StatCard label="Agendamentos" value="15" delta="84% de ocupação" icon={<CalendarCheck2 size={19} />} />
        <StatCard label="Concluídos" value="18" delta="↑ 10% vs. ontem" icon={<CircleCheckBig size={19} />} />
      </section>
      <section className="dashboard-grid">
        <div className="panel panel--wide">
          <SectionHeading title="Ritmo dos atendimentos" link="Abrir quadro" />
          <div className="mini-kanban">
            {niche.workflow.map((stage, index) => (
              <div key={stage.name} className={`kanban-column tone-${stage.tone}`}>
                <header><strong>{stage.name}</strong><span>{[8, 3, 2, 10][index]}</span></header>
                {["João Silva", "Maria Santos"].map((client, clientIndex) => (
                  <article key={client}><strong>{client}</strong><span>{niche.services[(index + clientIndex) % niche.services.length].name}</span><small>{clientIndex ? "11:20" : "10:15"} · No prazo</small></article>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="panel">
          <SectionHeading title="Próximos horários" link="Ver agenda" />
          <div className="appointment-list">
            {appointments.slice(1).map((appointment) => <article key={appointment.time}><time>{appointment.time}</time><div><strong>{appointment.client}</strong><span>{appointment.service}</span></div><i /></article>)}
          </div>
        </div>
        <div className="panel panel--wide insight-panel">
          <SectionHeading title="A Kronos percebeu" link="Ver 3 insights" />
          <div className="insight-feature"><span>01</span><div><p>OPORTUNIDADE PARA AMANHÃ</p><h3>{niche.insights[0].title}</h3><small>{niche.insights[0].evidence} {niche.insights[0].impact}</small></div><button className="button button--secondary">Ver recomendação</button></div>
        </div>
        <div className="panel knowledge-mini">
          <SectionHeading title="Conhecimento" link="Abrir base" />
          {niche.knowledge.slice(0, 2).map((article, index) => <article key={article.title}><span>0{index + 1}</span><div><strong>{article.title}</strong><small>{article.type}</small></div></article>)}
        </div>
      </section>
    </>
  );
}

