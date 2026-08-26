"use client";

import { useMemo, useState, useTransition } from "react";
import { Activity, CalendarDays, Search, ShieldCheck, UserCheck, UsersRound } from "lucide-react";
import { setMemberAccess } from "@/app/(workspace)/actions";
import { PageHeader } from "@/components/ui";

export type AdminPerson = { id: string; name: string; email?: string; role: string; active: boolean; protected?: boolean };
export type AdminEvent = { id: string; action: string; createdAt: string };
type AdminStats = { activePeople: number; pendingInvites: number; customers: number; appointments: number };

export function AdminManager({ companyName, initialPeople, events, stats, demo }: { companyName: string; initialPeople: AdminPerson[]; events: AdminEvent[]; stats: AdminStats; demo: boolean }) {
  const [people, setPeople] = useState(initialPeople);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const [feedback, setFeedback] = useState("");
  const [updating, startUpdating] = useTransition();
  const filtered = useMemo(() => people.filter((person) => `${person.name} ${person.email ?? ""} ${person.role}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")) && (status === "all" || (status === "active" ? person.active : !person.active))), [people, query, status]);

  const toggleAccess = (person: AdminPerson) => {
    if (person.protected) return;
    const next = !person.active;
    const previous = people;
    setPeople((current) => current.map((item) => item.id === person.id ? { ...item, active: next } : item));
    if (demo) { setFeedback(next ? "Acesso reativado na demonstração." : "Acesso suspenso na demonstração."); return; }
    startUpdating(async () => {
      const result = await setMemberAccess(person.id, next);
      setFeedback(result.message);
      if (result.status === "error") setPeople(previous);
    });
  };

  return <>
    <PageHeader eyebrow="Administração · Acessos" title="Painel administrativo" description={`Pessoas, permissões e atividade de ${companyName} em uma visão clara.`} action={null} />
    <section className="admin-stats">
      <article><span><UserCheck size={20} /></span><small>Pessoas ativas</small><strong>{people.filter((person) => person.active).length || stats.activePeople}</strong><p>{stats.pendingInvites} convites pendentes</p></article>
      <article><span><UsersRound size={20} /></span><small>Clientes cadastrados</small><strong>{stats.customers}</strong><p>Isolados neste workspace</p></article>
      <article><span><CalendarDays size={20} /></span><small>Agendamentos</small><strong>{stats.appointments}</strong><p>Volume total registrado</p></article>
      <article><span><ShieldCheck size={20} /></span><small>Política do plano</small><strong>2</strong><p>Agendas por proprietário</p></article>
    </section>
    <section className="admin-layout">
      <div className="panel admin-access-panel">
        <div className="section-heading"><div><p className="eyebrow">Controle de acesso</p><h2>Quem pode entrar</h2></div><span>{people.length} pessoas</span></div>
        <div className="admin-toolbar"><label className="inline-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar pessoa, papel ou e-mail…" /></label><div className="filter-pills">{(["all", "active", "suspended"] as const).map((item) => <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>{item === "all" ? "Todos" : item === "active" ? "Ativos" : "Suspensos"}</button>)}</div></div>
        {feedback ? <p className="admin-feedback" aria-live="polite">{updating ? "Atualizando acesso…" : feedback}</p> : null}
        <div className="admin-people-list">{filtered.map((person) => <article key={person.id}><span>{person.name.slice(0, 2).toUpperCase()}</span><div><strong>{person.name}</strong><small>{person.email ?? "Membro do workspace"}</small></div><em>{person.role}</em><i className={person.active ? "active" : "suspended"}>{person.active ? "Ativo" : "Suspenso"}</i><button disabled={person.protected || updating} onClick={() => toggleAccess(person)}>{person.protected ? "Protegido" : person.active ? "Suspender" : "Reativar"}</button></article>)}{!filtered.length ? <p className="empty-state">Nenhuma pessoa corresponde aos filtros.</p> : null}</div>
      </div>
      <aside className="panel admin-activity"><div className="section-heading"><div><p className="eyebrow">Auditoria</p><h2>Atividade recente</h2></div><Activity size={18} /></div>{events.map((event) => <article key={event.id}><i /><div><strong>{event.action}</strong><time>{formatDate(event.createdAt)}</time></div></article>)}{!events.length ? <p className="empty-state">As alterações administrativas aparecerão aqui.</p> : null}</aside>
    </section>
  </>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(value));
}
