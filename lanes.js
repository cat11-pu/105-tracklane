// lanes.js：区间与轨道分配（按起点贪心，编号最小的空轨优先，排不下记溢出）
export function overlaps(left, right) {
  return left.start < right.start + right.length && right.start < left.start + left.length;
}

export function assign(items, laneCount) {
  const list = (items || []).slice().sort(function (left, right) {
    return left.start - right.start || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
  });
  const laneOf = {};
  const spilled = [];
  const tracks = [];
  for (let lane = 0; lane < (laneCount || 0); lane += 1) tracks.push([]);
  for (const item of list) {
    let placed = -1;
    for (let lane = 0; lane < tracks.length; lane += 1) {
      if (tracks[lane].every(function (other) { return !overlaps(item, other); })) {
        placed = lane;
        break;
      }
    }
    if (placed < 0) {
      laneOf[item.id] = -1;
      spilled.push(item.id);
    } else {
      laneOf[item.id] = placed;
      tracks[placed].push(item);
    }
  }
  return { laneOf: laneOf, spilled: spilled };
}
