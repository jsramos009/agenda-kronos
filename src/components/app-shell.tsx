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
  ArrowRight,
  AlertCircle,
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
  Crown,
} from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { KronosMark } from "./kronos-mark";
import { useNiche } from "./niche-provider";
import { switchWorkspace } from "@/app/workspace-actions";
import type { WorkspaceSummary } from "@/lib/workspace";
import { applyInsightReadOverride, INSIGHT_READ_STATE_EVENT, reconcileInsightReadOverrides, visibleUnreadInsightIds, type InsightReadStateChange } from "@/lib/insight-badge-events";
import { NotificationBell } from "./notification-center";

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
  platformAdmin?: boolean;
  /** Fase 1: será preenchido pela mesma query real usada na lista de Insights. */
  unreadInsightIds?: string[];
  insightCountError?: boolean;
};

const routeContext: Record<string, string> = {
  "/dashboard": "Visão geral",
  "/agenda": "Agenda",
  "/atendimentos": "Atendimentos",
  "/clientes": "Clientes",
  "/servicos": "Serviços",
  "/pagamentos": "Pagamentos",
  "/insights": "Insights",
  "/conhecimento": "Conhecimento",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
  "/conta": "Conta e equipe",
  "/admin": "Administração",
  "/admin-kronos": "Central Kronos",
  "/ajuda": "Ajuda e FAQ",
};

const mobileShellQuery = "(max-width: 860px)";
const subscribeToMobileShell = (notify: () => void) => {
  const query = window.matchMedia(mobileShellQuery);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};
const getMobileShellSnapshot = () => window.matchMedia(mobileShellQuery).matches;
const getServerMobileShellSnapshot = () => false;

