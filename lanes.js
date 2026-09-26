// lanes.js：区间与轨道分配
export function overlaps(left, right) {
  return left.start < right.start + right.length && right.start < left.start + left.length;
}

function byStartThenId(left, right) {
  if (left.start !== right.start) return left.start - right.start;
  if (left.id < right.id) return -1;
  if (left.id > right.id) return 1;
  return 0;
}

export function assign(items, laneCount) {
  const laneOf = {};
  const spilled = [];
  const lanes = [];
  for (let lane = 0; lane < laneCount; lane += 1) lanes.push([]);
  const sorted = (items || []).slice().sort(byStartThenId);
  for (const item of sorted) {
    let placed = -1;
    for (let lane = 0; lane < lanes.length; lane += 1) {
      let fits = true;
      for (const other of lanes[lane]) {
        if (overlaps(item, other)) { fits = false; break; }
      }
      if (fits) { placed = lane; break; }
    }
    if (placed === -1) {
      spilled.push(item.id);
      laneOf[item.id] = -1;
    } else {
      lanes[placed].push(item);
      laneOf[item.id] = placed;
    }
  }
  return { laneOf: laneOf, spilled: spilled };
}
