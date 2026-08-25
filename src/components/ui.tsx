"use client";

import { ArrowUpRight, CalendarPlus, Clock3, Plus } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action = "Novo agendamento" }: { eyebrow: string; title: string; description: string; action?: string | null }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <button className="button button--primary"><CalendarPlus size={17} />{action}</button> : null}
    </header>
  );
}

export function TimeRail() {
  return (
    <div className="time-rail" aria-label="Régua do horário comercial">
      <div className="time-rail__meta"><Clock3 size={14} /><span>Agora</span><strong>10:24</strong></div>
      <div className="time-rail__line"><span className="time-rail__progress" /></div>
      <div className="time-rail__labels"><span>08h</span><span>12h</span><span>16h</span><span>20h</span></div>
    </div>
  );
}

export function StatCard({ label, value, delta, icon }: { label: string; value: string; delta: string; icon: React.ReactNode }) {
  return (
    <article className="stat-card">
      <div className="stat-card__icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{delta}</small>
    </article>
  );
}

export function SectionHeading({ title, link }: { title: string; link?: string }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {link ? <button className="text-button">{link}<ArrowUpRight size={14} /></button> : null}
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text: string; action: string }) {
  return (
    <div className="empty-state">
      <span><Plus size={22} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      <button className="button button--secondary">{action}</button>
    </div>
  );
}

