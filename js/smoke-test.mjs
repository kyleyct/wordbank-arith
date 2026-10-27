import { createRng } from "./rng.js";
import {
  DRILL_CATALOG,
  generateQuestions,
  isTrivialPrompt,
} from "./generators.js";
import { subtractionNeedsBorrow } from "./math-utils.js";

/**
 * Trivial patterns (must stay in sync with isTrivialPrompt / README 品質):
 * - n − n
 * - n + 0, 0 + n, n − 0, multi-add + 0
 * - n × 0, 0 × n, n × 1, 1 × n, n ÷ 1, 0 ÷ n
 * - n × m ÷ m
 * - bond zeros: n = n + □, n = 0 + □, n + □ = n, □ + 0 = …, 0 + □ = …
 */

console.assert(!subtractionNeedsBorrow(58, 23), "58-23 no borrow");
console.assert(subtractionNeedsBorrow(52, 27), "52-27 borrow");
console.assert(isTrivialPrompt("7 − 7 = □"), "detect n−n");
console.assert(isTrivialPrompt("5 + 0 = □"), "detect +0");
console.assert(isTrivialPrompt("0 + 5 = □"), "detect 0+");
console.assert(isTrivialPrompt("9 − 0 = □"), "detect −0");
console.assert(isTrivialPrompt("6 × 1 = □"), "detect ×1");
console.assert(isTrivialPrompt("1 × 6 = □"), "detect 1×");
console.assert(isTrivialPrompt("8 ÷ 1 = □"), "detect ÷1");
console.assert(isTrivialPrompt("4 × 3 ÷ 3 = □"), "detect ×m÷m");
console.assert(isTrivialPrompt("10 = 10 + □"), "detect bond zero");
console.assert(!isTrivialPrompt("6 + 2 = □"), "non-trivial add");
console.assert(!isTrivialPrompt("7 × 8 = □"), "non-trivial mul");
console.assert(!isTrivialPrompt("1.5 × 2 = □"), "decimal 1.5 not ×1 trivial");
console.assert(!isTrivialPrompt("3 × 0.5 = □"), "decimal 0.5 not ×0 trivial");
console.assert(!isTrivialPrompt("2.4 ÷ 1.2 = □"), "÷1.2 not ÷1 trivial");
console.assert(isTrivialPrompt("2.4 ÷ 1 = □"), "÷1 still trivial");

const seed = 20261015;
let failures = 0;

