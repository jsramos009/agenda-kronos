"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ContactRound,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  CircleHelp,
  House,
  UserRound,
  Menu,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  SquareKanban,
  Tags,
  UserCog,
  Plus,
  ReceiptText,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { KronosMark } from "./kronos-mark";
import { useNiche } from "./niche-provider";
import { switchWorkspace } from "@/app/workspace-actions";
import type { WorkspaceSummary } from "@/lib/workspace";

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/atendimentos", label: "Atendimentos", icon: SquareKanban },
  { href: "/clientes", label: "Clientes", icon: ContactRound },
  { href: "/servicos", label: "Serviços", icon: Tags },
  { href: "/pagamentos", label: "Pagamentos", icon: ReceiptText },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/conhecimento", label: "Conhecimento", icon: BookOpen },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

type AppShellProps = {
  children: React.ReactNode;
  fullName?: string;
  role?: string;
  roleKey?: string;
  demo?: boolean;
  activeWorkspaceId?: string | null;
  workspaces?: WorkspaceSummary[];
};

export function AppShell({ children, fullName = "Ana Martins", role = "Administradora", roleKey = "admin", demo = false, activeWorkspaceId = null, workspaces = [] }: AppShellProps) {
  const pathname = usePathname();
  const { companyName, niche } = useNiche();
  const [open, setOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const canAdminister = roleKey === "owner" || roleKey === "admin" || demo;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "sidebar--open" : ""}`}>
        <div className="sidebar__brand">
          <KronosMark />
          <button className="icon-button sidebar__close" onClick={() => setOpen(false)} aria-label="Fechar menu"><X size={19} /></button>
        </div>
        <div className="workspace-control">
        <button type="button" className="workspace-switcher" aria-expanded={workspaceMenuOpen} onClick={() => { setWorkspaceMenuOpen((value) => !value); setAccountMenuOpen(false); }}>
          <span>{companyName.slice(0, 2).toUpperCase()}</span>
          <div><strong>{companyName}</strong><small>{niche.label}</small></div>
          <ChevronDown size={15} />
        </button>
        {workspaceMenuOpen ? <div className="workspace-menu" role="menu">
          <header><strong>Seus espaços</strong><small>{workspaces.length} de 2 agendas</small></header>
          {workspaces.map((workspace) => demo ? <button type="button" key={workspace.organizationId} className="workspace-menu__item active"><span>{workspace.companyName.slice(0, 2).toUpperCase()}</span><div><strong>{workspace.companyName}</strong><small>{workspace.role}</small></div><Check size={15} /></button> : <form action={switchWorkspace} key={workspace.organizationId}><input type="hidden" name="workspaceId" value={workspace.organizationId} /><button className={`workspace-menu__item ${workspace.organizationId === activeWorkspaceId ? "active" : ""}`}><span>{workspace.companyName.slice(0, 2).toUpperCase()}</span><div><strong>{workspace.companyName}</strong><small>{workspace.role}</small></div>{workspace.organizationId === activeWorkspaceId ? <Check size={15} /> : null}</button></form>)}
          {workspaces.length < 2 ? <Link className="workspace-menu__create" href="/onboarding?novo=1" onClick={() => setWorkspaceMenuOpen(false)}><Plus size={16} /> Criar outra agenda</Link> : <p className="workspace-menu__limit">Limite de duas agendas atingido.</p>}
        </div> : null}
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
          <Link href="/conta" onClick={() => setOpen(false)} className={pathname === "/conta" ? "active" : ""}><UserRound size={18} strokeWidth={1.8} /><span>Conta e equipe</span></Link>
          {canAdminister ? <Link href="/admin" onClick={() => setOpen(false)} className={pathname === "/admin" ? "active" : ""}><ShieldCheck size={18} strokeWidth={1.8} /><span>Administração</span></Link> : null}
          <Link href="/ajuda" onClick={() => setOpen(false)} className={pathname === "/ajuda" ? "active" : ""}><CircleHelp size={18} strokeWidth={1.8} /><span>Ajuda e FAQ</span></Link>
        </nav>
        <div className="sidebar__insight">
          <Sparkles size={17} />
          <div><strong>Kronos encontrou 3 melhorias</strong><small>Baseadas na sua agenda.</small></div>
          <Link href="/insights" aria-label="Ver insights">→</Link>
        </div>
        <div className="account-control">
        <button type="button" className="sidebar__user" aria-label="Abrir opções da conta" aria-haspopup="menu" aria-expanded={accountMenuOpen} onClick={() => { setAccountMenuOpen((value) => !value); setWorkspaceMenuOpen(false); }}>
          <span>{fullName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
          <div><strong>{fullName}</strong><small>{demo ? "Modo demonstração" : role}</small></div>
          <ChevronDown size={15} />
        </button>
        {accountMenuOpen ? <div className="account-menu" role="menu" aria-label="Opções da conta">
          <Link href="/conta" onClick={() => setAccountMenuOpen(false)}><UserCog size={16} /><span><strong>Minha conta</strong><small>Perfil, equipe e permissões</small></span></Link>
          <Link href="/configuracoes" onClick={() => setAccountMenuOpen(false)}><Building2 size={16} /><span><strong>Configurar espaço</strong><small>Marca, agenda e automações</small></span></Link>
          <Link href="/" onClick={() => setAccountMenuOpen(false)}><House size={16} /><span><strong>Voltar para o site</strong><small>Ir para a página inicial</small></span></Link>
          <form action="/auth/logout" method="post"><button className="account-menu__logout"><LogOut size={16} /><span><strong>{demo ? "Ir para o login" : "Sair e trocar de conta"}</strong><small>{demo ? "Encerrar a demonstração" : "Encerrar esta sessão com segurança"}</small></span></button></form>
        </div> : null}
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
