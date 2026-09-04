"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, CalendarClock, Check, CheckCheck, X } from "lucide-react";
import { useWorkspaceNotifications } from "@/components/workspace-realtime-provider";
import type { InAppNotification } from "@/lib/notifications";

export function NotificationBell() {
  const { notifications, unreadCount, loadError, actionError, isRefreshing, markRead, markAllRead, retryLoad, retryLastAction } = useWorkspaceNotifications();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>("button, a")?.focus());
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
        return;
      }
      if (event.key !== "Tab") return;
      const focusable = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])') ?? []);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("keydown", handleKey); };
  }, [open]);

  const layer = open ? <><button className="notification-dismiss" type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} aria-label="Fechar notificações" /><div ref={panelRef} id="notification-center" className="notification-center surface--overlay" role="dialog" aria-modal="true" aria-label="Central de notificações"><header><div><small>Atualizações do espaço</small><h2>Notificações</h2></div><button className="icon-button notification-center__close" type="button" onClick={() => { setOpen(false); buttonRef.current?.focus(); }} aria-label="Fechar central"><X size={18} /></button></header>{actionError ? <div className="notification-center__error" role="alert"><p>{actionError}</p><button type="button" onClick={retryLastAction}>Tentar novamente</button></div> : null}{unreadCount ? <button type="button" className="notification-center__read-all" onClick={() => void markAllRead()}><CheckCheck size={16} /> Marcar todas como lidas</button> : null}<div className="notification-center__list">{loadError ? <div className="notification-center__error-state" role="alert"><Bell size={22} /><strong>Não foi possível carregar</strong><p>{loadError}</p><button type="button" onClick={retryLoad} disabled={isRefreshing}>{isRefreshing ? "Atualizando…" : "Tentar novamente"}</button></div> : notifications.length ? notifications.map((notification) => <NotificationItem key={notification.id} notification={notification} markRead={markRead} close={() => setOpen(false)} />) : <div className="notification-center__empty"><Bell size={22} /><strong>Tudo em dia</strong><p>Novas atualizações da agenda aparecerão aqui.</p></div>}</div></div></> : null;
  return <div className="notification-control"><button ref={buttonRef} type="button" className="icon-button notification-bell" aria-haspopup="dialog" aria-expanded={open} aria-controls="notification-center" aria-label={unreadCount ? `${unreadCount} notificações não lidas` : "Notificações"} onClick={() => setOpen((value) => !value)}><Bell size={19} />{unreadCount ? <span>{unreadCount > 99 ? "99+" : unreadCount}</span> : null}</button>{layer ? createPortal(layer, document.body) : null}</div>;
}

function NotificationItem({ notification, markRead, close }: { notification: InAppNotification; markRead: (id: string) => Promise<void>; close: () => void }) {
  const href = notification.entityType === "appointment" ? "/agenda" : "/dashboard";
  return <article className={notification.readAt ? "is-read" : "is-unread"}><CalendarClock size={17} aria-hidden="true" /><Link href={href} onClick={() => { void markRead(notification.id); close(); }}><strong>{notification.title}</strong><p>{notification.message}</p><time dateTime={notification.createdAt}>{relativeTime(notification.createdAt)}</time></Link>{notification.readAt ? <Check size={15} aria-label="Lida" /> : <button type="button" onClick={() => void markRead(notification.id)} aria-label={`Marcar “${notification.title}” como lida`}><span /></button>}</article>;
}

function relativeTime(createdAt: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(createdAt));
}
