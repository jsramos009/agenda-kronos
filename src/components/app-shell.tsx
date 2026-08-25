"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ContactRound,
  LayoutDashboard,
  Lightbulb,
  CircleHelp,
  UserRound,
  Menu,
  Search,
  Settings2,
  Sparkles,
  SquareKanban,
  Tags,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { KronosMark } from "./kronos-mark";
import { useNiche } from "./niche-provider";
import { signOut } from "@/app/auth-actions";

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/atendimentos", label: "Atendimentos", icon: SquareKanban },
  { href: "/clientes", label: "Clientes", icon: ContactRound },
  { href: "/servicos", label: "Serviços", icon: Tags },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/conhecimento", label: "Conhecimento", icon: BookOpen },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export function AppShell({ children, fullName = "Ana Martins", role = "Administradora", demo = false }: { children: React.ReactNode; fullName?: string; role?: string; demo?: boolean }) {
  const pathname = usePathname();
  const { companyName, niche } = useNiche();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <KronosMark />
          <button className="icon-button sidebar__close" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={19} /></button>
        </div>
        <Link href="/configuracoes" className="workspace-switcher" aria-label="Abrir configurações do espaço">
          <span>{companyName.slice(0, 2).toUpperCase()}</span>
          <div><strong>{companyName}</strong><small>{niche.label}</small></div>
          <ChevronDown size={15} />
        </Link>
        <nav aria-label="Navegação principal">
          <p className="nav-label">Operação</p>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname === href ? "active" : ""}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Insights" ? <em>3</em> : null}
            </Link>
          ))}
          <p className="nav-label nav-label--space">Sistema</p>
          <Link href="/configuracoes" onClick={() => setOpen(false)} className={pathname === "/configuracoes" ? "active" : ""}><Settings2 size={18} strokeWidth={1.8} /><span>Configurações</span></Link>
          <Link href="/conta" onClick={() => setOpen(false)} className={pathname === "/conta" ? "active" : ""}><UserRound size={18} strokeWidth={1.8} /><span>Conta e equipe</span></Link>
          <Link href="/ajuda" onClick={() => setOpen(false)} className={pathname === "/ajuda" ? "active" : ""}><CircleHelp size={18} strokeWidth={1.8} /><span>Ajuda e FAQ</span></Link>
        </nav>
        <div className="sidebar__insight">
          <Sparkles size={17} />
          <div><strong>Kronos encontrou 3 melhorias</strong><small>Baseadas na sua agenda.</small></div>
          <Link href="/insights" aria-label="Ver insights">→</Link>
        </div>
        <div className="sidebar__user">
          <span>{fullName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
          <div><strong>{fullName}</strong><small>{demo ? "Modo demonstração" : role}</small></div>
          {demo ? <Link href="/conta" aria-label="Abrir conta"><ChevronDown size={15} /></Link> : <form action={signOut}><button title="Sair" aria-label="Sair da conta">Sair</button></form>}
        </div>
      </aside>
      {open ? <button className="sidebar-backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu" /> : null}
      <div className="app-main">
        <div className="topbar">
          <button className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <form className="global-search" action="/busca" method="get"><Search size={17} /><input name="q" aria-label="Busca global" placeholder="Buscar cliente, serviço ou atendimento…" /></form>
          <LiveDate />
        </div>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}

function LiveDate() {
  const [value, setValue] = useState({ weekday: "TER", date: "25 AGO" });
  useEffect(() => { const update = () => { const parts = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).formatToParts(new Date()); const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""; setValue({ weekday: get("weekday").replace(".", "").toUpperCase(), date: `${get("day")} ${get("month").replace(".", "").toUpperCase()}` }); }; const timer = window.setTimeout(update, 0); const interval = window.setInterval(update, 60_000); return () => { window.clearTimeout(timer); window.clearInterval(interval); }; }, []);
  return <time className="topbar__date"><span>{value.weekday}</span><strong>{value.date}</strong></time>;
}
