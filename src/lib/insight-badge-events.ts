export const INSIGHT_READ_STATE_EVENT = "kronos:insight-read-state";

export type InsightReadStateChange = { id: string; unread: boolean };
export type InsightReadOverrides = ReadonlyMap<string, boolean>;

export function applyInsightReadOverride(overrides: InsightReadOverrides, change: InsightReadStateChange) {
  const next = new Map(overrides);
  next.set(change.id, change.unread);
  return next;
}

export function reconcileInsightReadOverrides(sourceIds: ReadonlySet<string>, overrides: InsightReadOverrides) {
  return new Map([...overrides].filter(([id, unread]) => sourceIds.has(id) !== unread));
}

export function visibleUnreadInsightIds(sourceIds: ReadonlySet<string>, overrides: InsightReadOverrides) {
  const visible = new Set(sourceIds);
  for (const [id, unread] of overrides) {
    if (unread) visible.add(id);
    else visible.delete(id);
  }
  return visible;
}

export function emitInsightReadState(change: InsightReadStateChange) {
  window.dispatchEvent(new CustomEvent<InsightReadStateChange>(INSIGHT_READ_STATE_EVENT, { detail: change }));
}
