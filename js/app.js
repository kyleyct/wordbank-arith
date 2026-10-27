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
  // 直式題較佔高：預設改為 2 欄、約 24 題（使用者仍可手動改）
  if (f.id === "int_mul_div_vertical") {
    $("#columns").value = "2";
    const c = Number($("#count").value);
    if (!Number.isFinite(c) || c >= 40) $("#count").value = "24";
  }
}

function activeModeMeta() {
  const f = getFamily($("#family").value);
  return f.modes.find((m) => m.id === $("#mode").value);
}

/** True if answer / text contains a simple or mixed fraction a/b. */
function looksLikeFraction(s) {
  return /(?:^|[^\d.])\d+\s+\d+\/\d+(?!\d)|(?:^|[^\d.])\d+\/\d+(?!\d)/.test(
    String(s)
  ) || /^\s*[−-]?\d+\/\d+\s*$/.test(String(s)) || /^\s*[−-]?\d+\s+\d+\/\d+\s*$/.test(String(s));
}

function fracHtml(num, den, neg = false) {
  const sign = neg ? '<span class="frac-neg">−</span>' : "";
  return `${sign}<span class="frac" title="${num}/${den}"><span class="frac-num">${num}</span><span class="frac-bar" aria-hidden="true"></span><span class="frac-den">${den}</span></span>`;
}

function mixedHtml(whole, num, den, neg = false) {
  const sign = neg ? '<span class="frac-neg">−</span>' : "";
  return `<span class="mixed">${sign}<span class="mixed-whole">${whole}</span>${fracHtml(num, den, false)}</span>`;
}

/** Schoolbook vertical multiplication (stacked operands + bar + blank). */
function verticalMulHtml(top, bottom, { showAnswer = false, answer = "" } = {}) {
  const ans = showAnswer
    ? `<span class="valg-ans-text">${escapeHtml(String(answer))}</span>`
    : `<span class="blank blank-valg" aria-label="填空"></span>`;
  return `<span class="valg valg-mul" title="${top} × ${bottom}">
    <span class="valg-row valg-top">${top}</span>
    <span class="valg-row valg-bot"><span class="valg-sign">×</span>${bottom}</span>
    <span class="valg-bar" aria-hidden="true"></span>
    <span class="valg-row valg-ans">${ans}</span>
  </span>`;
}

/** Schoolbook long-division bracket; blank for 商（⋯餘）. */
function verticalDivHtml(dividend, divisor, { showAnswer = false, answer = "" } = {}) {
  const ans = showAnswer
    ? `<span class="valg-ans-text">${escapeHtml(String(answer))}</span>`
    : `<span class="blank blank-valg blank-valg-div" aria-label="填空"></span>`;
  return `<span class="valg valg-div" title="${dividend} ÷ ${divisor}">
    <span class="valg-quot">${ans}</span>
    <span class="valg-div-body">
      <span class="valg-divisor">${divisor}</span>
      <span class="valg-dividend">${dividend}</span>
    </span>
  </span>`;
}


/**
 * Escape HTML, then turn schoolbook fractions (n/d, mixed w n/d) into stacked
 * vertical fractions, and □ into handwriting blanks.
 * @param {string} s
 * @param {{ fracBlank?: boolean }} [opts]
 */
