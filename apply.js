// apply.js：编辑与重分配预算
import { assign } from "./lanes.js";

function badSpan() {
  const error = new Error("E_BAD_SPAN");
  error.code = "E_BAD_SPAN";
  return error;
}

function byStartThenId(left, right) {
  if (left.start !== right.start) return left.start - right.start;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

function has(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export function applyEvents(items, laneCount, edits, applied, budget) {
  const limit = Math.max(0, Number(budget) || 0);
  const done = new Set(applied || []);
  const current = (items || []).map(function (item) {
    return { id: item.id, start: item.start, length: item.length };
  });
  let laneOf = assign(current, laneCount).laneOf;
  let skipped = 0;
  let firstReassigned = 0;
  let firstStale = 0;
  let rounds = 0;

  for (const edit of edits || []) {
    if (done.has(edit.edit_id)) { skipped += 1; continue; }
    if (edit.op === "set") {
      const target = current.find(function (item) { return item.id === edit.id; });
      if (!target) throw badSpan();
      if (!(edit.length > 0)) throw badSpan();
      if (edit.start !== undefined && !(edit.start >= 0)) throw badSpan();
      target.length = edit.length;
      if (edit.start !== undefined) target.start = edit.start;
    } else if (edit.op === "add") {
      if (!(edit.start >= 0) || !(edit.length > 0)) throw badSpan();
      current.push({ id: edit.id, start: edit.start, length: edit.length });
    } else if (edit.op === "remove") {
      const index = current.findIndex(function (item) { return item.id === edit.id; });
      if (index === -1) throw badSpan();
      current.splice(index, 1);
    }
    done.add(edit.edit_id);

    const full = assign(current, laneCount);
    for (const id of Object.keys(laneOf)) {
      if (!has(full.laneOf, id)) delete laneOf[id];
    }
    const changed = [];
    for (const item of current) {
      if (!has(laneOf, item.id)) {
        laneOf[item.id] = full.laneOf[item.id];
      } else if (laneOf[item.id] !== full.laneOf[item.id]) {
        changed.push(item);
      }
    }
    changed.sort(byStartThenId);
    let reassigned = 0;
    for (const item of changed) {
      if (reassigned >= limit) break;
      laneOf[item.id] = full.laneOf[item.id];
      reassigned += 1;
    }
    let stale = 0;
    for (const item of current) {
      if (laneOf[item.id] !== full.laneOf[item.id]) stale += 1;
    }
    rounds += 1;
    if (rounds === 1) { firstReassigned = reassigned; firstStale = stale; }
  }

  const finalFull = assign(current, laneCount);
  let closing = 0;
  for (const item of current) {
    if (laneOf[item.id] !== finalFull.laneOf[item.id]) {
      laneOf[item.id] = finalFull.laneOf[item.id];
      closing += 1;
    }
  }
  return { items: current, laneOf: laneOf, spilled: finalFull.spilled,
           firstReassigned: firstReassigned, firstStale: firstStale,
           closing: closing, stale: 0, skipped: skipped };
}
