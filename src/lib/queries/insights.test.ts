import assert from "node:assert/strict";
import test from "node:test";
import { unreadInsightCount, unreadInsightIds, type VisibleInsightReadState } from "./insights.ts";

function insight(read: boolean, index: number): VisibleInsightReadState {
  return {
    id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    status: "new",
    snoozed_until: null,
    read_at: read ? "2026-09-03T12:00:00.000Z" : null,
  };
}

for (const expected of [0, 1, 3, 20]) {
  test(`unreadInsightCount returns ${expected}`, () => {
    const rows = Array.from({ length: expected }, (_, index) => insight(false, index));
    rows.push(insight(true, expected + 1));
    assert.equal(unreadInsightCount(rows), expected);
  });
}

test("unreadInsightIds preserves the records used by the badge", () => {
  const rows = [insight(false, 1), insight(true, 2), insight(false, 3)];
  assert.deepEqual(unreadInsightIds(rows), [rows[0].id, rows[2].id]);
});
