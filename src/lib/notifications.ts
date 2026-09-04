export type InAppNotification = {
  id: string;
  organizationId: string;
  userId: string;
  actorId: string | null;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

export type InAppNotificationRow = {
  id: string;
  organization_id: string;
  user_id: string;
  actor_id: string | null;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export function mapNotification(row: InAppNotificationRow): InAppNotification {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    actorId: row.actor_id,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: row.metadata ?? {},
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export function upsertNotification(
  current: InAppNotification[],
  next: InAppNotification,
): InAppNotification[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  byId.set(next.id, next);
  return [...byId.values()].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export function unreadNotificationCount(notifications: InAppNotification[]) {
  return notifications.reduce((total, notification) => total + (notification.readAt ? 0 : 1), 0);
}

export function reconcileNotificationSnapshot(
  incoming: InAppNotification[],
  current: InAppNotification[],
  pendingReadIds: Set<string>,
) {
  const currentById = new Map(current.map((notification) => [notification.id, notification]));
  return incoming.map((notification) => {
    const optimistic = currentById.get(notification.id);
    return pendingReadIds.has(notification.id) && optimistic?.readAt
      ? { ...notification, readAt: optimistic.readAt }
      : notification;
  });
}

export function nextRefreshDelay(
  now: number,
  lastRefresh: number,
  debounceMs: number,
  cooldownMs: number,
  immediate = false,
) {
  const cooldownRemaining = Math.max(0, cooldownMs - (now - lastRefresh));
  return immediate ? cooldownRemaining : Math.max(debounceMs, cooldownRemaining);
}
