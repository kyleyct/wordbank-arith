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
  $("#mode").addEventListener("change", syncModeHint);
  syncModes();
}

function syncModes() {
  const f = getFamily($("#family").value);
  const mode = $("#mode");
  mode.innerHTML = "";
  for (const m of f.modes) {
    const opt = document.createElement("option");
    opt.value = m.id;
    if (m.advanced) opt.textContent = `★ ${m.label_zh}`;
    else if (m.extracurricular) opt.textContent = `⚠ ${m.label_zh}`;
    else opt.textContent = m.label_zh;
    mode.appendChild(opt);
  }
  const hint = $("#layout-hint");
  // 直式題較佔高：預設改為 2 欄、約 24 題（使用者仍可手動改）
  if (f.id === "int_mul_div_vertical") {
    const prevCols = $("#columns").value;
    const prevCount = $("#count").value;
    $("#columns").value = "2";
    const c = Number($("#count").value);
    if (!Number.isFinite(c) || c >= 40) $("#count").value = "24";
    const changed = prevCols !== "2" || String(prevCount) !== String($("#count").value);
    // 供 syncModeHint 讀取：剛做了自動調整
    if (hint) hint.dataset.autoLayout = changed ? "1" : "0";
  } else if (hint) {
    hint.dataset.autoLayout = "0";
  }
  syncModeHint();
}

