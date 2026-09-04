"use client";

import { useEffect } from "react";
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, X } from "lucide-react";
import type { InAppNotification } from "@/lib/notifications";

export function NotificationToastViewport({ notifications, onDismiss }: { notifications: InAppNotification[]; onDismiss: (id: string) => void }) {
  const visible = notifications.slice(0, 3);
  return <div className="notification-toasts" aria-label="Avisos recentes">{visible.map((notification) => <NotificationToast key={notification.id} notification={notification} onDismiss={onDismiss} />)}</div>;
}
function NotificationToast({ notification, onDismiss }: { notification: InAppNotification; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(notification.id), 6_000);
    return () => window.clearTimeout(timer);
  }, [notification.id, onDismiss]);
  const Icon = notification.type.startsWith("appointment.") ? CalendarClock : notification.type.startsWith("warning.") ? AlertTriangle : notification.type.startsWith("payment.") ? CheckCircle2 : Bell;
  return <article className="notification-toast surface--overlay" role="status"><Icon size={18} aria-hidden="true" /><div><small>{notificationLabel(notification.type)}</small><strong>{notification.title}</strong><p>{notification.message}</p></div><button type="button" onClick={() => onDismiss(notification.id)} aria-label="Fechar aviso"><X size={16} /></button></article>;
}

function notificationLabel(type: string) {
  if (type.startsWith("appointment.")) return "Agenda";
  if (type.startsWith("payment.")) return "Pagamento";
  if (type.startsWith("warning.")) return "Atenção";
  return "Sistema";
}
