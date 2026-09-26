import fs from "node:fs";
import { render } from "./app.js";
import { applyEvents } from "./apply.js";

// 验收断言：上面每条值收进 emit，最后与期望值逐项比对，不符就非零退出。
const __lines = [];
function emit(label, value) { __lines.push([String(label).replace(/ =$/, ""), value]); }


const spec = JSON.parse(fs.readFileSync(process.argv[2] || "sample/lanes.json", "utf8"));
const view = render(spec);

emit("轨道 =", JSON.stringify(view.order.map(function (item) {
  const lane = view.lane_of[item.id];
  return [item.id, lane === undefined || lane === null ? -1 : lane];
})));
emit("溢出条目 =", JSON.stringify(view.spilled));
emit("首轮重分配数 =", view.first_reassigned);
emit("首轮陈旧数 =", view.first_stale);
emit("收尾重分配数 =", view.closing);
emit("最终陈旧数 =", view.stale);
emit("与全量差异 =", view.unlimited_diff);
emit("跳过编辑数 =", view.skipped);


// ---- 异常路径探针：真调用实现，看它报出什么码（不是从样例里抄）----
try {
  const bad = applyEvents([{ id: "i1", start: 0, length: 4 }], 2,
    [{ edit_id: "mx", op: "add", id: "ix", start: -1, length: 3 }], [], 1);
  emit("区间非法错误码 =", bad && bad.code ? bad.code : "no-error");
} catch (error) {
  emit("区间非法错误码 =", error.code || error.message);
}


// ---- 期望值（参考模型算出，与题面给的验收数值一致）----
const EXPECTED = {
  "轨道": [
    [
      "i1",
      0
    ],
    [
      "i2",
      0
    ],
    [
      "i5",
      1
    ],
    [
      "i3",
      -1
    ],
    [
      "i4",
      0
    ]
  ],
  "溢出条目": [
    "i3"
  ],
  "首轮重分配数": 1,
  "首轮陈旧数": 1,
  "收尾重分配数": 0,
  "最终陈旧数": 0,
  "与全量差异": 0,
  "跳过编辑数": 1,
  "区间非法错误码": "E_BAD_SPAN"
};
// 有的值在收进来之前已经 stringify 过，比较前先试着解析回来，避免类型错配把正确实现判成不过。
function __same(got, want) {
  if (typeof got === "string") {
    try { const parsed = JSON.parse(got); if (JSON.stringify(parsed) === JSON.stringify(want)) return true; } catch (error) { /* 不是 JSON 就按原文比 */ }
  }
  return JSON.stringify(got) === JSON.stringify(want);
}
let __bad = 0;
for (const [label, want] of Object.entries(EXPECTED)) {
  const found = __lines.find((pair) => pair[0] === label);
  if (!found) { __bad += 1; console.log("缺失验收项 " + label); continue; }
  const got = found[1];
  if (__same(got, want)) { console.log("一致 " + label + " = " + JSON.stringify(got)); }
  else { __bad += 1; console.log("不一致 " + label + " 期望 " + JSON.stringify(want) + " 实际 " + JSON.stringify(got)); }
}
console.log("验收项 " + (Object.keys(EXPECTED).length - __bad) + "/" + Object.keys(EXPECTED).length + " 通过");
process.exit(__bad === 0 ? 0 : 1);
