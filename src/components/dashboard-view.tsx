"use client";

import { CalendarCheck2, CircleCheckBig, ClockArrowUp, UsersRound } from "lucide-react";
import { useNiche } from "@/components/niche-provider";
import { PageHeader, SectionHeading, StatCard, TimeRail } from "@/components/ui";
import { dashboardGreeting } from "@/lib/dashboard-greeting";

export type DashboardData = {
  today: number;
  inProgress: number;
  scheduled: number;
  completed: number;
  stageCounts: Record<string, number>;
  upcoming: { id: string; time: string; client: string; service: string }[];
};

export function DashboardView({ data, userName, localHour }: { data: DashboardData; userName: string; localHour: number }) {
  const { companyName, niche } = useNiche();
  const greeting = dashboardGreeting(localHour, userName, data.upcoming.length);
  return (
    <>
      <TimeRail />
      <PageHeader eyebrow={`${companyName} · ${niche.label}`} title={greeting.headline} description={greeting.welcome} actionHref="/agenda" />
      <section className="stats-grid">
        <StatCard href="/relatorios?metrica=atendimentos" label="Atendimentos hoje" value={pad(data.today)} delta="Agenda do dia" icon={<UsersRound size={19} />} />
        <StatCard href="/atendimentos" label="Em andamento" value={pad(data.inProgress)} delta="Atualizado pelo kanban" icon={<ClockArrowUp size={19} />} />
        <StatCard href="/agenda" label="Agendamentos" value={pad(data.scheduled)} delta="Aguardando execução" icon={<CalendarCheck2 size={19} />} />
        <StatCard href="/relatorios?metrica=concluidos" label="Concluídos" value={pad(data.completed)} delta="Histórico preservado" icon={<CircleCheckBig size={19} />} />
      </section>
      <section className="dashboard-grid">
        <div className="panel panel--wide">
          <SectionHeading title="Ritmo dos atendimentos" link="Abrir quadro" href="/atendimentos" />
          <div className="mini-kanban">
            {niche.workflow.map((stage) => <div key={stage.name} className={`kanban-column tone-${stage.tone}`}><header><strong>{stage.name}</strong><span>{data.stageCounts[stage.name] ?? 0}</span></header><article><strong>Visão consolidada</strong><span>{data.stageCounts[stage.name] ?? 0} item(ns) nesta etapa</span><small>Fonte: kanban</small></article></div>)}
          </div>
        </div>
        <div className="panel">
          <SectionHeading title="Próximos horários" link="Ver agenda" href="/agenda" />
          <p className="dashboard-schedule-message">{greeting.scheduleMessage}</p>
          <div className="appointment-list">
            {data.upcoming.length ? data.upcoming.map((appointment) => <article key={appointment.id}><time>{appointment.time}</time><div><strong>{appointment.client}</strong><span>{appointment.service}</span></div><i /></article>) : <p className="muted-copy">Nenhum próximo horário.</p>}
          </div>
        </div>
        <div className="panel panel--wide insight-panel">
          <SectionHeading title="A Kronos percebeu" link="Ver insights" href="/insights" />
          <div className="insight-feature"><span>01</span><div><p>OPORTUNIDADE</p><h3>{niche.insights[0].title}</h3><small>{niche.insights[0].evidence} {niche.insights[0].impact}</small></div><a className="button button--secondary" href="/insights">Ver recomendação</a></div>
        </div>
        <div className="panel knowledge-mini">
          <SectionHeading title="Conhecimento" link="Abrir base" href="/conhecimento" />
          {niche.knowledge.slice(0, 2).map((article, index) => <article key={article.title}><span>0{index + 1}</span><div><strong>{article.title}</strong><small>{article.type}</small></div></article>)}
        </div>
      </section>
    </>
  );
}

function pad(value: number) { return String(value).padStart(2, "0"); }
