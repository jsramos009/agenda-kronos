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
  Menu,
  Search,
  Settings2,
  Sparkles,
  SquareKanban,
  Tags,
  X,
} from "lucide-react";
import { useState } from "react";
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
        <div className="workspace-switcher">
          <span>{companyName.slice(0, 2).toUpperCase()}</span>
          <div><strong>{companyName}</strong><small>{niche.label}</small></div>
          <ChevronDown size={15} />
        </div>
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
        </nav>
        <div className="sidebar__insight">
          <Sparkles size={17} />
          <div><strong>Kronos encontrou 3 melhorias</strong><small>Baseadas na sua agenda.</small></div>
          <Link href="/insights" aria-label="Ver insights">→</Link>
        </div>
        <form action={signOut} className="sidebar__user">
          <span>{fullName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
          <div><strong>{fullName}</strong><small>{demo ? "Modo demonstração" : role}</small></div>
          {demo ? <ChevronDown size={15} /> : <button title="Sair" aria-label="Sair da conta">Sair</button>}
        </form>
      </aside>
      {open ? <button className="sidebar-backdrop" onClick={() => setOpen(false)} aria-label="Fechar menu" /> : null}
      <div className="app-main">
        <div className="topbar">
          <button className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Abrir menu"><Menu size={20} /></button>
          <label className="global-search"><Search size={17} /><input aria-label="Busca global" placeholder="Buscar cliente, serviço ou atendimento…" /></label>
          <div className="topbar__date"><span>TER</span><strong>25 AGO</strong></div>
        </div>
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
}
