"use client";

import { ArrowUpRight, CalendarPlus, Clock3, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function PageHeader({ eyebrow, title, description, action = "Novo agendamento", actionHref }: { eyebrow: string; title: string; description: string; action?: string | null; actionHref?: string }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && actionHref ? <Link className="button button--primary" href={actionHref}><CalendarPlus size={17} />{action}</Link> : null}
    </header>
  );
}

export function TimeRail() {
  const [clock, setClock] = useState({ time: "10:24", progress: 29 });
  useEffect(() => { const update = () => { const parts = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).formatToParts(new Date()); const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 8); const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0); setClock({ time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`, progress: Math.min(100, Math.max(0, ((hour + minute / 60 - 8) / 12) * 100)) }); }; const timer = window.setTimeout(update, 0); const interval = window.setInterval(update, 60_000); return () => { window.clearTimeout(timer); window.clearInterval(interval); }; }, []);
  return (
    <div className="time-rail" aria-label="Régua do horário comercial">
      <div className="time-rail__meta"><Clock3 size={14} /><span>Agora</span><strong>{clock.time}</strong></div>
      <div className="time-rail__line"><span className="time-rail__progress" style={{ width: `${clock.progress}%` }} /></div>
      <div className="time-rail__labels"><span>08h</span><span>12h</span><span>16h</span><span>20h</span></div>
    </div>
  );
}

export function StatCard({ label, value, delta, icon, href }: { label: string; value: string; delta: string; icon: React.ReactNode; href?: string }) {
  const content = (
    <article className="stat-card">
      <div className="stat-card__icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{delta}</small>
    </article>
  );
  return href ? <Link className="stat-card-link" href={href}>{content}</Link> : content;
}

export function SectionHeading({ title, link, href }: { title: string; link?: string; href?: string }) {
  return (
    <div className="section-heading">
      <h2>{title}</h2>
      {link && href ? <Link className="text-button" href={href}>{link}<ArrowUpRight size={14} /></Link> : null}
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
