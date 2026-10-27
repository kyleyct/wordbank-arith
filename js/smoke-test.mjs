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
        if (mode.id.startsWith("mul_")) {
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
        if (mode.id.startsWith("div_")) {
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
