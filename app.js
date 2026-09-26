// app.js：渲染结果
import { assign } from "./lanes.js";
import { applyEvents } from "./apply.js";

export function render(spec) {
  const first = applyEvents(spec.items || [], spec.lanes, spec.edits || [], spec.applied || [], spec.budget);
  const full = assign(first.items || [], spec.lanes);
  const order = (first.items || []).slice().sort(function (left, right) {
    return left.start - right.start || (left.id < right.id ? -1 : 1);
  });
  let diff = 0;
  for (const item of order) {
    if ((first.laneOf || {})[item.id] !== (full.laneOf || {})[item.id]) diff += 1;
  }
  return {
    order: order,
    lane_of: first.laneOf,
    spilled: full.spilled,
    first_reassigned: first.firstReassigned,
    first_stale: first.firstStale,
    closing: first.closing,
    stale: first.stale,
    unlimited_diff: diff,
    skipped: first.skipped
  };
}
