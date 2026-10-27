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