function formatMathHtml(s, { fracBlank = false } = {}) {
  let out = escapeHtml(s);

  // Mixed numbers first: optional minus + whole + proper fraction
  out = out.replace(/([−-])?(\d+)\s+(\d+)\/(\d+)/g, (_, sign, whole, num, den) =>
    mixedHtml(whole, num, den, !!sign)
  );

  // Proper / improper inline fractions (skip if already inside HTML we emitted — we emit no raw /)
  out = out.replace(/([−-])?(\d+)\/(\d+)/g, (_, sign, num, den) =>
    fracHtml(num, den, !!sign)
  );

  const blankClass = fracBlank ? "blank blank-frac" : "blank";
  out = out.replace(/□/g, `<span class="${blankClass}" aria-label="填空"></span>`);
  return out;
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

  const isVertical = questions.some((q) => q.meta && (q.meta.layout === "vertical_mul" || q.meta.layout === "vertical_div"));
  const remainHint = questions.some((q) => q.meta && (q.meta.remain || q.meta.layout === "vertical_div"));

  const qHtml = questions
    .map((q, i) => {
      const layout = q.meta && q.meta.layout;
      if (layout === "vertical_mul") {
        return `<div class="q has-valg"><span class="qn">${i + 1}.</span> <span class="qp">${verticalMulHtml(
          q.meta.top,
          q.meta.bottom
        )}</span></div>`;
      }
      if (layout === "vertical_div") {
        return `<div class="q has-valg"><span class="qn">${i + 1}.</span> <span class="qp">${verticalDivHtml(
          q.meta.dividend,
          q.meta.divisor
        )}</span></div>`;
      }
      const fracAns = looksLikeFraction(q.answer) || looksLikeFraction(q.prompt);
      const remainAns = /⋯/.test(String(q.answer)) || (q.meta && q.meta.remain);
      const cls = fracAns ? "q has-frac" : remainAns ? "q has-remain" : "q";
      return `<div class="${cls}"><span class="qn">${i + 1}.</span> <span class="qp">${formatMathHtml(
        q.prompt,
        { fracBlank: looksLikeFraction(q.answer) }
      )}</span></div>`;
    })
    .join("");

  const footerBits = [];
  if (isVertical) footerBits.push("直式演算　自檢請見答案頁");
  else footerBits.push("橫式心算　約 10–15 秒／題　自檢請見答案頁");
  if (remainHint) footerBits.push("帶餘數答案格式：商⋯餘（整除時只寫商）");

  sheet.innerHTML = `${header}<div class="qgrid cols-${cols}${isVertical ? " qgrid-valg" : ""}" style="--rows:${rows}">${qHtml}</div>
    <footer class="sheet-footer">${footerBits.join("　")}</footer>`;

  const aHtml = questions
    .map((q, i) => {
      const layout = q.meta && q.meta.layout;
      if (layout === "vertical_mul") {
        return `<div class="q ans has-valg"><span class="qn">${i + 1}.</span> <span class="qp">${verticalMulHtml(
          q.meta.top,
          q.meta.bottom,
          { showAnswer: true, answer: q.answer }
        )}</span></div>`;
      }
      if (layout === "vertical_div") {
        return `<div class="q ans has-valg"><span class="qn">${i + 1}.</span> <span class="qp">${verticalDivHtml(
          q.meta.dividend,
          q.meta.divisor,
          { showAnswer: true, answer: q.answer }
        )}</span></div>`;
      }
      const fracAns = looksLikeFraction(q.answer);
      const cls = fracAns ? "q ans has-frac" : "q ans";
      return `<div class="${cls}"><span class="qn">${i + 1}.</span> <span class="qp">${formatMathHtml(
        String(q.answer)
      )}</span></div>`;
    })
    .join("");

  answers.innerHTML = `
    <header class="sheet-header">
      <div class="brand">答案頁（自檢）</div>
      <h1>${meta.title_zh}</h1>
      <p class="edb">種子：${meta.seed}　題數：${questions.length}</p>
    </header>
    <div class="qgrid cols-${cols}${isVertical ? " qgrid-valg" : ""}" style="--rows:${rows}">${aHtml}</div>`;
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

/** Optional URL overrides: ?family=&mode=&seed=&count=&columns= (defaults unchanged). */
function applyQueryParams() {
  const sp = new URLSearchParams(location.search);
  if (sp.has("family")) {
    const id = sp.get("family");
    if ([...$("#family").options].some((o) => o.value === id)) {
      $("#family").value = id;
      syncModes();
    }
  }
  if (sp.has("mode")) {
    const id = sp.get("mode");
    if ([...$("#mode").options].some((o) => o.value === id)) {
      $("#mode").value = id;
    }
  }
  if (sp.has("seed")) {
    $("#seed").value = sp.get("seed");
  }
  if (sp.has("count")) {
    const n = Number(sp.get("count"));
    if (Number.isFinite(n)) $("#count").value = String(n);
  }
  if (sp.has("columns")) {
    const c = sp.get("columns");
    if ([...$("#columns").options].some((o) => o.value === c)) {
      $("#columns").value = c;
    }
  }
}

function init() {
  fillSelects();
  $("#btn-generate").addEventListener("click", generate);
  $("#btn-print").addEventListener("click", () => window.print());
  $("#btn-new-seed").addEventListener("click", () => {
    $("#seed").value = String((Math.random() * 0xffffffff) >>> 0);
    generate();
  });

  const sp = new URLSearchParams(location.search);
  applyQueryParams();

  // Default demo page for smoke / first load; query params override family/mode/seed
  if (!sp.has("seed")) {
    $("#seed").value = "20261015";
  }
  // Keep default family/mode (within10) unless query overrides were applied
  generate();
}

init();
