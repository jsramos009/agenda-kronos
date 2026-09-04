"use client";

import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode, type SetStateAction } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { markAllNotificationsRead, markNotificationRead } from "@/app/(workspace)/notification-actions";
import { NotificationToastViewport } from "@/components/notification-toast-viewport";
import { createClient } from "@/lib/supabase/client";
import { mapNotification, nextRefreshDelay, reconcileNotificationSnapshot, unreadNotificationCount, upsertNotification, type InAppNotification, type InAppNotificationRow } from "@/lib/notifications";

type ConnectionState = "idle" | "connected" | "reconnecting";
type WorkspaceTable = "appointments" | "recommendations" | "customers";
type FailedAction = { type: "one"; id: string } | { type: "all" } | null;
type NotificationContextValue = {
  notifications: InAppNotification[];
  unreadCount: number;
  connectionState: ConnectionState;
  loadError: string;
  actionError: string;
  isRefreshing: boolean;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  retryLoad: () => void;
  retryLastAction: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);
const REFRESH_DEBOUNCE_MS = 280;
const REFRESH_COOLDOWN_MS = 1_200;

export function WorkspaceRealtimeProvider({ children, organizationId, userId, initialNotifications, initialLoadError, enabled }: { children: ReactNode; organizationId: string | null; userId: string | null; initialNotifications: InAppNotification[]; initialLoadError: string; enabled: boolean }) {
  const router = useRouter();
  const sourceSignature = JSON.stringify(initialNotifications);
  const [notificationModel, setNotificationModel] = useState(() => ({ sourceSignature, notifications: initialNotifications }));
  const [pendingReadIds, setPendingReadIds] = useState(() => new Set<string>());
  const notifications = notificationModel.notifications;
  const setNotifications = useCallback((next: SetStateAction<InAppNotification[]>) => setNotificationModel((current) => ({ ...current, notifications: typeof next === "function" ? next(current.notifications) : next })), []);
  const [toasts, setToasts] = useState<InAppNotification[]>([]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(enabled ? "idle" : "connected");
  const [actionError, setActionError] = useState("");
  const [failedAction, setFailedAction] = useState<FailedAction>(null);
  const [isRefreshing, startRefresh] = useTransition();
  const refreshTimerRef = useRef<number | null>(null);
  const lastRefreshRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const trailingRefreshRef = useRef(false);
  const hadChannelFailureRef = useRef(false);
  const entityVersionsRef = useRef(new Map<WorkspaceTable, Map<string, string>>());

  if (notificationModel.sourceSignature !== sourceSignature) {
    setNotificationModel({ sourceSignature, notifications: reconcileNotificationSnapshot(initialNotifications, notifications, pendingReadIds) });
  }

  const requestRefresh = useCallback((immediate = false) => {
    trailingRefreshRef.current = true;
    if (document.visibilityState === "hidden") return;
    if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current);
    const delay = nextRefreshDelay(Date.now(), lastRefreshRef.current, REFRESH_DEBOUNCE_MS, REFRESH_COOLDOWN_MS, immediate);
    refreshTimerRef.current = window.setTimeout(() => {
      refreshTimerRef.current = null;
      if (refreshInFlightRef.current) return;
      trailingRefreshRef.current = false;
      refreshInFlightRef.current = true;
      lastRefreshRef.current = Date.now();
      startRefresh(() => router.refresh());
    }, delay);
  }, [router]);

  useEffect(() => {
    if (isRefreshing || !refreshInFlightRef.current) return;
    refreshInFlightRef.current = false;
    if (trailingRefreshRef.current) requestRefresh(true);
  }, [isRefreshing, requestRefresh]);

  const reconcileEntity = useCallback((table: WorkspaceTable, expectedOrganizationId: string, payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
    const row = payload.new as Record<string, unknown>;
    if (row.organization_id !== expectedOrganizationId || typeof row.id !== "string") return;
    let tableVersions = entityVersionsRef.current.get(table);
    if (!tableVersions) { tableVersions = new Map(); entityVersionsRef.current.set(table, tableVersions); }
    const signature = `${payload.eventType}:${JSON.stringify(row)}`;
    if (tableVersions.get(row.id) === signature) return;
    tableVersions.set(row.id, signature);
    window.dispatchEvent(new CustomEvent(`kronos:realtime:${table}`, { detail: payload }));
    requestRefresh();
  }, [requestRefresh]);

  useEffect(() => {
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") requestRefresh(); };
    window.addEventListener("focus", refreshWhenVisible);
    window.addEventListener("online", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { window.removeEventListener("focus", refreshWhenVisible); window.removeEventListener("online", refreshWhenVisible); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [requestRefresh]);

  useEffect(() => {
    if (!enabled || !organizationId || !userId) return;
    const supabase = createClient();
    const entityVersions = entityVersionsRef.current;
    const tenantFilter = `organization_id=eq.${organizationId}`;
    const recipientFilter = `organization_id=eq.${organizationId},user_id=eq.${userId}`;
    const onEntity = (table: WorkspaceTable) => (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => reconcileEntity(table, organizationId, payload);
    const onNotification = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      const raw = payload.new as Record<string, unknown>;
      if (raw.organization_id !== organizationId || raw.user_id !== userId || typeof raw.id !== "string") return;
      const next = mapNotification(raw as InAppNotificationRow);
      setNotifications((current) => upsertNotification(current, next));
      if (next.readAt) setPendingReadIds((current) => { if (!current.has(next.id)) return current; const updated = new Set(current); updated.delete(next.id); return updated; });
      if (payload.eventType === "INSERT" && next.actorId !== userId) setToasts((current) => upsertNotification(current, next).slice(0, 12));
    };
    const channel = supabase
      .channel(`workspace:${organizationId}:${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "appointments", filter: tenantFilter }, onEntity("appointments"))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "appointments", filter: tenantFilter }, onEntity("appointments"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "recommendations", filter: tenantFilter }, onEntity("recommendations"))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "recommendations", filter: tenantFilter }, onEntity("recommendations"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "customers", filter: tenantFilter }, onEntity("customers"))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "customers", filter: tenantFilter }, onEntity("customers"))
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "in_app_notifications", filter: recipientFilter }, onNotification)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "in_app_notifications", filter: recipientFilter }, onNotification)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") { setConnectionState("connected"); if (hadChannelFailureRef.current) requestRefresh(true); hadChannelFailureRef.current = false; return; }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") { hadChannelFailureRef.current = true; setConnectionState("reconnecting"); }
      });
    return () => { if (refreshTimerRef.current !== null) window.clearTimeout(refreshTimerRef.current); trailingRefreshRef.current = false; entityVersions.clear(); void supabase.removeChannel(channel); };
  }, [enabled, organizationId, reconcileEntity, requestRefresh, setNotifications, userId]);

  const markRead = useCallback(async (id: string) => {
    const previous = notifications.find((item) => item.id === id)?.readAt ?? null;
    const readAt = new Date().toISOString();
    setActionError(""); setFailedAction(null); setPendingReadIds((current) => new Set(current).add(id));
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? readAt } : item));
    const result = await markNotificationRead(id);
    setPendingReadIds((current) => { const updated = new Set(current); updated.delete(id); return updated; });
    if (!result.ok) { setNotifications((current) => current.map((item) => item.id === id ? { ...item, readAt: previous } : item)); setActionError(result.message); setFailedAction({ type: "one", id }); }
  }, [notifications, setNotifications]);

  const markAllRead = useCallback(async () => {
    const previous = new Map(notifications.map((item) => [item.id, item.readAt]));
    const targetIds = notifications.filter((item) => !item.readAt).map((item) => item.id);
    const readAt = new Date().toISOString();
    setActionError(""); setFailedAction(null); setPendingReadIds((current) => new Set([...current, ...targetIds]));
    setNotifications((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? readAt })));
    const result = await markAllNotificationsRead();
    setPendingReadIds((current) => { const updated = new Set(current); targetIds.forEach((id) => updated.delete(id)); return updated; });
    if (!result.ok) { setNotifications((current) => current.map((item) => ({ ...item, readAt: previous.has(item.id) ? (previous.get(item.id) ?? null) : item.readAt }))); setActionError(result.message); setFailedAction({ type: "all" }); }
  }, [notifications, setNotifications]);

  const retryLastAction = useCallback(() => { if (failedAction?.type === "one") void markRead(failedAction.id); else if (failedAction?.type === "all") void markAllRead(); }, [failedAction, markAllRead, markRead]);
  const dismissToast = useCallback((id: string) => setToasts((current) => current.filter((item) => item.id !== id)), []);
  const value = useMemo<NotificationContextValue>(() => ({ notifications, unreadCount: unreadNotificationCount(notifications), connectionState, loadError: initialLoadError, actionError, isRefreshing, markRead, markAllRead, retryLoad: () => requestRefresh(true), retryLastAction }), [actionError, connectionState, initialLoadError, isRefreshing, markAllRead, markRead, notifications, requestRefresh, retryLastAction]);

  return <NotificationContext.Provider value={value}>{children}{connectionState === "reconnecting" ? <span className="realtime-status" role="status" aria-live="polite">Reconectando…</span> : null}<span className="sr-only" role="status" aria-live="polite">{isRefreshing ? "Atualizando dados…" : ""}</span><NotificationToastViewport notifications={toasts} onDismiss={dismissToast} /></NotificationContext.Provider>;
}

export function useWorkspaceNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("useWorkspaceNotifications precisa estar dentro de WorkspaceRealtimeProvider.");
  return context;
}
