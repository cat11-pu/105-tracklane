// apply.js：按序应用编辑，每轮预算内重分配，收尾一次补齐陈旧
import { assign } from "./lanes.js";

function badSpan() {
  const error = new Error("bad span");
  error.code = "E_BAD_SPAN";
  return error;
}

function ordered(items) {
  return items.slice().sort(function (left, right) {
    return left.start - right.start || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  });
}

function differences(currentLane, currentItems, target) {
  const changed = [];
  for (const item of ordered(currentItems)) {
    const oldLane = Object.prototype.hasOwnProperty.call(currentLane, item.id) ? currentLane[item.id] : -1;
    if (oldLane !== target.laneOf[item.id]) changed.push(item);
  }
  return changed;
}

function settle(currentItems, currentLane, laneCount, limit) {
  const target = assign(currentItems, laneCount);
  const changed = differences(currentLane, currentItems, target);
  const taken = limit < 0 ? changed.length : Math.min(limit, changed.length);
  for (let index = 0; index < taken; index += 1) {
    const item = changed[index];
    currentLane[item.id] = target.laneOf[item.id];
  }
  let staleCount = 0;
  for (const item of ordered(currentItems)) {
    if (currentLane[item.id] !== target.laneOf[item.id]) staleCount += 1;
  }
  return { targetSpilled: target.spilled, reassigned: taken, stale: staleCount };
}

export function applyEvents(items, laneCount, edits, applied, budget) {
  const currentItems = (items || []).map(function (item) {
    return { id: item.id, start: item.start, length: item.length };
  });
  const seen = new Set(applied || []);
  let skipped = 0;
  let firstReassigned = 0;
  let firstStale = 0;
  let firstRound = true;

  let built = assign(currentItems, laneCount);
  const currentLane = built.laneOf;
  let staleCount = 0;

  const cap = Number.isFinite(budget) ? Math.max(0, Math.floor(budget)) : -1;

  for (const edit of edits || []) {
    if (edit && Object.prototype.hasOwnProperty.call(edit, "edit_id") && seen.has(edit.edit_id)) {
      skipped += 1;
      continue;
    }
    if (edit && edit.edit_id !== undefined) seen.add(edit.edit_id);

    if (edit.op === "set") {
      const target = currentItems.find(function (item) { return item.id === edit.id; });
      if (!target) throw badSpan();
      const nextStart = edit.start !== undefined ? edit.start : target.start;
      const nextLength = edit.length !== undefined ? edit.length : target.length;
      if (nextStart < 0 || nextLength <= 0) throw badSpan();
      target.start = nextStart;
      target.length = nextLength;
    } else if (edit.op === "add") {
      if (edit.start < 0 || edit.length <= 0) throw badSpan();
      currentItems.push({ id: edit.id, start: edit.start, length: edit.length });
    } else if (edit.op === "remove") {
      const index = currentItems.findIndex(function (item) { return item.id === edit.id; });
      if (index < 0) throw badSpan();
      currentItems.splice(index, 1);
      delete currentLane[edit.id];
    }

    const round = settle(currentItems, currentLane, laneCount, cap);
    staleCount = round.stale;
    if (firstRound) {
      firstReassigned = round.reassigned;
      firstStale = round.stale;
      firstRound = false;
    }
  }

  let closing = 0;
  if (staleCount > 0) {
    const round = settle(currentItems, currentLane, laneCount, -1);
    closing = round.reassigned;
    staleCount = round.stale;
  }

  const finalAssign = assign(currentItems, laneCount);
  return {
    items: currentItems,
    laneOf: currentLane,
    spilled: finalAssign.spilled,
    firstReassigned: firstReassigned,
    firstStale: firstStale,
    closing: closing,
    stale: staleCount,
    skipped: skipped
  };
}
