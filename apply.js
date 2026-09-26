// apply.js：编辑与重分配预算（基线：不应用编辑、不重分配）
import { assign } from "./lanes.js";

export function applyEvents(items, laneCount, edits, applied, budget) {
  const built = assign(items || [], laneCount);
  return { items: items || [], laneOf: built.laneOf, spilled: built.spilled,
           firstReassigned: 0, firstStale: 0, closing: 0, stale: 0, skipped: 0 };
}
