import assert from "node:assert";
import { overlaps, assign } from "../lanes.js";
import { applyEvents } from "../apply.js";
import { render } from "../app.js";

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

const items = [{ id: "i1", start: 0, length: 5 }, { id: "i2", start: 2, length: 4 }];
const edits = [{ edit_id: "m1", op: "add", id: "i3", start: 9, length: 2 }];

check("overlaps returns a boolean", () => {
  assert.strictEqual(typeof overlaps(items[0], items[1]), "boolean");
});

check("assign returns laneOf", () => {
  assert.strictEqual(typeof assign(items, 2).laneOf, "object");
});

check("assign returns spilled", () => {
  assert.ok(Array.isArray(assign(items, 2).spilled));
});

check("applyEvents returns laneOf", () => {
  assert.strictEqual(typeof applyEvents(items, 2, edits, [], 1).laneOf, "object");
});

check("applyEvents reports stale", () => {
  assert.strictEqual(typeof applyEvents(items, 2, edits, [], 1).stale, "number");
});

check("render exposes unlimited_diff", () => {
  const spec = { items: items, lanes: 2, edits: edits, applied: [], budget: 1 };
  assert.strictEqual(typeof render(spec).unlimited_diff, "number");
});

console.log("6 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