function syncModeHint() {
  const hint = $("#layout-hint");
  if (!hint) return;
  const f = getFamily($("#family").value);
  const modeId = $("#mode").value;
  if (f.id === "int_mul_div_vertical") {
    const auto = hint.dataset.autoLayout === "1";
    const base = auto
      ? "已自動調整為 2 欄、約 24 題（直式得數較佔版面；可手動改回）。"
      : "直式得數練習建議 2 欄、約 24 題（可手動調整）。";
    let extra = "";
    if (/^div_[23]by[12]$/.test(modeId)) {
      extra = "　除法：第 1 題為例題；整除只寫商，有餘數填「商⋯餘」。";
    } else if (modeId === "div_chain3") {
      extra = "　連除：題面只填最終商；答案頁列中間商。";
    }
    hint.hidden = false;
    hint.textContent = base + extra;
    return;
  }
  if (f.id === "mult_div_table" && modeId === "div_remain_0_10") {
    hint.hidden = false;
    hint.textContent = "帶餘數模式：第 1 題為例題（示範「商⋯餘」寫法）。";
    return;
  }
  hint.hidden = true;
  hint.textContent = "";
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
  // title 用全形「／」，避免後續 \d+/\d+ 正則誤傷屬性
  return `${sign}<span class="frac" title="${num}／${den}"><span class="frac-num">${num}</span><span class="frac-bar" aria-hidden="true"></span><span class="frac-den">${den}</span></span>`;
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

/** 三數連乘直式：a × b × c */
function verticalMulChainHtml(factors, { showAnswer = false, answer = "" } = {}) {
  const [a, b, c] = factors;
  const ans = showAnswer
    ? `<span class="valg-ans-text">${escapeHtml(String(answer))}</span>`
    : `<span class="blank blank-valg" aria-label="填空"></span>`;
  return `<span class="valg valg-mul valg-mul-chain" title="${a} × ${b} × ${c}">
    <span class="valg-row valg-top">${a}</span>
    <span class="valg-row valg-bot"><span class="valg-sign">×</span>${b}</span>
    <span class="valg-row valg-bot"><span class="valg-sign">×</span>${c}</span>
    <span class="valg-bar" aria-hidden="true"></span>
    <span class="valg-row valg-ans">${ans}</span>
  </span>`;
}

/**
 * 三數連除直式：題面只留最終得數空格；答案頁可顯示中間商。
 * @param {{ showAnswer?: boolean, answer?: string, mid?: number|string }} [opts]
 */
function verticalDivChainHtml(dividend, d1, d2, { showAnswer = false, answer = "", mid = "" } = {}) {
  const finalAns = showAnswer
    ? `<span class="valg-ans-text">${escapeHtml(String(answer))}</span>`
    : `<span class="blank blank-valg blank-valg-div" aria-label="最終得數"></span>`;
  const midCell = showAnswer
    ? `<span class="valg-ans-text valg-mid-ans" title="中間商">${escapeHtml(String(mid))}</span>`
    : ""; // 題面不設中間空格，避免誤以為須交中間步
  return `<span class="valg valg-div-chain" title="${dividend} ÷ ${d1} ÷ ${d2}">
    <span class="valg-div-chain-step">
      <span class="valg-quot">${midCell}</span>
      <span class="valg-div-body">
        <span class="valg-divisor">${d1}</span>
        <span class="valg-dividend">${dividend}</span>
      </span>
    </span>
    <span class="valg-chain-next"><span class="valg-sign">÷</span>${d2} = ${finalAns}</span>
  </span>`;
}

/** 是／否圈選（題面兩圈；答案頁標示正確項） */
function yesNoHtml(answer, { showAnswer = false } = {}) {
  const yesOn = showAnswer && answer === "是";
  const noOn = showAnswer && answer === "否";
  return `<span class="yn-choice" role="group" aria-label="是或否">
    <span class="yn-opt${yesOn ? " yn-on" : ""}" aria-label="是">是</span>
    <span class="yn-opt${noOn ? " yn-on" : ""}" aria-label="否">否</span>
  </span>`;
}

/** 「商⋯餘」雙格模板（橫式／直式共用）。 */
function remainPairHtml({ showAnswer = false, answer = "", example = false } = {}) {
  if (showAnswer || example) {
    const text = escapeHtml(String(answer));
    return `<span class="remain-pair remain-pair-filled" aria-label="${text}"><span class="remain-filled">${text}</span></span>`;
  }
  return `<span class="remain-pair" aria-label="商⋯餘"><span class="blank blank-remain" aria-label="商"></span><span class="remain-dots" aria-hidden="true">⋯</span><span class="blank blank-remain" aria-label="餘"></span></span>`;
}

/** Schoolbook long-division bracket; quotient row uses 商⋯餘 template when remainTemplate. */
function verticalDivHtml(dividend, divisor, { showAnswer = false, answer = "", remainTemplate = true } = {}) {
  let ans;
  if (showAnswer) {
    ans = `<span class="valg-ans-text">${escapeHtml(String(answer))}</span>`;
  } else if (remainTemplate) {
    ans = remainPairHtml();
  } else {
    ans = `<span class="blank blank-valg blank-valg-div" aria-label="填空"></span>`;
  }
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

  // 只在標籤外的文字替換分數，避免 title／屬性內的「n/d」被二次解析
  function replaceInText(html, replacer) {
    return html.replace(/(^|>)([^<]*)/g, (_, boundary, text) => boundary + replacer(text));
  }

  // Mixed numbers first: optional minus + whole + proper fraction
  out = replaceInText(out, (text) =>
    text.replace(/([−-])?(\d+)\s+(\d+)\/(\d+)/g, (_, sign, whole, num, den) =>
      mixedHtml(whole, num, den, !!sign)
    )
  );

  // Proper / improper inline fractions
  out = replaceInText(out, (text) =>
    text.replace(/([−-])?(\d+)\/(\d+)/g, (_, sign, num, den) => fracHtml(num, den, !!sign))
  );

  // 帶餘數模板 □⋯□ → 雙格（先於單格 □ 替換）
  out = out.replace(/□⋯□/g, remainPairHtml());

  const blankClass = fracBlank ? "blank blank-frac" : "blank";
  out = out.replace(/□/g, `<span class="${blankClass}" aria-label="填空"></span>`);
  return out;
}

/** 頁首一次顯示的作答形式說明（題幹不再逐題括註） */
function sheetFormatNotes(familyId, modeId, questions) {
  const notes = [];
  const formats = new Set(
    questions.map((q) => q.meta && q.meta.format).filter(Boolean)
  );
  const hasYesNo = questions.some((q) => q.meta && q.meta.choice === "yesno");
  const hasFracAns = questions.some((q) => looksLikeFraction(q.answer));
  const convertOnly = questions.every((q) => q.meta && q.meta.convert) && questions.length > 0;

  if (hasYesNo) notes.push("是非題：請圈選「是」或「否」。");
  if (formats.has("frac") || (hasFracAns && !formats.has("dec") && !formats.has("pct"))) {
    if (convertOnly) notes.push("答案寫最簡分數（互化專練：請依題目要求的形式）。");
    else notes.push("分數答案以最簡為準；大於 1 時本頁採用帶分數。帶分數與假分數皆可（互化專練除外）。");
  }
  if (formats.has("dec")) notes.push("答案寫小數。");
  if (formats.has("pct")) notes.push("答案寫百分數（可含 ％ 符號）。");
  if (familyId === "int_mul_div_vertical") {
    notes.push("直式得數練習：只填最終得數，無須寫出直式步驟。");
    if (modeId === "div_chain3") {
      notes.push("三數連除：題面只填最終商；答案頁另列中間商供自檢。");
    }
  }
  if (familyId === "mult_div_table" && modeId === "div_remain_0_10") {
    notes.push("帶餘數：填「商⋯餘」（第 1 題為例題）。");
  }
  if (familyId === "int_mul_div_vertical" && /^div_[23]by[12]$/.test(modeId)) {
    notes.push("有餘數填「商⋯餘」；整除只寫商（第 1 題為例題）。");
  }
  return notes;
}

function renderSheet(questions, meta) {
  const sheet = $("#sheet");
  const answers = $("#answer-sheet");
  const cols = Number($("#columns").value) || 3;
  const modeM = activeModeMeta();
  const advanced = !!(modeM && modeM.advanced);
  const extracurricular = !!(modeM && modeM.extracurricular && !advanced);
  const extraTag = advanced
    ? '　<span class="tag-extra tag-advanced">進階課題</span>'
    : extracurricular
      ? '　<span class="tag-extra">課程外延展</span>'
      : "";
  const formatNotes = sheetFormatNotes(meta.familyId, meta.modeId, questions);
  const formatBlock = formatNotes.length
    ? `<p class="format-note">${formatNotes.map(escapeHtml).join("　")}</p>`
    : "";

  const header = `
    <header class="sheet-header">
      <div class="brand">自學教材系列　算術自習基礎練習</div>
      <h1>${meta.title_zh}</h1>
      <p class="edb">對應單位：${meta.edb}${extraTag}</p>
      <p class="mode-line">${meta.modeLabel}</p>
      ${formatBlock}
      <div class="meta-row">
        <span>姓名：______________</span>
        <span>日期：______________</span>
        <span>種子：${meta.seed}</span>
        <span>題數：${questions.length}</span>
      </div>
    </header>`;

  const rows = Math.max(1, Math.ceil(questions.length / cols));

  const isVertical = questions.some(
    (q) =>
      q.meta &&
      (q.meta.layout === "vertical_mul" ||
        q.meta.layout === "vertical_div" ||
        q.meta.layout === "vertical_mul_chain" ||
        q.meta.layout === "vertical_div_chain")
  );
  const remainHint = questions.some(
    (q) => q.meta && (q.meta.remain || q.meta.remainTemplate || q.meta.layout === "vertical_div")
  );
  const hasExample = questions.some((q) => q.meta && q.meta.example);

  const qHtml = questions
    .map((q, i) => {
      const layout = q.meta && q.meta.layout;
      const isEx = !!(q.meta && q.meta.example);
      const exNote = isEx
        ? `<span class="ex-note">例：寫作 <span class="ex-note-fmt">商⋯餘</span>${
            q.meta && q.meta.remain === false
              ? "；整除只寫商"
              : ""
          }</span>`
        : "";
      if (layout === "vertical_mul_chain") {
        return `<div class="q has-valg"><span class="qn">${i + 1}.</span> <span class="qp">${verticalMulChainHtml(
          q.meta.factors
        )}</span></div>`;
      }
      if (layout === "vertical_div_chain") {
        const [d1, d2] = q.meta.divisors;
        return `<div class="q has-valg"><span class="qn">${i + 1}.</span> <span class="qp">${verticalDivChainHtml(
          q.meta.dividend,
          d1,
          d2,
          { mid: q.meta.mid }
        )}</span></div>`;
      }
      if (layout === "vertical_mul") {
        return `<div class="q has-valg"><span class="qn">${i + 1}.</span> <span class="qp">${verticalMulHtml(
          q.meta.top,
          q.meta.bottom
        )}</span></div>`;
      }
      if (layout === "vertical_div") {
        const body = isEx
          ? verticalDivHtml(q.meta.dividend, q.meta.divisor, {
              showAnswer: true,
              answer: q.answer,
              remainTemplate: true,
            })
          : verticalDivHtml(q.meta.dividend, q.meta.divisor, {
              remainTemplate: q.meta.remainTemplate !== false,
            });
        const cls = isEx ? "q has-valg q-example" : "q has-valg";
        return `<div class="${cls}"><span class="qn">${i + 1}.</span> <span class="qp">${body}</span>${exNote}</div>`;
      }
      const fracAns = looksLikeFraction(q.answer) || looksLikeFraction(q.prompt);
      const remainAns = /□⋯□/.test(q.prompt) || /⋯/.test(String(q.answer)) || (q.meta && q.meta.remain);
      const isYesNo = q.meta && q.meta.choice === "yesno";
      let qp;
      if (isEx && remainAns) {
        // 例題：直接顯示填好的 商⋯餘
        const filled = escapeHtml(String(q.prompt)).replace(/□⋯□/g, remainPairHtml({ example: true, answer: q.answer }));
        qp = filled;
      } else if (isYesNo) {
        qp = `${formatMathHtml(q.prompt)} ${yesNoHtml(q.answer, { showAnswer: false })}`;
      } else {
        qp = formatMathHtml(q.prompt, { fracBlank: looksLikeFraction(q.answer) });
      }
      const cls = [
        "q",
        fracAns ? "has-frac" : "",
        remainAns ? "has-remain" : "",
        isYesNo ? "has-yn" : "",
        isEx ? "q-example" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `<div class="${cls}"><span class="qn">${i + 1}.</span> <span class="qp">${qp}</span>${exNote}</div>`;
    })
    .join("");

  const footerBits = [];
  if (isVertical) footerBits.push("直式得數練習（只填得數）　自檢請見答案頁");
  else footerBits.push("橫式心算　約 10–15 秒／題　自檢請見答案頁");
  if (remainHint) {
    footerBits.push(
      hasExample
        ? "第 1 題為例題；其餘題填「商⋯餘」（整除時只寫商）"
        : "帶餘數填「商⋯餘」（整除時只寫商）"
    );
  }

  sheet.innerHTML = `${header}<div class="qgrid cols-${cols}${isVertical ? " qgrid-valg" : ""}" style="--rows:${rows}">${qHtml}</div>
    <footer class="sheet-footer">${footerBits.join("　")}</footer>`;

  const aHtml = questions
    .map((q, i) => {
      const layout = q.meta && q.meta.layout;
      if (layout === "vertical_mul_chain") {
        return `<div class="q ans has-valg"><span class="qn">${i + 1}.</span> <span class="qp">${verticalMulChainHtml(
          q.meta.factors,
          { showAnswer: true, answer: q.answer }
        )}</span></div>`;
      }
      if (layout === "vertical_div_chain") {
        const [d1, d2] = q.meta.divisors;
        return `<div class="q ans has-valg"><span class="qn">${i + 1}.</span> <span class="qp">${verticalDivChainHtml(
          q.meta.dividend,
          d1,
          d2,
          { showAnswer: true, answer: q.answer, mid: q.meta.mid }
        )}</span></div>`;
      }
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
      const isYesNo = q.meta && q.meta.choice === "yesno";
      if (isYesNo) {
        return `<div class="q ans has-yn"><span class="qn">${i + 1}.</span> <span class="qp">${yesNoHtml(
          q.answer,
          { showAnswer: true }
        )}</span></div>`;
      }
      const cls = fracAns ? "q ans has-frac" : "q ans";
      return `<div class="${cls}"><span class="qn">${i + 1}.</span> <span class="qp">${formatMathHtml(
        String(q.answer)
      )}</span></div>`;
    })
    .join("");

  answers.innerHTML = `
    <header class="sheet-header">
      <div class="brand">答案頁（自檢）　自學教材系列　算術自習基礎練習</div>
      <h1>${meta.title_zh}</h1>
      <p class="edb">種子：${meta.seed}　題數：${questions.length}</p>
      ${formatBlock}
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
  // 帶餘數模式：第 1 題作例題（顯示已填 商⋯餘）
  const remainExampleMode =
    modeId === "div_remain_0_10" ||
    (family.id === "int_mul_div_vertical" && /^div_[23]by[12]$/.test(modeId));
  if (remainExampleMode && questions.length > 0) {
    const q0 = questions[0];
    questions[0] = {
      ...q0,
      meta: { ...(q0.meta || {}), example: true, remain: q0.meta?.remain !== false },
    };
  }
  renderSheet(questions, {
    title_zh: family.title_zh,
    edb: family.edb,
    modeLabel: modeMeta.label_zh,
    familyId: family.id,
    modeId,
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
