import { createRng, parseSeed } from "./rng.js";
import { DRILL_CATALOG, generateQuestions, getFamily } from "./generators.js";

const $ = (sel) => document.querySelector(sel);

function fillSelects() {
  const fam = $("#family");
  fam.innerHTML = "";
  for (const f of DRILL_CATALOG) {
    const opt = document.createElement("option");
    opt.value = f.id;
    opt.textContent = `${f.title_zh}（${f.edb}）`;
    fam.appendChild(opt);
  }
  fam.addEventListener("change", syncModes);
  syncModes();
}

function syncModes() {
  const f = getFamily($("#family").value);
  const mode = $("#mode");
  mode.innerHTML = "";
  for (const m of f.modes) {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.extracurricular ? `⚠ ${m.label_zh}` : m.label_zh;
    mode.appendChild(opt);
  }
}

function activeModeMeta() {
  const f = getFamily($("#family").value);
  return f.modes.find((m) => m.id === $("#mode").value);
}

function renderSheet(questions, meta) {
  const sheet = $("#sheet");
  const answers = $("#answer-sheet");
  const cols = Number($("#columns").value) || 3;
  const extracurricular = !!(activeModeMeta() && activeModeMeta().extracurricular);

  const header = `
    <header class="sheet-header">
      <div class="brand">WordBank 算術操練</div>
      <h1>${meta.title_zh}</h1>
      <p class="edb">對應單位：${meta.edb}${extracurricular ? '　<span class="tag-extra">課程外延展</span>' : ""}</p>
      <p class="mode-line">${meta.modeLabel}</p>
      <div class="meta-row">
        <span>姓名：______________</span>
        <span>日期：______________</span>
        <span>種子：${meta.seed}</span>
        <span>題數：${questions.length}</span>
      </div>
    </header>`;

  const rows = Math.max(1, Math.ceil(questions.length / cols));

  const qHtml = questions
    .map(
      (q, i) =>
        `<div class="q"><span class="qn">${i + 1}.</span> <span class="qp">${formatPrompt(
          q.prompt
        )}</span></div>`
    )
    .join("");

  sheet.innerHTML = `${header}<div class="qgrid cols-${cols}" style="--rows:${rows}">${qHtml}</div>
    <footer class="sheet-footer">橫式心算　約 10–15 秒／題　自檢請見答案頁</footer>`;

  const aHtml = questions
    .map(
      (q, i) =>
        `<div class="q ans"><span class="qn">${i + 1}.</span> <span class="qp">${escapeHtml(
          String(q.answer)
        )}</span></div>`
    )
    .join("");

  answers.innerHTML = `
    <header class="sheet-header">
      <div class="brand">答案頁（自檢）</div>
      <h1>${meta.title_zh}</h1>
      <p class="edb">種子：${meta.seed}　題數：${questions.length}</p>
    </header>
    <div class="qgrid cols-${cols}" style="--rows:${rows}">${aHtml}</div>`;
}

/** Escape HTML, then turn □ into a large handwriting box. */
function formatPrompt(s) {
  return escapeHtml(s).replace(/□/g, '<span class="blank" aria-label="填空"></span>');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function generate() {
  const family = getFamily($("#family").value);
  const modeId = $("#mode").value;
  const modeMeta = family.modes.find((m) => m.id === modeId);
  const count = Math.min(60, Math.max(20, Number($("#count").value) || 48));
  const seedRaw = $("#seed").value.trim();
  const seed = parseSeed(seedRaw === "" ? null : seedRaw);
  $("#seed").value = String(seed);
  const rng = createRng(seed);
  const allowTrivial = $("#allow-trivial").checked;
  const questions = generateQuestions(family.id, modeId, rng, count, { allowTrivial });
  renderSheet(questions, {
    title_zh: family.title_zh,
    edb: family.edb,
    modeLabel: modeMeta.label_zh,
    seed,
  });
  $("#workspace").hidden = false;
  $("#empty-hint").hidden = true;
}

function init() {
  fillSelects();
  $("#btn-generate").addEventListener("click", generate);
  $("#btn-print").addEventListener("click", () => window.print());
  $("#btn-new-seed").addEventListener("click", () => {
    $("#seed").value = String((Math.random() * 0xffffffff) >>> 0);
    generate();
  });
  // auto first page for smoke test convenience
  $("#seed").value = "20261015";
  generate();
}

init();
