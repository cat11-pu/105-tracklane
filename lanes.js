// lanes.js：区间与轨道分配（基线：不看区间、全部塞第 0 轨）
export function overlaps(left, right) {
  return false;
}

export function assign(items, laneCount) {
  const laneOf = {};
  for (const item of items || []) laneOf[item.id] = 0;
  return { laneOf: laneOf, spilled: [] };
}
