import assert from "node:assert/strict";
import test from "node:test";
import { applyInsightReadOverride, reconcileInsightReadOverrides, visibleUnreadInsightIds } from "./insight-badge-events.ts";

test("concurrent read overrides are isolated by insight id", () => {
  const source = new Set(["A", "B"]);
  let overrides = applyInsightReadOverride(new Map(), { id: "A", unread: false });
  overrides = applyInsightReadOverride(overrides, { id: "B", unread: false });
  assert.deepEqual([...visibleUnreadInsightIds(source, overrides)], []);

  overrides = applyInsightReadOverride(overrides, { id: "B", unread: true });
  assert.deepEqual([...visibleUnreadInsightIds(source, overrides)], ["B"]);
});

test("a server update clears only the override reflected for that id", () => {
  let overrides = applyInsightReadOverride(new Map(), { id: "A", unread: false });
  overrides = applyInsightReadOverride(overrides, { id: "B", unread: false });
  const sourceAfterA = new Set(["B"]);

  overrides = reconcileInsightReadOverrides(sourceAfterA, overrides);
  assert.equal(overrides.has("A"), false);
  assert.equal(overrides.get("B"), false);
  assert.equal(visibleUnreadInsightIds(sourceAfterA, overrides).size, 0);

  overrides = applyInsightReadOverride(overrides, { id: "B", unread: true });
  overrides = reconcileInsightReadOverrides(sourceAfterA, overrides);
  assert.deepEqual([...visibleUnreadInsightIds(sourceAfterA, overrides)], ["B"]);
  assert.equal(overrides.size, 0);
});
