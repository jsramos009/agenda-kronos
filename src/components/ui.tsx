"use client";

import { ArrowUpRight, CalendarPlus, Clock3, Plus } from "lucide-react";
import Link from "next/link";
import { cloneElement, isValidElement, useEffect, useId, useState, type ButtonHTMLAttributes, type HTMLAttributes, type ReactElement, type ReactNode } from "react";

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  active?: boolean;
};

export function Button({ variant = "primary", loading = false, active, className, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={classes("button", `button--${variant}`, active && "is-active", className)}
      aria-busy={loading || undefined}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <span className="button__progress" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

type FieldProps = HTMLAttributes<HTMLLabelElement> & {
  label: ReactNode;
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
};

export function Field({ label, help, error, className, children, ...props }: FieldProps) {
  const hintId = useId();
  const descriptionId = help || error ? hintId : undefined;
  const controlElement = isValidElement(children)
    ? children as ReactElement<{ "aria-describedby"?: string; "aria-invalid"?: boolean | "grammar" | "spelling" }>
    : null;
  const describedBy = [controlElement?.props["aria-describedby"], descriptionId].filter(Boolean).join(" ") || undefined;
  const invalid = error ? true : controlElement?.props["aria-invalid"];
  const control = controlElement ? cloneElement(controlElement, { "aria-describedby": describedBy, "aria-invalid": invalid }) : children;
  return (
    <label className={classes("field", Boolean(error) && "field--error", className)} {...props}>
      <span>{label}</span>
      {control}
      {error ? <small id={hintId} className="field__error">{error}</small> : help ? <small id={hintId} className="field__help">{help}</small> : null}
    </label>
  );
}

export function Surface({ variant = "base", className, ...props }: HTMLAttributes<HTMLDivElement> & { variant?: "base" | "subtle" | "overlay" }) {
  return <div className={classes("surface", `surface--${variant}`, className)} {...props} />;
}

export function Overlay({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classes("ui-overlay", className)} {...props} />;
}

export function Badge({ count, children, className, ...props }: HTMLAttributes<HTMLSpanElement> & { count?: number; children?: ReactNode }) {
  if (typeof count === "number" && count <= 0) return null;
  return <span className={classes("badge", className)} {...props}>{typeof count === "number" ? (count > 99 ? "99+" : count) : children}</span>;
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classes("skeleton", className)} aria-hidden="true" {...props} />;
}

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

type EmptyStateProps = { title: string; text: string } & (
  | { action?: never; actionHref?: never; onAction?: never }
  | { action: string; actionHref: string; onAction?: never }
  | { action: string; actionHref?: never; onAction: () => void }
);

export function EmptyState(props: EmptyStateProps) {
  const { title, text } = props;
  return (
    <div className="empty-state">
      <span><Plus size={22} /></span>
      <h3>{title}</h3>
      <p>{text}</p>
      {"actionHref" in props && props.actionHref ? <Link className="button button--secondary" href={props.actionHref}>{props.action}</Link> : null}
      {"onAction" in props && props.onAction ? <Button variant="secondary" onClick={props.onAction}>{props.action}</Button> : null}
    </div>
  );
}

export function InlineError({ title = "Não foi possível carregar", text, retry, retryPending = false }: { title?: string; text: string; retry?: () => void; retryPending?: boolean }) {
  return (
    <div className="inline-error" role="alert">
      <div><strong>{title}</strong><span>{text}</span></div>
      {retry ? <Button variant="secondary" loading={retryPending} disabled={retryPending} onClick={retry}>Tentar novamente</Button> : null}
    </div>
  );
}
