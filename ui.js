// ui.js：轨道分配控制台（操作面板 + 轨道视图 + 一轮一轮执行）
import { assign } from "./lanes.js";
import { applyEvents } from "./apply.js";

const COLORS = ["#2f6fed", "#0a7a3d", "#a86400", "#8a2be2", "#b3261e"];

export function mount(spec, parts) {
  const lanes = spec.lanes;
  let queue = (spec.edits || []).map(function (edit) { return Object.assign({}, edit); });
  let state = { items: (spec.items || []).map(function (i) { return { id: i.id, start: i.start, length: i.length }; }), laneOf: {}, spilled: [], stale: 0, done: 0, note: "还没开始" };
  let budget = spec.budget;

  function seed() {
    const built = assign(state.items, lanes);
    state.laneOf = built.laneOf;
    state.spilled = built.spilled;
    state.stale = 0;
    state.done = 0;
    state.note = "已载入检查点";
  }

  function runRound() {
    if (!queue.length) { state.note = "没有待执行的事件了"; return; }
    const edit = queue.shift();
    const applied = queue.map(function (other) { return other.edit_id; });
    const result = applyEvents(state.items, lanes, [edit], applied, budget);
    state.items = result.items || state.items;
    state.laneOf = result.laneOf || state.laneOf;
    state.stale = result.stale || 0;
    state.spilled = assign(state.items, lanes).spilled;
    state.done += 1;
    state.note = "执行了 " + edit.edit_id + "（" + edit.op + "），本轮陈旧 " + state.stale + " 条";
  }

  function runAll() {
    if (!queue.length) { state.note = "没有待执行的事件了"; return; }
    const rest = queue.slice();
    queue = [];
    const result = applyEvents(state.items, lanes, rest, [], budget);
    state.items = result.items || state.items;
    state.laneOf = result.laneOf || state.laneOf;
    state.stale = result.stale || 0;
    state.spilled = assign(state.items, lanes).spilled;
    state.done += rest.length;
    state.note = "连续执行了 " + rest.length + " 个事件";
  }

  function draw() {
    parts.stage.innerHTML = "";
    for (let lane = 0; lane < lanes; lane += 1) {
      const row = document.createElement("div");
      row.className = "row";
      const tag = document.createElement("span");
      tag.textContent = "轨道 " + lane;
      tag.style.width = "50px";
      tag.style.color = "#5b6474";
      tag.style.fontSize = "12px";
      row.appendChild(tag);
      const track = document.createElement("div");
      track.style.flex = "1";
      track.style.position = "relative";
      track.style.height = "24px";
      track.style.background = "#f1f4f9";
      track.style.borderRadius = "6px";
      row.appendChild(track);
      for (const item of state.items) {
        if (state.laneOf[item.id] !== lane) continue;
        const block = document.createElement("div");
        block.textContent = item.id + " (" + item.start + "+" + item.length + ")";
        block.title = "点一下就删掉这个条目";
        block.style.position = "absolute";
        block.style.left = (item.start * 12 + 2) + "px";
        block.style.width = Math.max(20, item.length * 12 - 4) + "px";
        block.style.top = "2px";
        block.style.bottom = "2px";
        block.style.background = COLORS[lane % COLORS.length];
        block.style.color = "#fff";
        block.style.borderRadius = "5px";
        block.style.fontSize = "11px";
        block.style.lineHeight = "20px";
        block.style.paddingLeft = "4px";
        block.style.cursor = "pointer";
        block.addEventListener("click", function () {
          queue.push({ edit_id: "ui-del-" + item.id + "-" + queue.length, op: "remove", id: item.id });
          runRound();
          draw();
        });
        track.appendChild(block);
      }
      parts.stage.appendChild(row);
    }
    parts.legend.innerHTML = "";
    const chip = document.createElement("span");
    chip.className = "chip " + ((state.spilled || []).length ? "bad" : "ok");
    chip.textContent = (state.spilled || []).length ? "溢出：" + state.spilled.join("、") : "无溢出";
    parts.legend.appendChild(chip);
    const second = document.createElement("span");
    second.className = "chip " + (state.stale ? "warn" : "ok");
    second.textContent = "本轮陈旧 " + state.stale + " 条 · 还剩 " + queue.length + " 个事件";
    second.style.marginLeft = "8px";
    parts.legend.appendChild(second);
    parts.out.textContent = JSON.stringify({
      lane_of: state.laneOf, spilled: state.spilled, stale: state.stale, 还剩事件: queue.length
    }, null, 1);
    parts.log.textContent = state.note + "（预算 " + budget + " 条/轮；点轨道上的色块可删条目）";
  }

  function build() {
    parts.controls.innerHTML = "";
    const stepBtn = document.createElement("button");
    stepBtn.className = "primary";
    stepBtn.textContent = "执行下一轮";
    stepBtn.addEventListener("click", function () { runRound(); draw(); });
    const allBtn = document.createElement("button");
    allBtn.textContent = "一次跑完";
    allBtn.addEventListener("click", function () { runAll(); draw(); });
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "重置";
    resetBtn.addEventListener("click", function () {
      queue = (spec.edits || []).map(function (edit) { return Object.assign({}, edit); });
      state.items = (spec.items || []).map(function (i) { return { id: i.id, start: i.start, length: i.length }; });
      seed();
      draw();
    });
    parts.controls.appendChild(stepBtn);
    parts.controls.appendChild(allBtn);
    parts.controls.appendChild(resetBtn);

    const budgetLabel = document.createElement("label");
    budgetLabel.textContent = "每轮最多重分配几条（预算）";
    const budgetInput = document.createElement("input");
    budgetInput.type = "number";
    budgetInput.min = "1";
    budgetInput.value = String(budget);
    budgetInput.addEventListener("change", function () {
      budget = Math.max(1, Number(budgetInput.value) || 1);
      draw();
    });
    parts.controls.appendChild(budgetLabel);
    parts.controls.appendChild(budgetInput);

    const addLabel = document.createElement("label");
    addLabel.textContent = "加一条：起点 / 长度";
    const startInput = document.createElement("input");
    startInput.type = "number";
    startInput.value = "1";
    startInput.style.width = "54px";
    const lenInput = document.createElement("input");
    lenInput.type = "number";
    lenInput.value = "3";
    lenInput.style.width = "54px";
    const addBtn = document.createElement("button");
    addBtn.textContent = "加一条";
    addBtn.addEventListener("click", function () {
      const id = "ui" + (state.done + 1);
      queue.push({ edit_id: "ui-add-" + id, op: "add", id: id,
                   start: Math.max(0, Number(startInput.value) || 0), length: Math.max(1, Number(lenInput.value) || 1) });
      runRound();
      draw();
    });
    parts.controls.appendChild(addLabel);
    parts.controls.appendChild(startInput);
    parts.controls.appendChild(lenInput);
    parts.controls.appendChild(addBtn);
  }

  seed();
  build();
  draw();
}