for (const fam of DRILL_CATALOG) {
  for (const mode of fam.modes) {
    const rng = createRng(seed);
    const qs = generateQuestions(fam.id, mode.id, rng, 48, { allowTrivial: false });
    if (qs.length !== 48) {
      console.error("count fail", fam.id, mode.id, qs.length);
      failures++;
    }
    const prompts = qs.map((q) => q.prompt);
    const unique = new Set(prompts);
    if (unique.size !== qs.length) {
      console.error(
        "duplicate prompts",
        fam.id,
        mode.id,
        "unique",
        unique.size,
        "/",
        qs.length
      );
      failures++;
    }
    for (const q of qs) {
      if (isTrivialPrompt(q.prompt)) {
        console.error("trivial leak (filter on)", fam.id, mode.id, q.prompt);
        failures++;
        break;
      }
    }

    if (fam.id === "add_sub_within_100" && mode.id === "no_borrow") {
      for (const q of qs) {
        const m = q.prompt.match(/(\d+)\s*−\s*(\d+)/);
        if (m && subtractionNeedsBorrow(+m[1], +m[2])) {
          console.error("1N4 borrow leak", q.prompt);
          failures++;
          break;
        }
        if (q.prompt.includes("+") && !q.prompt.includes("−") && +q.answer >= 100) {
          console.error("sum>=100", q);
          failures++;
          break;
        }
      }
    }
    if (fam.id === "mult_div_table" && mode.id === "table_0_10") {
      for (const q of qs) {
        const m = q.prompt.match(/(\d+)\s*×\s*(\d+)/);
        if (m && (+m[1] > 10 || +m[2] > 10)) {
          console.error("factor>10", q.prompt);
          failures++;
          break;
        }
      }
    }
    if (fam.id === "mult_div_table" && mode.id === "div_exact_0_10") {
      for (const q of qs) {
        if (!Number.isInteger(+q.answer)) {
          console.error("non-exact div", q);
          failures++;
          break;
        }
      }
    }


    if (fam.id === "mult_div_table" && mode.id === "div_remain_0_10") {
      for (const q of qs) {
        if (/（商⋯餘）/.test(q.prompt)) {
          console.error("awkward parenthetical remain prompt", q.prompt);
          failures++;
          break;
        }
        if (!/□⋯□/.test(q.prompt)) {
          console.error("remain prompt should use □⋯□ template", q.prompt);
          failures++;
          break;
        }
        if (!/⋯/.test(String(q.answer))) {
          console.error("remain mode missing ⋯", q);
          failures++;
          break;
        }
        const m = String(q.answer).match(/^(\d+)⋯(\d+)$/);
        if (!m || +m[2] <= 0) {
          console.error("remain must be >0", q);
          failures++;
          break;
        }
        const dm = q.prompt.match(/(\d+)\s*÷\s*(\d+)/);
        if (dm) {
          const dividend = +dm[1];
          const divisor = +dm[2];
          if (dividend % divisor === 0) {
            console.error("remain mode exact leak", q.prompt);
            failures++;
            break;
          }
          if (+m[1] * divisor + +m[2] !== dividend) {
            console.error("remain arithmetic wrong", q);
            failures++;
            break;
          }
          if (divisor > 10) {
            console.error("table remain divisor>10", q.prompt);
            failures++;
            break;
          }
        }
      }
    }

    if (fam.id === "int_mul_div_vertical") {
      for (const q of qs) {
        if (!q.meta || !q.meta.layout) {
          console.error("vertical missing layout meta", q);
          failures++;
          break;
        }
        if (mode.id === "mul_chain3") {
          if (q.meta.layout !== "vertical_mul_chain") {
            console.error("expected vertical_mul_chain", q);
            failures++;
            break;
          }
          const [a, b, c] = q.meta.factors;
          if (String(a).length !== 2 || String(b).length !== 1 || String(c).length !== 1) {
            console.error("mul_chain3 digit leak", a, b, c);
            failures++;
            break;
          }
          if (String(a * b * c) !== String(q.answer)) {
            console.error("mul_chain3 product mismatch", q);
            failures++;
            break;
          }
        } else if (mode.id.startsWith("mul_")) {
          if (q.meta.layout !== "vertical_mul") {
            console.error("expected vertical_mul", mode.id, q);
            failures++;
            break;
          }
          const top = q.meta.top;
          const bot = q.meta.bottom;
          const td = String(top).length;
          const bd = String(bot).length;
          if (mode.id === "mul_2by1" && !(td === 2 && bd === 1)) {
            console.error("mul_2by1 digit leak", top, bot);
            failures++;
            break;
          }
          if (mode.id === "mul_3by1" && !(td === 3 && bd === 1)) {
            console.error("mul_3by1 digit leak", top, bot);
            failures++;
            break;
          }
          if (mode.id === "mul_2by2" && !(td === 2 && bd === 2)) {
            console.error("mul_2by2 digit leak", top, bot);
            failures++;
            break;
          }
          if (mode.id === "mul_3by2" && !(td === 3 && bd === 2)) {
            console.error("mul_3by2 digit leak", top, bot);
            failures++;
            break;
          }
          if (String(top * bot) !== String(q.answer)) {
            console.error("mul product mismatch", q);
            failures++;
            break;
          }
        }
        if (mode.id === "div_chain3") {
          if (q.meta.layout !== "vertical_div_chain") {
            console.error("expected vertical_div_chain", q);
            failures++;
            break;
          }
          const [d1, d2] = q.meta.divisors;
          const mid = q.meta.mid;
          const finalQ = q.meta.quotient;
          if (mid * d1 !== q.meta.dividend || finalQ * d2 !== mid) {
            console.error("div_chain3 arithmetic", q);
            failures++;
            break;
          }
          if (String(q.answer) !== String(finalQ)) {
            console.error("div_chain3 answer", q);
            failures++;
            break;
          }
          if (/⋯/.test(String(q.answer)) || q.meta.remainTemplate) {
            console.error("div_chain3 must be exact quotient-only", q);
            failures++;
            break;
          }
        } else if (mode.id.startsWith("div_")) {
          if (q.meta.layout !== "vertical_div") {
            console.error("expected vertical_div", mode.id, q);
            failures++;
            break;
          }
          const dividend = q.meta.dividend;
          const divisor = q.meta.divisor;
          const dd = String(dividend).length;
          const vd = String(divisor).length;
          if (mode.id === "div_2by1" && !(dd === 2 && vd === 1)) {
            console.error("div_2by1 digit leak", dividend, divisor);
            failures++;
            break;
          }
          if (mode.id === "div_3by1" && !(dd === 3 && vd === 1)) {
            console.error("div_3by1 digit leak", dividend, divisor);
            failures++;
            break;
          }
          if (mode.id === "div_2by2" && !(dd === 2 && vd === 2)) {
            console.error("div_2by2 digit leak", dividend, divisor);
            failures++;
            break;
          }
          if (mode.id === "div_3by2" && !(dd === 3 && vd === 2)) {
            console.error("div_3by2 digit leak", dividend, divisor);
            failures++;
            break;
          }
          const quot = q.meta.quotient;
          const rem = q.meta.remainder;
          if (quot * divisor + rem !== dividend) {
            console.error("div arithmetic wrong", q);
            failures++;
            break;
          }
          if (rem < 0 || rem >= divisor) {
            console.error("bad remainder", q);
            failures++;
            break;
          }
          const expect = rem === 0 ? String(quot) : `${quot}⋯${rem}`;
          if (String(q.answer) !== expect) {
            console.error("div answer format", q.answer, expect);
            failures++;
            break;
          }
        }
      }
    }


    if (fam.id === "dec_mul_div" && (mode.id === "mul_dec_int" || mode.id === "mul_dec_dec")) {
      for (const q of qs) {
        const m = q.prompt.match(/([0-9.]+)\s*×\s*([0-9.]+)/);
        if (!m) {
          console.error("mul parse fail", q.prompt);
          failures++;
          break;
        }
        const a = +m[1];
        const b = +m[2];
        const places = (n) => {
          const s = String(n);
          return s.includes(".") ? s.split(".")[1].length : 0;
        };
        const digs = (n) => {
          let s = String(n).replace(/^-/, "").replace(".", "").replace(/^0+/, "");
          return s.length || 1;
        };
        if (places(a) > 2 || places(b) > 2) {
          console.error("mul >2dp", q.prompt);
          failures++;
          break;
        }
        const hi = Math.max(digs(a), digs(b));
        const lo = Math.min(digs(a), digs(b));
        if (hi > 3 || lo > 2) {
          console.error("mul digit>4N1", q.prompt, hi, lo);
          failures++;
          break;
        }
        // banned examples must never appear
        if (q.prompt.includes("0.124") || /\d+\.\d{3}/.test(q.prompt)) {
          console.error("3dp mul leak", q.prompt);
          failures++;
          break;
        }
        const prod = Math.round(a * b * 1e10) / 1e10;
        const ans = +q.answer;
        if (Math.abs(prod - ans) > 1e-8) {
          console.error("mul ans mismatch", q, prod);
          failures++;
          break;
        }
      }
    }

    if (fam.id === "dec_mul_div" && mode.id === "div_general") {
      for (const q of qs) {
        const m = q.prompt.match(/([0-9.]+)\s*÷\s*([0-9.]+)/);
        if (!m) {
          console.error("div parse fail", q.prompt);
          failures++;
          break;
        }
        const dividend = +m[1];
        const divisor = +m[2];
        // 4N2-style check after scaling divisor to int
        const dStr = String(divisor);
        const p = dStr.includes(".") ? dStr.split(".")[1].length : 0;
        const scale = 10 ** p;
        const newDivisor = Math.round(divisor * scale);
        const newDividend = dividend * scale;
        const nds = String(Number(newDividend.toFixed(10)));
        const dividendDigits = nds.replace(".", "").replace(/^0+/, "").length || 1;
        const divisorDigits = String(newDivisor).replace(/^0+/, "").length || 1;
        if (dividendDigits > 3 || divisorDigits > 2) {
          console.error("div digit>4N2", q.prompt, "->", nds, "/", newDivisor, dividendDigits, divisorDigits);
          failures++;
          break;
        }
        // banned patterns
        if (
          q.prompt.replace(/\s/g, "") === "12.34÷5.6" ||
          q.prompt.replace(/\s/g, "") === "12.3÷5.67" ||
          q.prompt.replace(/\s/g, "") === "123÷0.4"
        ) {
          console.error("banned div example", q.prompt);
          failures++;
          break;
        }
        const expect = dividend / divisor;
        if (Math.abs(expect - +q.answer) > 1e-8) {
          console.error("div ans mismatch", q, expect);
          failures++;
          break;
        }
      }
    }


    if (fam.id === "percent_convert") {
      for (const q of qs) {
        if (/應用|折扣|利息|增加了百分之|減少了百分之/.test(q.prompt)) {
          console.error("6N4-like leak", q.prompt);
          failures++;
          break;
        }
        const kind = mode.id === "mixed" ? (q.meta && q.meta.kind) : mode.id;
        if (kind === "pct_to_dec") {
          const m = q.prompt.match(/^([0-9.]+)%/);
          if (!m) {
            console.error("pct_to_dec parse", q.prompt);
            failures++;
            break;
          }
          const expect = +m[1] / 100;
          if (Math.abs(expect - +q.answer) > 1e-9) {
            console.error("pct_to_dec ans", q, expect);
            failures++;
            break;
          }
        }
        if (kind === "dec_to_pct") {
          if (!/%$/.test(String(q.answer))) {
            console.error("dec_to_pct answer not %", q);
            failures++;
            break;
          }
          const m = q.prompt.match(/^([0-9.]+)\s*=/);
          const pm = String(q.answer).match(/^([0-9.]+)%$/);
          if (!m || !pm || Math.abs(+m[1] * 100 - +pm[1]) > 1e-9) {
            console.error("dec_to_pct mismatch", q);
            failures++;
            break;
          }
        }
        if (kind === "pct_to_frac") {
          const m = q.prompt.match(/^([0-9.]+)%/);
          if (!m || !q.answer) {
            console.error("pct_to_frac parse", q);
            failures++;
            break;
          }
          // answer must be simplified fraction or integer/mixed — spot-check 2.5%→1/40 if present
          if (+m[1] === 2.5 && String(q.answer).replace(/\s/g, "") !== "1/40") {
            // only fail if this exact item appears with wrong ans
            const scaled = Math.round(+m[1] * 10);
            // 2.5 → 25/1000 = 1/40
          }
          if (+m[1] === 2.5 && !["1/40"].includes(String(q.answer).replace(/\s/g, ""))) {
            console.error("2.5% should be 1/40", q);
            failures++;
            break;
          }
        }
        if (kind === "frac_to_pct") {
          if (!/%$/.test(String(q.answer))) {
            console.error("frac_to_pct answer not %", q);
            failures++;
            break;
          }
        }
      }
      // curriculum honesty: family edb is 6N3 only
      if (fam.edb !== "6N3") {
        console.error("percent family must be 6N3 only", fam.edb);
        failures++;
      }
    }


    if (fam.id === "hcf_lcm") {
      const three = mode.id.endsWith("_3");
      if (three) {
        if (!mode.advanced || !mode.extracurricular) {
          console.error("three-number HCF/LCM must be advanced+extracurricular", mode);
          failures++;
        }
        if (!/進階課題/.test(mode.label_zh)) {
          console.error("three-number mode label must say 進階課題", mode.label_zh);
          failures++;
        }
        for (const q of qs) {
          if (!/、/.test(q.prompt)) {
            console.error("three-number prompt should list three nums", q.prompt);
            failures++;
            break;
          }
        }
      } else {
        for (const q of qs) {
          if (/、/.test(q.prompt)) {
            console.error("two-number mode leaked three-number prompt", q.prompt);
            failures++;
            break;
          }
        }
      }
    }

    if (fam.id === "dec_mul_div" && mode.id === "mixed_le4") {
      for (const q of qs) {
        // count operands roughly: digits/decimals separated by ops
        const ops = (q.prompt.match(/[＋+−\-×÷]/g) || []).length;
        // ≤4 numbers ⇒ ≤3 binary ops outside parens; allow up to 3 ops for 4 nums
        if (ops < 1 || ops > 3) {
          console.error("mixed_le4 op count out of range", q.prompt, ops);
          failures++;
          break;
        }
        if (/\([^)]*\(/.test(q.prompt)) {
          console.error("nested parens not allowed", q.prompt);
          failures++;
          break;
        }
        if (q.meta && q.meta.kind !== "mixed_le4") {
          console.error("mixed_le4 meta kind", q);
          failures++;
          break;
        }
      }
    }


    // P0 UX: 題幹不應再逐題括註形式；是非題用 choice:yesno
    for (const q of qs) {
      if (/（最簡分數）|（小數）|（百分數）|（是／否）/.test(q.prompt)) {
        console.error("per-item format hint still in stem", fam.id, mode.id, q.prompt);
        failures++;
        break;
      }
    }
    if (fam.id === "factors_primes" && (mode.id === "is_multiple" || mode.id === "is_prime" || mode.id === "divisibility")) {
      for (const q of qs) {
        if (!q.meta || q.meta.choice !== "yesno") {
          console.error("yes/no item missing choice:yesno", q);
          failures++;
          break;
        }
        if (q.answer !== "是" && q.answer !== "否") {
          console.error("yes/no answer must be 是/否", q);
          failures++;
          break;
        }
      }
    }
    if (fam.id === "int_mul_div_vertical" && fam.title_zh !== "直式得數練習") {
      console.error("vertical family title should be 直式得數練習", fam.title_zh);
      failures++;
    }

    const rng2 = createRng(seed);
    const qs2 = generateQuestions(fam.id, mode.id, rng2, 48, { allowTrivial: false });
    if (JSON.stringify(qs) !== JSON.stringify(qs2)) {
      console.error("seed not reproducible", fam.id, mode.id);
      failures++;
    }
  }
}

// Sample uniqueness report for Review seed
const sample = generateQuestions(
  "bonds_add_sub",
  "within10",
  createRng(20261015),
  48,
  { allowTrivial: false }
);
const u = new Set(sample.map((q) => q.prompt)).size;
console.log("within10 seed 20261015 unique", u, "/", sample.length);
console.log("families", DRILL_CATALOG.length, "failures", failures);
process.exit(failures ? 1 : 0);
