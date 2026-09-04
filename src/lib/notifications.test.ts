import assert from "node:assert/strict";
import test from "node:test";
import { nextRefreshDelay, reconcileNotificationSnapshot, unreadNotificationCount, upsertNotification, type InAppNotification } from "./notifications.ts";

const notification = (id: string, createdAt: string, readAt: string | null = null): InAppNotification => ({
  id,
  organizationId: "organization",
  userId: "user",
  actorId: null,
  type: "appointment.created",
  title: "Novo agendamento",
  message: "Um agendamento foi criado.",
  entityType: "appointment",
  entityId: id,
  metadata: {},
  readAt,
  createdAt,
});

test("upsert por id reconcilia o registro sem duplicar", () => {
  const original = notification("one", "2026-09-04T10:00:00.000Z");
  const updated = { ...original, readAt: "2026-09-04T10:01:00.000Z" };
  assert.deepEqual(upsertNotification([original], updated), [updated]);
});

test("upsert mantém notificações em ordem decrescente", () => {
  const older = notification("old", "2026-09-04T09:00:00.000Z");
  const newer = notification("new", "2026-09-04T11:00:00.000Z");
  assert.deepEqual(upsertNotification([older], newer).map((item) => item.id), ["new", "old"]);
});

test("não lidas são derivadas exclusivamente de readAt", () => {
  assert.equal(unreadNotificationCount([
    notification("one", "2026-09-04T10:00:00.000Z"),
    notification("two", "2026-09-04T11:00:00.000Z", "2026-09-04T11:02:00.000Z"),
  ]), 1);
});

test("snapshot do servidor preserva somente leituras otimistas pendentes", () => {
  const pending = notification("pending", "2026-09-04T10:00:00.000Z");
  const stable = notification("stable", "2026-09-04T11:00:00.000Z");
  const current = [
    { ...pending, readAt: "2026-09-04T10:01:00.000Z" },
    { ...stable, readAt: "2026-09-04T11:01:00.000Z" },
  ];
  const reconciled = reconcileNotificationSnapshot([pending, stable], current, new Set(["pending"]));
  assert.equal(reconciled[0].readAt, "2026-09-04T10:01:00.000Z");
  assert.equal(reconciled[1].readAt, null);
});

test("refresh durante cooldown agenda a execução no fim da janela", () => {
  assert.equal(nextRefreshDelay(1_400, 1_000, 280, 1_200), 800);
  assert.equal(nextRefreshDelay(2_400, 1_000, 280, 1_200), 280);
  assert.equal(nextRefreshDelay(1_400, 1_000, 280, 1_200, true), 800);
});