export function AppShell({ children, fullName = "Ana Martins", role = "Administradora", roleKey = "admin", demo = false, activeWorkspaceId = null, workspaces = [], platformAdmin = false, unreadInsightIds = [], insightCountError = false }: AppShellProps) {
  const pathname = usePathname();
  const { companyName, niche } = useNiche();
  const [open, setOpen] = useState(false);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const sourceInsightSignature = unreadInsightIds.join("|");
  const [insightBadge, setInsightBadge] = useState(() => ({ sourceSignature: sourceInsightSignature, sourceIds: new Set(unreadInsightIds), overrides: new Map<string, boolean>() }));
  const isMobileShell = useSyncExternalStore(subscribeToMobileShell, getMobileShellSnapshot, getServerMobileShellSnapshot);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const workspacePanelRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  const accountPanelRef = useRef<HTMLDivElement>(null);
  const mobileActionButtonRef = useRef<HTMLButtonElement>(null);
  const mobileActionPanelRef = useRef<HTMLElement>(null);
  const canAdminister = roleKey === "owner" || roleKey === "admin" || demo;
  const currentRoute = Object.keys(routeContext).find((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (insightBadge.sourceSignature !== sourceInsightSignature) {
    const sourceIds = new Set(unreadInsightIds);
    setInsightBadge({ sourceSignature: sourceInsightSignature, sourceIds, overrides: reconcileInsightReadOverrides(sourceIds, insightBadge.overrides) });
  }
  const visibleInsightCount = visibleUnreadInsightIds(insightBadge.sourceIds, insightBadge.overrides).size;

  useEffect(() => {
    const updateBadge = (event: Event) => {
      const change = (event as CustomEvent<InsightReadStateChange>).detail;
      setInsightBadge((current) => ({ ...current, overrides: reconcileInsightReadOverrides(current.sourceIds, applyInsightReadOverride(current.overrides, change)) }));
    };
    window.addEventListener(INSIGHT_READ_STATE_EVENT, updateBadge);
    return () => window.removeEventListener(INSIGHT_READ_STATE_EVENT, updateBadge);
  }, []);

  useEffect(() => {
    if (!open || !isMobileShell) return;
    const frame = window.requestAnimationFrame(() => sidebarCloseRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [isMobileShell, open]);

  useEffect(() => {
    if (!workspaceMenuOpen) return;
    const frame = window.requestAnimationFrame(() => workspacePanelRef.current?.querySelector<HTMLElement>("a, button")?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [workspaceMenuOpen]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const frame = window.requestAnimationFrame(() => accountPanelRef.current?.querySelector<HTMLElement>("a, button")?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [accountMenuOpen]);

  useEffect(() => {
    if (!mobileActionsOpen) return;
    const frame = window.requestAnimationFrame(() => mobileActionPanelRef.current?.querySelector<HTMLElement>("a")?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [mobileActionsOpen]);

  useEffect(() => {
    const closeMenus = (event: KeyboardEvent) => {
      if (event.key === "Tab" && open && isMobileShell) {
        const focusable = Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? []).filter((element) => element.getAttribute("aria-hidden") !== "true");
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        if (event.shiftKey && (active === first || !sidebarRef.current?.contains(active))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (active === last || !sidebarRef.current?.contains(active))) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (event.key !== "Escape") return;
      if (mobileActionsOpen) {
        setMobileActionsOpen(false);
        mobileActionButtonRef.current?.focus();
        return;
      }
      if (workspaceMenuOpen) {
        setWorkspaceMenuOpen(false);
        workspaceButtonRef.current?.focus();
        return;
      }
      if (accountMenuOpen) {
        setAccountMenuOpen(false);
        accountButtonRef.current?.focus();
        return;
      }
      if (open && isMobileShell) {
        setOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", closeMenus);
    return () => window.removeEventListener("keydown", closeMenus);
  }, [accountMenuOpen, isMobileShell, mobileActionsOpen, open, workspaceMenuOpen]);

  return (
    <div className="app-shell">
      <aside ref={sidebarRef} id="workspace-sidebar" className={`sidebar ${open ? "sidebar--open" : ""}`} inert={isMobileShell && !open ? true : undefined} aria-hidden={isMobileShell && !open ? true : undefined}>
        <div className="sidebar__brand">
          <KronosMark />
          <button ref={sidebarCloseRef} className="icon-button sidebar__close" onClick={() => { setOpen(false); menuButtonRef.current?.focus(); }} aria-label="Fechar menu"><X size={19} /></button>
        </div>
        <div className="workspace-control">
        <button ref={workspaceButtonRef} type="button" className="workspace-switcher" aria-expanded={workspaceMenuOpen} aria-controls="workspace-disclosure" aria-haspopup="dialog" onClick={() => { setWorkspaceMenuOpen((value) => !value); setAccountMenuOpen(false); }}>
          <span>{companyName.slice(0, 2).toUpperCase()}</span>
          <div><strong>{companyName}</strong><small>{niche.label}</small></div>
          <ChevronDown size={15} />
        </button>
        {workspaceMenuOpen ? <div ref={workspacePanelRef} id="workspace-disclosure" className="workspace-menu" role="dialog" aria-label="Seus espaços">
          <header><strong>Seus espaços</strong><small>{workspaces.length} de 2 agendas</small></header>
          {workspaces.map((workspace) => demo ? <button type="button" key={workspace.organizationId} className="workspace-menu__item active"><span>{workspace.companyName.slice(0, 2).toUpperCase()}</span><div><strong>{workspace.companyName}</strong><small>{workspace.role}</small></div><Check size={15} /></button> : <form action={switchWorkspace} key={workspace.organizationId}><input type="hidden" name="workspaceId" value={workspace.organizationId} /><button className={`workspace-menu__item ${workspace.organizationId === activeWorkspaceId ? "active" : ""}`}><span>{workspace.companyName.slice(0, 2).toUpperCase()}</span><div><strong>{workspace.companyName}</strong><small>{workspace.role}</small></div>{workspace.organizationId === activeWorkspaceId ? <Check size={15} /> : null}</button></form>)}
          {workspaces.length < 2 ? <Link className="workspace-menu__create" href="/onboarding?novo=1" onClick={() => setWorkspaceMenuOpen(false)}><Plus size={16} /> Criar outra agenda</Link> : <p className="workspace-menu__limit">Limite de duas agendas atingido.</p>}
        </div> : null}
        </div>
        <nav aria-label="Navegação principal">
          <p className="nav-label">Operação</p>
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className={pathname === href || pathname.startsWith(`${href}/`) ? "active" : ""}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Insights" && visibleInsightCount > 0 ? <em aria-label={`${visibleInsightCount} insights não lidos`}>{visibleInsightCount > 99 ? "99+" : visibleInsightCount}</em> : null}
            </Link>
          ))}
          <p className="nav-label nav-label--space">Sistema</p>
          <Link href="/configuracoes" onClick={() => setOpen(false)} className={pathname.startsWith("/configuracoes") ? "active" : ""}><Settings2 size={18} strokeWidth={1.8} /><span>Configurações</span></Link>
          <Link href="/conta" onClick={() => setOpen(false)} className={pathname.startsWith("/conta") ? "active" : ""}><UserRound size={18} strokeWidth={1.8} /><span>Conta e equipe</span></Link>
          {canAdminister ? <Link href="/admin" onClick={() => setOpen(false)} className={pathname === "/admin" || pathname.startsWith("/admin/") ? "active" : ""}><ShieldCheck size={18} strokeWidth={1.8} /><span>Administração</span></Link> : null}
          {platformAdmin ? <Link href="/admin-kronos" onClick={() => setOpen(false)} className={pathname.startsWith("/admin-kronos") ? "active" : ""}><Crown size={18} strokeWidth={1.8} /><span>Central Kronos</span></Link> : null}
          <Link href="/ajuda" onClick={() => setOpen(false)} className={pathname.startsWith("/ajuda") ? "active" : ""}><CircleHelp size={18} strokeWidth={1.8} /><span>Ajuda e FAQ</span></Link>
        </nav>
        {visibleInsightCount > 0 ? <div className="sidebar__insight">
          <Sparkles size={17} />
          <div><strong>{visibleInsightCount === 1 ? "Kronos encontrou uma melhoria" : `Kronos encontrou ${visibleInsightCount} melhorias`}</strong><small>Baseadas na sua agenda.</small></div>
          <Link href="/insights" aria-label="Ver insights"><ArrowRight size={16} /></Link>
        </div> : null}
        <div className="account-control">
        <button ref={accountButtonRef} type="button" className="sidebar__user" aria-label="Abrir opções da conta" aria-haspopup="dialog" aria-controls="account-disclosure" aria-expanded={accountMenuOpen} onClick={() => { setAccountMenuOpen((value) => !value); setWorkspaceMenuOpen(false); }}>
          <span>{fullName.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>
          <div><strong>{fullName}</strong><small>{demo ? "Modo demonstração" : role}</small></div>
          <ChevronDown size={15} />
        </button>
        {accountMenuOpen ? <div ref={accountPanelRef} id="account-disclosure" className="account-menu" role="dialog" aria-label="Opções da conta">
          <Link href="/conta" onClick={() => setAccountMenuOpen(false)}><UserCog size={16} /><span><strong>Minha conta</strong><small>Perfil, equipe e permissões</small></span></Link>
          <Link href="/configuracoes" onClick={() => setAccountMenuOpen(false)}><Building2 size={16} /><span><strong>Configurar espaço</strong><small>Marca, agenda e automações</small></span></Link>
          <Link href="/" onClick={() => setAccountMenuOpen(false)}><House size={16} /><span><strong>Voltar para o site</strong><small>Ir para a página inicial</small></span></Link>
          <form action="/auth/logout" method="post"><button className="account-menu__logout"><LogOut size={16} /><span><strong>{demo ? "Ir para o login" : "Sair e trocar de conta"}</strong><small>{demo ? "Encerrar a demonstração" : "Encerrar esta sessão com segurança"}</small></span></button></form>
        </div> : null}
        </div>
      </aside>
      {open ? <button className="sidebar-backdrop" onClick={() => { setOpen(false); menuButtonRef.current?.focus(); }} aria-label="Fechar menu" /> : null}
      <div className="app-main" inert={isMobileShell && open ? true : undefined} aria-hidden={isMobileShell && open ? true : undefined}>
        <div className="topbar">
          <button ref={menuButtonRef} className="icon-button menu-button" onClick={() => setOpen(true)} aria-label="Abrir menu" aria-expanded={open} aria-controls="workspace-sidebar"><Menu size={20} /></button>
          <div className="topbar__context"><span>{companyName}</span><strong>{routeContext[currentRoute ?? ""] ?? "Kronos"}</strong></div>
          <form className="global-search" action="/busca" method="get"><Search size={17} /><input name="q" aria-label="Busca global" placeholder="Buscar cliente, serviço ou atendimento…" /></form>
          {insightCountError ? <span className="topbar__data-status" role="status"><AlertCircle size={14} /> Insights indisponíveis</span> : null}
          <NotificationBell />
          <LiveDate />
        </div>
        <main className="page-content">{children}</main>
      </div>
      {mobileActionsOpen ? <button className="mobile-quick-actions__backdrop" type="button" aria-label="Fechar ações rápidas" onClick={() => setMobileActionsOpen(false)} /> : null}
      {mobileActionsOpen ? <section ref={mobileActionPanelRef} id="mobile-quick-actions" className="mobile-quick-actions" role="dialog" aria-modal="true" aria-label="Criar novo item">
        <header><div><small>Ação rápida</small><strong>O que deseja criar?</strong></div><button type="button" className="icon-button" aria-label="Fechar" onClick={() => { setMobileActionsOpen(false); mobileActionButtonRef.current?.focus(); }}><X size={18} /></button></header>
        <Link href="/agenda?novo=1" onClick={() => setMobileActionsOpen(false)}><span><CalendarDays size={21} /></span><div><strong>Novo agendamento</strong><small>Escolha cliente, serviço, data e horário</small></div><ArrowRight size={18} /></Link>
        <Link href="/pagamentos#nova-cobranca" onClick={() => setMobileActionsOpen(false)}><span><ReceiptText size={21} /></span><div><strong>Nova cobrança</strong><small>Emita um boleto para seu cliente</small></div><ArrowRight size={18} /></Link>
      </section> : null}
      <nav className="mobile-bottom-nav" aria-label="Navegação principal do celular">
        <MobileNavLink href="/dashboard" label="Visão geral" pathname={pathname} icon={LayoutDashboard} onNavigate={() => setMobileActionsOpen(false)} />
        <MobileNavLink href="/agenda" label="Agenda" pathname={pathname} icon={CalendarDays} onNavigate={() => setMobileActionsOpen(false)} />
        <button ref={mobileActionButtonRef} type="button" className={`mobile-bottom-nav__create ${mobileActionsOpen ? "active" : ""}`} aria-label="Criar novo" aria-haspopup="dialog" aria-expanded={mobileActionsOpen} aria-controls="mobile-quick-actions" onClick={() => setMobileActionsOpen((value) => !value)}><Plus size={27} strokeWidth={2.2} /></button>
        <MobileNavLink href="/atendimentos" label="Atendimentos" pathname={pathname} icon={SquareKanban} onNavigate={() => setMobileActionsOpen(false)} />
        <MobileNavLink href="/clientes" label="Clientes" pathname={pathname} icon={ContactRound} onNavigate={() => setMobileActionsOpen(false)} />
      </nav>
    </div>
  );
}

function MobileNavLink({ href, label, pathname, icon: Icon, onNavigate }: { href: string; label: string; pathname: string; icon: typeof LayoutDashboard; onNavigate: () => void }) {
  const active = pathname === href || pathname.startsWith(`${href}/`);
  return <Link href={href} className={active ? "active" : ""} aria-current={active ? "page" : undefined} onClick={onNavigate}><Icon size={20} strokeWidth={active ? 2.2 : 1.8} /><span>{label}</span></Link>;
}

function LiveDate() {
  const [value, setValue] = useState({ weekday: "TER", date: "25 AGO" });
  useEffect(() => { const update = () => { const parts = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", timeZone: "America/Sao_Paulo" }).formatToParts(new Date()); const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""; setValue({ weekday: get("weekday").replace(".", "").toUpperCase(), date: `${get("day")} ${get("month").replace(".", "").toUpperCase()}` }); }; const timer = window.setTimeout(update, 0); const interval = window.setInterval(update, 60_000); return () => { window.clearTimeout(timer); window.clearInterval(interval); }; }, []);
  return <time className="topbar__date"><span>{value.weekday}</span><strong>{value.date}</strong></time>;
}
