import assert from "node:assert/strict";
import test from "node:test";
import { calendarEntitySignature, calendarRoute, localDateTimeToIso, minutesBetween, minutesToTime, moveGridFocus, moveRange, normalizeSlotInterval, reconcileCalendarSnapshot, rollbackCalendarEntity, snapMinutes } from "./calendar-grid.ts";

test("aceita apenas intervalos suportados", () => {
  assert.equal(normalizeSlotInterval(10), 10);
  assert.equal(normalizeSlotInterval("15"), 15);
  assert.equal(normalizeSlotInterval(17), 30);
});

test("snap respeita a granularidade", () => {
  assert.equal(snapMinutes(23, 15), 30);
  assert.equal(snapMinutes(64, 10), 60);
});

test("conversao local preserva America/Sao_Paulo", () => {
  assert.equal(localDateTimeToIso("2026-09-04T09:30", "America/Sao_Paulo"), "2026-09-04T12:30:00.000Z");
  assert.equal(localDateTimeToIso("2026-01-15T09:30", "America/New_York"), "2026-01-15T14:30:00.000Z");
});

test("rejeita horario inexistente no salto DST e datas normalizadas", () => {
  assert.throws(() => localDateTimeToIso("2026-03-08T02:30", "America/New_York"), /não existe/);
  assert.throws(() => localDateTimeToIso("2026-02-30T09:00"), /não existe/);
  assert.equal(localDateTimeToIso("2026-03-08T03:30", "America/New_York"), "2026-03-08T07:30:00.000Z");
  assert.equal(localDateTimeToIso("2026-09-04T00:00", "Asia/Tokyo"), "2026-09-03T15:00:00.000Z");
});

test("move mantem duracao e minutos sao formatados", () => {
  const moved = moveRange("2026-09-04T12:00:00Z", "2026-09-04T12:45:00Z", "2026-09-05T14:15:00Z");
  assert.equal(minutesBetween(moved.startsAt, moved.endsAt), 45);
  assert.equal(minutesToTime(8 * 60 + 15), "08:15");
  assert.deepEqual([45, 90, 180].map((duration) => minutesBetween("2026-09-04T12:00:00Z", new Date(Date.parse("2026-09-04T12:00:00Z") + duration * 60_000))), [45, 90, 180]);
});

test("snapshot reconcilia todos os campos e preserva somente entidade pendente", () => {
  const base: import("./calendar-grid.ts").CalendarSnapshotEntity = { id: "a", title: "A", description: "", location: "", color: "#000000", customerId: null, serviceId: null, notes: "", status: "scheduled", startsAt: "2026-01-01T10:00:00Z", endsAt: "2026-01-01T11:00:00Z" };
  const local = { ...base, title: "otimista" }; const server = { ...base, title: "servidor", description: "novo", location: "Sala", color: "#ffffff", customerId: "c", serviceId: "s", notes: "n", status: "confirmed", startsAt: "2026-01-01T12:00:00Z", endsAt: "2026-01-01T13:30:00Z" };
  assert.equal(reconcileCalendarSnapshot([server], [local], new Set(["a"]))[0].title, "otimista");
  assert.equal(calendarEntitySignature(reconcileCalendarSnapshot([server], [local], new Set())[0]), calendarEntitySignature(server));
});

test("rollback troca apenas o id afetado", () => {
  const before = [{ id: "a", value: 1 }, { id: "b", value: 20 }];
  assert.deepEqual(rollbackCalendarEntity(before, { id: "a", value: 0 }), [{ id: "a", value: 0 }, { id: "b", value: 20 }]);
});

test("lista permanece na URL e navegação de grade é limitada", () => {
  assert.equal(calendarRoute("list", "2026-09-04"), "/agenda?view=list&date=2026-09-04");
  assert.equal(moveGridFocus(2, "ArrowRight", 4, 12), 6);
  assert.equal(moveGridFocus(0, "ArrowUp", 4, 12), 0);
});
