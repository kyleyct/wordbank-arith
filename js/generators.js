/**
 * WordBank arithmetic generators — EDB constraints from edb-primary-arithmetic-map.
 * 橫式心算為主；整數乘除直式另族（無應用題）。
 */
import { randInt, pick, shuffle } from "./rng.js";
import {
  gcd,
  lcm,
  factorsOf,
  isPrime,
  formatFrac,
  simplifyFrac,
  subtractionNeedsBorrow,
  additionNeedsCarry,
} from "./math-utils.js";

/** @typedef {{ prompt: string, answer: string, meta?: object }} Q */

export const DRILL_CATALOG = [
  {
    id: "bonds_add_sub",
    title_zh: "10／18 以內加減與分解",
    edb: "1N1, 1N2",
    modes: [
      { id: "within10", label_zh: "關卡一：10 以內（分解＋加減）" },
      { id: "within18", label_zh: "關卡二：18 以內（1N2 口算）" },
    ],
  },
  {
    id: "mult_div_table",
    title_zh: "乘法表與表內除法",
    edb: "2N3, 2N6",
    modes: [
      { id: "table_0_10", label_zh: "乘法表 0–10（課程要求）" },
      { id: "div_exact_0_10", label_zh: "表內整除除法（無餘數）" },
      { id: "div_remain_0_10", label_zh: "表內帶餘數除法（商⋯餘；必有餘數）" },
      { id: "mixed_0_10", label_zh: "乘除混合（0–10；整除）" },
      {
        id: "challenge_11_12",
        label_zh: "挑戰：11–12（課程外延展）",
        extracurricular: true,
      },
    ],
  },
  {
    id: "add_sub_within_100",
    title_zh: "100 以內加減",
    edb: "1N4 → 2N2/2N5 兩位子集",
    modes: [
      { id: "no_borrow", label_zh: "1N4：無退位（和＜100；可進位加）" },
      { id: "with_borrow", label_zh: "退位減法／進位加法（兩位數，和＜100）" },
    ],
  },
  {
    id: "add_sub_within_1000",
    title_zh: "1000 以內加減（三位數延展）",
    edb: "2N2, 2N5",
    modes: [
      { id: "add_3digit", label_zh: "2N2：三位數加法（和＜1000）" },
      { id: "sub_3digit", label_zh: "2N5：三位數退位減法" },
      { id: "mixed_3", label_zh: "三數加減混合（≤三個位）" },
    ],
  },
  {
    id: "int_mul_div_vertical",
    title_zh: "整數乘除直式",
    edb: "3N2, 3N3, 4N1, 4N2",
    modes: [
      { id: "mul_2by1", label_zh: "3N2：兩位數 × 一位數（直式）" },
      { id: "mul_3by1", label_zh: "3N2：三位數 × 一位數（直式）" },
      { id: "div_2by1", label_zh: "3N3：兩位數 ÷ 一位數（直式；可含餘數）" },
      { id: "div_3by1", label_zh: "3N3：三位數 ÷ 一位數（直式；可含餘數）" },
      { id: "mul_2by2", label_zh: "4N1：兩位數 × 兩位數（直式）" },
      { id: "mul_3by2", label_zh: "4N1：三位數 × 兩位數（直式）" },
      { id: "div_2by2", label_zh: "4N2：兩位數 ÷ 兩位數（直式；可含餘數）" },
      { id: "div_3by2", label_zh: "4N2：三位數 ÷ 兩位數（直式；可含餘數）" },
    ],
  },
  {
    id: "factors_primes",
    title_zh: "因數／倍數／質數",
    edb: "4N3, 4N2",
    modes: [
      { id: "list_factors", label_zh: "列出兩位數的所有因數" },
      { id: "is_multiple", label_zh: "是否為某數的倍數" },
      { id: "is_prime", label_zh: "100 以內是否質數" },
      { id: "divisibility", label_zh: "整除性（2、3、5、10）" },
    ],
  },
  {
    id: "hcf_lcm",
    title_zh: "兩數 H.C.F.／L.C.M.",
    edb: "4N4",
    modes: [
      { id: "hcf", label_zh: "求最大公因數（H.C.F.）" },
      { id: "lcm", label_zh: "求最小公倍數（L.C.M.）" },
      { id: "mixed", label_zh: "H.C.F.／L.C.M. 混合" },
    ],
  },
  {
    id: "frac_same_den",
    title_zh: "同分母分數加減",
    edb: "3N5, 4N6",
    modes: [
      { id: "le1", label_zh: "3N5：結果不大於 1" },
      { id: "improper_ok", label_zh: "4N6：可大於 1（最簡帶分／假分）" },
    ],
  },
  {
    id: "frac_unlike",
    title_zh: "異分母分數加減",
    edb: "5N2",
    modes: [{ id: "den_le12", label_zh: "分母 ≤12；不多於三個分數" }],
  },
  {
    id: "frac_mul_div",
    title_zh: "分數乘除",
    edb: "5N3, 5N5",
    modes: [
      { id: "mul", label_zh: "分數乘法（≤3 個數）" },
      { id: "div", label_zh: "分數除法（≤3 個數）" },
    ],
  },
  {
    id: "dec_add_sub",
    title_zh: "小數加減",
    edb: "4N8",
    modes: [{ id: "1_2dp", label_zh: "一位／兩位小數（≤3 個數）" }],
  },
  {
    id: "frac_dec_convert",
    title_zh: "分數 ↔ 小數互化",
    edb: "4N7, 6N2",
    modes: [
      { id: "dec_to_frac", label_zh: "小數 → 最簡分數" },
      { id: "frac_to_dec", label_zh: "分數 → 小數" },
      { id: "mixed", label_zh: "互化混合" },
    ],
  },
  {
    id: "dec_mul_div",
    title_zh: "小數乘除",
    edb: "5N4, 6N1",
    modes: [
      { id: "mul_powers", label_zh: "5N4：×10／100／1000／0.1／0.01／0.001" },
      { id: "div_powers", label_zh: "6N1：÷10／100／1000／0.1／0.01／0.001" },
      { id: "mul_dec_int", label_zh: "5N4：小數 × 整數（一位／兩位小數）" },
      { id: "mul_dec_dec", label_zh: "5N4：小數 × 小數（一位／兩位小數）" },
      { id: "div_general", label_zh: "6N1：小數除法四類（數位≤4N2）" },
    ],
  },
  {
    id: "percent_convert",
    title_zh: "百分數互化",
    edb: "6N3",
    modes: [
      { id: "pct_to_dec", label_zh: "百分數 → 小數" },
      { id: "dec_to_pct", label_zh: "小數 → 百分數" },
      { id: "pct_to_frac", label_zh: "百分數 → 最簡分數" },
      { id: "frac_to_pct", label_zh: "分數 → 百分數" },
      { id: "mixed", label_zh: "百分／小數／分數互化混合" },
    ],
  },
  {
    id: "mixed_ops",
    title_zh: "四則混合（含圓括號）",
    edb: "3N4, 4N5",
    modes: [
      { id: "mul_add_sub", label_zh: "3N4：乘加／乘減（≤4 數；圓括號非嵌套）" },
      { id: "four_ops", label_zh: "4N5：四則混合（≤5 數；圓括號非嵌套）" },
    ],
  },
];

function q(prompt, answer, meta) {
  return { prompt, answer: String(answer), meta };
}

/* ---------- 1. 10/18 加減與分解 ---------- */
function genBondsAddSub(rng, mode, count, opts = {}) {
  const out = [];
  const maxSum = mode === "within18" ? 18 : 10;
  const allowTrivial = !!opts.allowTrivial;
  for (let i = 0; i < count; i++) {
    const kind = pick(rng, ["bond", "bond", "add", "sub", "missing"]);
    if (kind === "bond") {
      const total = randInt(rng, 2, maxSum);
      let a;
      if (allowTrivial) a = randInt(rng, 0, total);
      else a = randInt(rng, 1, total - 1); // both parts ≥1
      const b = total - a;
      if (rng() < 0.5) out.push(q(`${total} = ${a} + □`, b));
      else out.push(q(`${a} + □ = ${total}`, b));
    } else if (kind === "add") {
      let a, b;
      if (allowTrivial) {
        a = randInt(rng, 0, maxSum);
        b = randInt(rng, 0, maxSum - a);
      } else {
        a = randInt(rng, 1, maxSum - 1);
        b = randInt(rng, 1, maxSum - a);
      }
      out.push(q(`${a} + ${b} = □`, a + b));
    } else if (kind === "sub") {
      let a, b;
      if (allowTrivial) {
        a = randInt(rng, 0, maxSum);
        b = randInt(rng, 0, a);
      } else {
        a = randInt(rng, 2, maxSum);
        b = randInt(rng, 1, a - 1); // not n−n, not −0
      }
      out.push(q(`${a} − ${b} = □`, a - b));
    } else {
      const total = randInt(rng, allowTrivial ? 1 : 2, maxSum);
      let a;
      if (allowTrivial) a = randInt(rng, 0, total);
      else a = randInt(rng, 1, total - 1);
      const b = total - a;
      if (rng() < 0.5) out.push(q(`${a} + □ = ${total}`, b));
      else out.push(q(`□ + ${b} = ${total}`, a));
    }
  }
  return out;
}

/* ---------- 2. 乘法表 / 除法 ---------- */
function genMultDiv(rng, mode, count, opts = {}) {
  const out = [];
  const allowTrivial = !!opts.allowTrivial;
  const hi = mode === "challenge_11_12" ? 12 : 10;
  // denser default: factors 2..hi (skip 0/1 恆等)；開啟「包含零／恆等題」才用 0–hi
  const factorLo = allowTrivial ? (mode === "challenge_11_12" ? 11 : 0) : 2;
  const factorHi = hi;
  const mulLo = mode === "challenge_11_12" ? 11 : factorLo;

  for (let i = 0; i < count; i++) {
    if (mode === "div_remain_0_10") {
      // 2N6 帶餘數：表內可解；答案格式「商⋯餘」；本模式必有餘數（與整除模式對照）
      const d = allowTrivial ? randInt(rng, 2, 10) : randInt(rng, 2, 10);
      const quot = allowTrivial ? randInt(rng, 0, 10) : randInt(rng, 1, 10);
      const rem = randInt(rng, 1, d - 1);
      const dividend = d * quot + rem;
      out.push(
        q(`${dividend} ÷ ${d} = □（商⋯餘）`, `${quot}⋯${rem}`, {
          remain: true,
          quotient: quot,
          remainder: rem,
        })
      );
    } else if (mode === "div_exact_0_10" || (mode === "mixed_0_10" && rng() < 0.45)) {
      let d = allowTrivial ? randInt(rng, 1, 10) : randInt(rng, 2, 10);
      let m = allowTrivial ? randInt(rng, 0, 10) : randInt(rng, 2, 10);
      const product = d * m;
      out.push(q(`${product} ÷ ${d} = □`, m));
    } else if (mode === "challenge_11_12") {
      const big = randInt(rng, 11, 12);
      const small = allowTrivial ? randInt(rng, 0, 12) : randInt(rng, 2, 12);
      const form = pick(rng, ["mul_a", "mul_b", "div"]);
      if (form === "mul_a") out.push(q(`${big} × ${small} = □`, big * small));
      else if (form === "mul_b") out.push(q(`${small} × ${big} = □`, big * small));
      else out.push(q(`${big * small} ÷ ${big} = □`, small));
    } else {
      const a = randInt(rng, mulLo === 0 ? 0 : mulLo, factorHi);
      const b = allowTrivial ? randInt(rng, 0, factorHi) : randInt(rng, 2, factorHi);
      // if !allowTrivial ensure neither factor is 0 or 1
      const aa = allowTrivial ? a : Math.max(2, a || 2);
      const bb = allowTrivial ? b : Math.max(2, b);
      out.push(q(`${aa} × ${bb} = □`, aa * bb));
    }
  }
  return out;
}

/* ---------- 3. 100 以內（與 1000 嚴格分開） ---------- */
function genWithin100(rng, mode, count, opts = {}) {
  const out = [];
  const allowTrivial = !!opts.allowTrivial;
  const minOp = allowTrivial ? 0 : 1;
  for (let i = 0; i < count; i++) {
    const op = pick(rng, mode === "no_borrow" ? ["add", "add3", "sub"] : ["add", "sub"]);
    if (op === "add" || op === "add3") {
      let a, b, c;
      let tries = 0;
      do {
        a = randInt(rng, minOp, 98);
        const bMax = 99 - a;
        b = randInt(rng, minOp, Math.max(minOp, bMax));
        if (a + b > 99) continue;
        tries++;
      } while (
        (mode === "with_borrow" && !additionNeedsCarry(a, b) && tries < 40) ||
        (!allowTrivial && (a === 0 || b === 0) && tries < 40)
      );
      if (op === "add3" && mode === "no_borrow") {
        const rem = 99 - a - b;
        c = rem < minOp ? minOp : randInt(rng, minOp, Math.max(minOp, rem));
        if (a + b + c > 99) c = Math.max(0, 99 - a - b);
        if (!allowTrivial && c === 0 && rem >= 1) c = 1;
        if (a + b + c <= 99) out.push(q(`${a} + ${b} + ${c} = □`, a + b + c));
        else out.push(q(`${a} + ${b} = □`, a + b));
      } else {
        out.push(q(`${a} + ${b} = □`, a + b));
      }
    } else {
      let a, b;
      let tries = 0;
      if (mode === "no_borrow") {
        do {
          a = randInt(rng, allowTrivial ? 0 : 2, 99);
          b = randInt(rng, allowTrivial ? 0 : 1, allowTrivial ? a : Math.max(1, a - 1));
          tries++;
        } while (
          (subtractionNeedsBorrow(a, b) || (!allowTrivial && (b === 0 || a === b))) &&
          tries < 50
        );
      } else {
        do {
          a = randInt(rng, 10, 99);
          b = randInt(rng, 1, a - (allowTrivial ? 0 : 1) || 1);
          if (!allowTrivial && b >= a) b = a - 1;
          tries++;
        } while (
          (!subtractionNeedsBorrow(a, b) || (!allowTrivial && (b === 0 || a === b))) &&
          tries < 50
        );
      }
      out.push(q(`${a} − ${b} = □`, a - b));
    }
  }
  return out;
}

/* ---------- 3b. 1000 以內 — 獨立生成器 ---------- */
function genWithin1000(rng, mode, count, opts = {}) {
  const allowTrivial = !!opts.allowTrivial;
  const out = [];
  for (let i = 0; i < count; i++) {
    if (mode === "add_3digit") {
      const minB = allowTrivial ? 0 : 1;
      let a, b;
      do {
        a = randInt(rng, 100, 999);
        b = randInt(rng, minB, Math.max(minB, 999 - a));
      } while (a + b >= 1000 || (!allowTrivial && b === 0));
      if (rng() < 0.35 && 999 - a - b >= minB) {
        let c = randInt(rng, minB, Math.max(minB, 999 - a - b));
        if (!allowTrivial && c === 0) c = minB;
        out.push(q(`${a} + ${b} + ${c} = □`, a + b + c));
      } else {
        out.push(q(`${a} + ${b} = □`, a + b));
      }
    } else if (mode === "sub_3digit") {
      let a, b;
      let tries = 0;
      do {
        a = randInt(rng, 100, 999);
        b = randInt(rng, 1, allowTrivial ? a : Math.max(1, a - 1));
        tries++;
      } while (
        (!subtractionNeedsBorrow(a, b) || (!allowTrivial && a === b)) &&
        tries < 40
      );
      out.push(q(`${a} − ${b} = □`, a - b));
    } else {
      const minV = allowTrivial ? 0 : 1;
      const a = randInt(rng, minV, 999);
      const b = randInt(rng, minV, Math.max(minV, Math.min(999, a - (allowTrivial ? 0 : 1))));
      const mid = a - b;
      const c = randInt(rng, minV, 999);
      if (rng() < 0.5) {
        out.push(q(`${a} − ${b} + ${c} = □`, mid + c));
      } else {
        const addFirst = randInt(rng, minV, 500);
        const addSecond = randInt(rng, minV, Math.max(minV, 999 - addFirst));
        const sub = randInt(rng, minV, Math.max(minV, addFirst + addSecond - (allowTrivial ? 0 : 1)));
        out.push(q(`${addFirst} + ${addSecond} − ${sub} = □`, addFirst + addSecond - sub));
      }
    }
  }
  return out;
}

/* ---------- 4. 因數／倍數／質數 ---------- */
function genFactorsPrimes(rng, mode, count, opts = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    if (mode === "list_factors") {
      const n = randInt(rng, 10, 99);
      const f = factorsOf(n);
      out.push(q(`${n} 的所有因數：`, f.join(", ")));
    } else if (mode === "is_multiple") {
      const base = randInt(rng, 2, 12);
      const k = randInt(rng, 2, 20);
      const n = base * k;
      const distract = rng() < 0.4 ? n + randInt(rng, 1, base - 1) : n;
      const yes = distract % base === 0;
      out.push(q(`${distract} 是 ${base} 的倍數嗎？（是／否）`, yes ? "是" : "否"));
    } else if (mode === "is_prime") {
      // mix primes and composites under 100
      let n;
      if (rng() < 0.55) {
        const primes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97];
        n = pick(rng, primes);
      } else {
        do {
          n = randInt(rng, 4, 99);
        } while (isPrime(n));
      }
      out.push(q(`${n} 是質數嗎？（是／否）`, isPrime(n) ? "是" : "否"));
    } else {
      const d = pick(rng, [2, 3, 5, 10]);
      const n = randInt(rng, 10, 99);
      out.push(q(`${n} 能被 ${d} 整除嗎？（是／否）`, n % d === 0 ? "是" : "否"));
    }
  }
  return out;
}

/* ---------- 5. HCF / LCM ---------- */
function genHcfLcm(rng, mode, count, opts = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    // keep numbers manageable for listing method (兩位數為主)
    let a = randInt(rng, 4, 60);
    let b = randInt(rng, 4, 60);
    if (a === b) b = a + randInt(rng, 1, 5);
    const h = gcd(a, b);
    const l = lcm(a, b);
    const want =
      mode === "hcf" ? "hcf" : mode === "lcm" ? "lcm" : pick(rng, ["hcf", "lcm"]);
    if (want === "hcf") {
      out.push(q(`${a} 與 ${b} 的 H.C.F. = □`, h));
    } else {
      out.push(q(`${a} 與 ${b} 的 L.C.M. = □`, l));
    }
  }
  return out;
}

/* ---------- 6. 同分母分數 ---------- */
function genFracSameDen(rng, mode, count, opts = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const den = randInt(rng, 2, 12);
    const op = rng() < 0.55 ? "+" : "−";
    if (mode === "le1") {
      // 3N5: result ≤ 1, proper-ish
      if (op === "+") {
        const a = randInt(rng, 1, den - 1);
        const b = randInt(rng, 1, den - a);
        const ans = formatFrac(a + b, den, { allowMixed: false });
        out.push(q(`${a}/${den} + ${b}/${den} = □`, ans));
      } else {
        const a = randInt(rng, 1, den);
        const b = randInt(rng, 0, a);
        out.push(q(`${a}/${den} − ${b}/${den} = □`, formatFrac(a - b, den, { allowMixed: false })));
      }
    } else {
      // 4N6: can exceed 1, include integers sometimes
      const a = randInt(rng, 1, den * 2);
      const b = randInt(rng, 1, den * 2);
      if (op === "+") {
        out.push(q(`${a}/${den} + ${b}/${den} = □`, formatFrac(a + b, den, { allowMixed: true })));
      } else {
        const hi = Math.max(a, b);
        const lo = Math.min(a, b);
        out.push(q(`${hi}/${den} − ${lo}/${den} = □`, formatFrac(hi - lo, den, { allowMixed: true })));
      }
    }
  }
  return out;
}

/* ---------- 7. 異分母 ---------- */
function genFracUnlike(rng, _mode, count, opts = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const d1 = randInt(rng, 2, 12);
    let d2 = randInt(rng, 2, 12);
    if (d2 === d1) d2 = d1 === 12 ? 11 : d1 + 1;
    const n1 = randInt(rng, 1, d1);
    const n2 = randInt(rng, 1, d2);
    const op = rng() < 0.55 ? "+" : "−";
    const L = lcm(d1, d2);
    if (op === "+") {
      const num = (n1 * L) / d1 + (n2 * L) / d2;
      out.push(q(`${n1}/${d1} + ${n2}/${d2} = □`, formatFrac(num, L, { allowMixed: true })));
    } else {
      const A = (n1 * L) / d1;
      const B = (n2 * L) / d2;
      if (A >= B) {
        out.push(q(`${n1}/${d1} − ${n2}/${d2} = □`, formatFrac(A - B, L, { allowMixed: true })));
      } else {
        out.push(q(`${n2}/${d2} − ${n1}/${d1} = □`, formatFrac(B - A, L, { allowMixed: true })));
      }
    }
  }
  return out;
}

/* ---------- 8. 分數乘除 ---------- */
function genFracMulDiv(rng, mode, count, opts = {}) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = { n: randInt(rng, 1, 9), d: randInt(rng, 2, 9) };
    const b = { n: randInt(rng, 1, 9), d: randInt(rng, 2, 9) };
    if (mode === "mul" || (mode !== "div" && rng() < 0.5)) {
      const s = simplifyFrac(a.n * b.n, a.d * b.d);
      out.push(
        q(
          `${a.n}/${a.d} × ${b.n}/${b.d} = □`,
          formatFrac(s.num, s.den, { allowMixed: true })
        )
      );
    } else {
      const s = simplifyFrac(a.n * b.d, a.d * b.n);
      out.push(
        q(
          `${a.n}/${a.d} ÷ ${b.n}/${b.d} = □`,
          formatFrac(s.num, s.den, { allowMixed: true })
        )
      );
    }
  }
  return out;
}

/* ---------- 9. 小數加減 ---------- */
function genDecAddSub(rng, _mode, count, opts = {}) {
  const out = [];
  const mk = () => {
    const dp = randInt(rng, 1, 2);
    const raw = randInt(rng, 1, dp === 1 ? 99 : 999);
    return raw / (dp === 1 ? 10 : 100);
  };
  const fmt = (x) => {
    const s = String(Math.round(x * 100) / 100);
    return s;
  };
  for (let i = 0; i < count; i++) {
    let a = mk();
    let b = mk();
    // keep digit budget roughly like 4N8 (avoid huge integer parts)
    a = Math.round(a * 100) / 100;
    b = Math.round(b * 100) / 100;
    if (a > 50) a = a / 10;
    if (b > 50) b = b / 10;
    a = Math.round(a * 100) / 100;
    b = Math.round(b * 100) / 100;
    if (rng() < 0.55) {
      out.push(q(`${fmt(a)} + ${fmt(b)} = □`, fmt(a + b)));
    } else {
      const hi = Math.max(a, b);
      const lo = Math.min(a, b);
      out.push(q(`${fmt(hi)} − ${fmt(lo)} = □`, fmt(hi - lo)));
    }
  }
  return out;
}

/* ---------- 10. 分數↔小數 ---------- */
function genFracDecConvert(rng, mode, count, opts = {}) {
  const out = [];
  // 建立足夠大的互化題庫（分母 2,4,5,8,10,16,20,25,40,50,100,125,200,250,500,1000 等可盡除者）
  const pairs = [];
  const dens = [2, 4, 5, 8, 10, 16, 20, 25, 40, 50, 100, 125, 200, 250, 500, 1000];
  for (const d of dens) {
    for (let n = 1; n < d; n++) {
      // 只收有限小數（分母質因數僅 2、5）
      let x = d;
      while (x % 2 === 0) x /= 2;
      while (x % 5 === 0) x /= 5;
      if (x !== 1) continue;
      const g = (function (a, b) {
        a = Math.abs(a); b = Math.abs(b);
        while (b) { const t = a % b; a = b; b = t; }
        return a || 1;
      })(n, d);
      const nn = n / g;
      const dd = d / g;
      const val = n / d;
      // 小數字串：去掉多餘尾零，但保留至少一位小數
      let dec = val.toFixed(6).replace(/\.?0+$/, "");
      if (!dec.includes(".")) dec += ".0";
      // 標準化常見位
      if (Math.abs(val * 1000 - Math.round(val * 1000)) < 1e-9) {
        const r = Math.round(val * 1000) / 1000;
        dec = String(r);
        if (!dec.includes(".")) dec += ".0";
      }
      pairs.push([nn, dd, dec]);
    }
  }
  // 亦加入一位／兩位／三位「純小數 → 分數」
  for (let dp = 1; dp <= 3; dp++) {
    const base = 10 ** dp;
    for (let k = 1; k < base; k++) {
      const g = (function (a, b) {
        while (b) { const t = a % b; a = b; b = t; }
        return a || 1;
      })(k, base);
      const nn = k / g;
      const dd = base / g;
      let dec = (k / base).toFixed(dp);
      pairs.push([nn, dd, dec]);
    }
  }
  for (let i = 0; i < count; i++) {
    const [n, d, dec] = pick(rng, pairs);
    const simp = `${n}/${d}`;
    const dir =
      mode === "dec_to_frac"
        ? "d2f"
        : mode === "frac_to_dec"
          ? "f2d"
          : pick(rng, ["d2f", "f2d"]);
    if (dir === "d2f") {
      out.push(q(`${dec} = □（最簡分數）`, simp));
    } else {
      out.push(q(`${simp} = □（小數）`, dec));
    }
  }
  return out;
}

/* ---------- 11. 小數乘除（5N4 / 6N1） ---------- */
/** 去掉小數點後的有效數位（略去前導 0）：0.124→3、12.41→4、12→2 */
function decDigitCount(n) {
  let s = formatScaledPlain(n);
  s = s.replace(/^-/, "").replace(".", "").replace(/^0+/, "");
  return s.length || 1;
}

/** 小數位數目（整數為 0） */
function decPlacesOf(n) {
  const s = formatScaledPlain(n);
  const i = s.indexOf(".");
  return i < 0 ? 0 : s.length - i - 1;
}

/** 穩定小數／整數字串（避免科學記號） */
function formatScaledPlain(n) {
  if (!Number.isFinite(n)) return "0";
  if (Object.is(n, -0)) return "0";
  const sign = n < 0 ? "-" : "";
  let x = Math.abs(n);
  // 整數
  if (Math.abs(x - Math.round(x)) < 1e-12) return sign + String(Math.round(x));
  // 最多 6 位小數再去尾 0
  let s = x.toFixed(6).replace(/\.?0+$/, "");
  if (!s.includes(".")) return sign + s;
  return sign + s;
}

/** 以整數縮放表示：value = int / 10^places（int 為非負） */
function toDecParts(n) {
  const s = formatScaledPlain(n);
  const neg = s.startsWith("-");
  const t = neg ? s.slice(1) : s;
  if (!t.includes(".")) return { int: Number(t), places: 0, neg };
  const [a, b] = t.split(".");
  return { int: Number(a + b), places: b.length, neg };
}

function fromDecParts(intVal, places, neg = false) {
  if (places <= 0) return neg ? -intVal : intVal;
  const s = String(intVal).padStart(places + 1, "0");
  const whole = s.slice(0, s.length - places);
  const frac = s.slice(s.length - places);
  const plain = `${whole}.${frac}`.replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  const n = Number(plain);
  return neg ? -n : n;
}

function formatDecAnswer(n) {
  return formatScaledPlain(n);
}

/**
 * 5N4 一般乘法數位：小數須為一位或兩位；去掉小數點後須能置於 4N1
 * （≤三位數 × ≤兩位數）。排除如 0.124×3.9、12.4×3.42、12.41×2.6。
 */
function mulDecDigitsOk(a, b) {
  if (decPlacesOf(a) > 2 || decPlacesOf(b) > 2) return false;
  // 兩因數皆非整數時各自 ≤2 位小數已查；整數視作 0 位小數
  const da = decDigitCount(a);
  const db = decDigitCount(b);
  const hi = Math.max(da, db);
  const lo = Math.min(da, db);
  return hi <= 3 && lo <= 2;
}

/**
 * 6N1 一般除法：把除數調至整數後，被除數數位≤3、除數數位≤2。
 * 排除如 12.34÷5.6、12.3÷5.67、123÷0.4。
 */
function divDecDigitsOk(dividend, divisor) {
  if (!Number.isFinite(dividend) || !Number.isFinite(divisor) || divisor === 0) return false;
  const p = decPlacesOf(divisor);
  const scale = 10 ** p;
  // 整數縮放避免浮點
  const ds = toDecParts(divisor);
  const ns = toDecParts(dividend);
  // 兩邊同乘 10^p（p = divisor places）
  const newDivInt = ds.int; // 已是整數
  // dividend * 10^p = ns.int * 10^(p - ns.places) 或帶剩餘小數位
  let newDivPlaces = ns.places - p;
  let newDivDigitsInt = ns.int;
  if (newDivPlaces < 0) {
    newDivDigitsInt = ns.int * 10 ** (-newDivPlaces);
    newDivPlaces = 0;
  }
  // 組成字串計數位
  let divStr = String(newDivDigitsInt);
  if (newDivPlaces > 0) {
    divStr = divStr.padStart(newDivPlaces + 1, "0");
    const w = divStr.slice(0, divStr.length - newDivPlaces);
    const f = divStr.slice(divStr.length - newDivPlaces);
    divStr = `${w}.${f}`;
  }
  const dividendDigits = divStr.replace(".", "").replace(/^0+/, "").length || 1;
  const divisorDigits = String(newDivInt).replace(/^0+/, "").length || 1;
  return dividendDigits <= 3 && divisorDigits <= 2;
}

/** 產生一位或兩位小數（可選強制有小數點） */
function randDec1or2(rng, { minDigits = 1, maxDigits = 3, forcePlaces = null } = {}) {
  const places = forcePlaces != null ? forcePlaces : randInt(rng, 1, 2);
  const maxInt = 10 ** maxDigits - 1;
  const minInt = minDigits <= 1 ? 1 : 10 ** (minDigits - 1);
  let intVal = randInt(rng, minInt, maxInt);
  // 確保縮放後仍有正確小數位（避免 120 / 100 = 1.2 變成 1 位但 int 像 3 位）
  // 直接用 int/10^places
  while (intVal % 10 === 0 && intVal >= 10) intVal = Math.floor(intVal / 10);
  if (intVal === 0) intVal = randInt(rng, 1, 9);
  return fromDecParts(intVal, places, false);
}

function randIntDigits(rng, minDigits, maxDigits) {
  const d = randInt(rng, minDigits, maxDigits);
  const lo = d === 1 ? 1 : 10 ** (d - 1);
  const hi = 10 ** d - 1;
  return randInt(rng, lo, hi);
}

function genDecMulDiv(rng, mode, count, opts = {}) {
  const allowTrivial = !!opts.allowTrivial;
  const out = [];
  const powerK = [10, 100, 1000, 0.1, 0.01, 0.001];

  for (let i = 0; i < count; i++) {
    if (mode === "mul_powers") {
      const base = randInt(rng, 1, 999) / pick(rng, [1, 10, 100]);
      const b = Math.round(base * 100) / 100;
      const k = pick(rng, powerK);
      const bp = toDecParts(b);
      const kp = toDecParts(k);
      const prodInt = bp.int * kp.int;
      const prodPlaces = bp.places + kp.places;
      const ans = fromDecParts(prodInt, prodPlaces, false);
      out.push(q(`${formatDecAnswer(b)} × ${formatDecAnswer(k)} = □`, formatDecAnswer(ans)));
    } else if (mode === "div_powers") {
      const base = randInt(rng, 1, 999) / pick(rng, [1, 10, 100]);
      const b = Math.round(base * 100) / 100;
      const k = pick(rng, powerK);
      // b / k = b * (1/k)；用縮放
      const bp = toDecParts(b);
      const kp = toDecParts(k);
      // (bp.int / 10^bp.places) / (kp.int / 10^kp.places) = bp.int / kp.int * 10^(kp.places - bp.places)
      // 保證整除：選 b 使對 10 的冪整除通常可；否則用浮點再 format
      const ans = b / k;
      out.push(q(`${formatDecAnswer(b)} ÷ ${formatDecAnswer(k)} = □`, formatDecAnswer(ans)));
    } else if (mode === "mul_dec_int" || mode === "mul_dec_dec") {
      let a;
      let b;
      let guard = 0;
      do {
        if (mode === "mul_dec_int") {
          a = randDec1or2(rng, { minDigits: 1, maxDigits: 3 });
          b = allowTrivial ? randIntDigits(rng, 1, 2) : randIntDigits(rng, 1, 2);
          if (!allowTrivial && (b === 0 || b === 1)) b = randInt(rng, 2, 9);
          // 隨機交換：整數×小數 亦屬 5N4
          if (rng() < 0.45) {
            const t = a;
            a = b;
            b = t;
          }
        } else {
          a = randDec1or2(rng, { minDigits: 1, maxDigits: 3 });
          b = randDec1or2(rng, { minDigits: 1, maxDigits: 2 });
        }
        guard++;
      } while ((!mulDecDigitsOk(a, b) || (!allowTrivial && (a === 0 || b === 0 || a === 1 || b === 1))) && guard < 60);

      if (!mulDecDigitsOk(a, b)) {
        a = 1.2;
        b = mode === "mul_dec_int" ? 3 : 0.4;
      }
      const ap = toDecParts(a);
      const bp = toDecParts(b);
      const prod = fromDecParts(ap.int * bp.int, ap.places + bp.places, false);
      out.push(
        q(`${formatDecAnswer(a)} × ${formatDecAnswer(b)} = □`, formatDecAnswer(prod), {
          kind: mode,
        })
      );
    } else {
      // div_general — 四類混合；構造整除／有限小數商，並通過 6N1 數位檢查
      const kind = pick(rng, ["dec_div_int", "int_div_dec", "dec_div_dec", "int_div_int"]);
      let dividend;
      let divisor;
      let quot;
      let guard = 0;
      do {
        if (kind === "dec_div_int") {
          divisor = allowTrivial ? randInt(rng, 2, 20) : randInt(rng, 2, 20);
          quot = randDec1or2(rng, { minDigits: 1, maxDigits: 2, forcePlaces: randInt(rng, 1, 2) });
          const qp = toDecParts(quot);
          const dp = toDecParts(divisor);
          dividend = fromDecParts(qp.int * dp.int, qp.places + dp.places, false);
        } else if (kind === "int_div_dec") {
          divisor = randDec1or2(rng, { minDigits: 1, maxDigits: 2, forcePlaces: randInt(rng, 1, 2) });
          quot = allowTrivial ? randInt(rng, 1, 30) : randInt(rng, 2, 30);
          const qp = toDecParts(quot);
          const dp = toDecParts(divisor);
          dividend = fromDecParts(qp.int * dp.int, qp.places + dp.places, false);
          // 商為整數時被除數可能帶小數——OK
        } else if (kind === "dec_div_dec") {
          divisor = randDec1or2(rng, { minDigits: 1, maxDigits: 2 });
          quot = randDec1or2(rng, { minDigits: 1, maxDigits: 2 });
          const qp = toDecParts(quot);
          const dp = toDecParts(divisor);
          dividend = fromDecParts(qp.int * dp.int, qp.places + dp.places, false);
        } else {
          // 整數÷整數，商為有限小數（构造：dividend 整數 = qInt*divisor/10^places）
          let places = randInt(rng, 1, 2);
          const mod = 10 ** places;
          divisor = allowTrivial ? randInt(rng, 2, 25) : randInt(rng, 2, 25);
          let qInt = randInt(rng, 1, 80);
          let g2 = 0;
          // qInt % mod !== 0 → 商必含小數（非整數）
          while (((qInt * divisor) % mod !== 0 || qInt % mod === 0) && g2 < 50) {
            qInt = randInt(rng, 1, 80);
            divisor = allowTrivial ? randInt(rng, 2, 25) : randInt(rng, 2, 25);
            g2++;
          }
          if ((qInt * divisor) % mod !== 0 || qInt % mod === 0) {
            places = 1;
            divisor = 2;
            qInt = 5; // 1 ÷ 2 = 0.5
          }
          dividend = (qInt * divisor) / (10 ** places);
          quot = fromDecParts(qInt, places, false);
        }
        guard++;
      } while (
        (divisor === 0 ||
          !divDecDigitsOk(dividend, divisor) ||
          (!allowTrivial && (divisor === 1 || dividend === 0))) &&
        guard < 80
      );

      if (!divDecDigitsOk(dividend, divisor) || divisor === 0) {
        // 安全後備（已知合規）：4.8 ÷ 2 = 2.4
        dividend = 4.8;
        divisor = 2;
        quot = 2.4;
      } else {
        // 用精確縮放重算商（構造題應可十進位整除）
        const np = toDecParts(dividend);
        const dp = toDecParts(divisor);
        const scaleP = Math.max(np.places, dp.places);
        const nInt = np.int * 10 ** (scaleP - np.places);
        const dInt = dp.int * 10 ** (scaleP - dp.places);
        if (dInt !== 0 && nInt % dInt === 0) {
          quot = nInt / dInt;
        } else {
          // 擴分至分母只含 2／5 後仍不整除則回退安全題
          let ok = false;
          for (let extra = 0; extra <= 6; extra++) {
            const n2 = nInt * 10 ** extra;
            if (dInt !== 0 && n2 % dInt === 0) {
              quot = n2 / dInt / 10 ** extra;
              ok = true;
              break;
            }
          }
          if (!ok) {
            dividend = 4.8;
            divisor = 2;
            quot = 2.4;
          }
        }
      }
      out.push(
        q(`${formatDecAnswer(dividend)} ÷ ${formatDecAnswer(divisor)} = □`, formatDecAnswer(quot), {
          kind: "div_general",
        })
      );
    }
  }
  return out;
}

/* ---------- 12. 四則混合（無嵌套括號） ---------- */
function genMixedOps(rng, mode, count, opts = {}) {
  const allowTrivial = !!opts.allowTrivial;
  const out = [];
  for (let i = 0; i < count; i++) {
    if (mode === "mul_add_sub") {
      // 3N4 style: a×b+c or (a+b)×c — no nesting
      const form = pick(rng, ["muladd", "mulsub", "paren_mul", "paren_mul2"]);
      const a = randInt(rng, 1, 12);
      const b = randInt(rng, 1, 12);
      const c = randInt(rng, 1, 20);
      if (form === "muladd") {
        out.push(q(`${a} × ${b} + ${c} = □`, a * b + c));
      } else if (form === "mulsub") {
        const prod = a * b;
        const s = randInt(rng, 0, prod);
        out.push(q(`${a} × ${b} − ${s} = □`, prod - s));
      } else if (form === "paren_mul") {
        out.push(q(`(${a} + ${b}) × ${c} = □`, (a + b) * c));
      } else {
        const x = randInt(rng, 1, 9);
        const y = randInt(rng, 1, 9);
        out.push(q(`(${a} + ${b}) × (${x} + ${y}) = □`, (a + b) * (x + y)));
      }
    } else {
      // 4N5: include ÷ sometimes, ≤5 numbers
      const a = randInt(rng, 2, 20);
      const b = randInt(rng, 1, 10);
      const c = randInt(rng, 1, 10);
      const form = pick(rng, ["divadd", "muldiv", "paren", "five"]);
      if (form === "divadd") {
        const prod = b * randInt(rng, 2, 9);
        out.push(q(`${prod} ÷ ${b} + ${c} = □`, prod / b + c));
      } else if (form === "muldiv") {
        if (allowTrivial) {
          out.push(q(`${a} × ${b} ÷ ${b} = □`, a));
        } else {
          const d = randInt(rng, 2, 9);
          const m = randInt(rng, 2, 9);
          out.push(q(`${d * m} ÷ ${d} + ${c} = □`, m + c));
        }
      } else if (form === "paren") {
        out.push(q(`${a} × (${b} + ${c}) = □`, a * (b + c)));
      } else {
        const d = randInt(rng, 1, 5);
        const e = randInt(rng, 1, 5);
        out.push(q(`${a} + ${b} × ${c} − ${d} + ${e} = □`, a + b * c - d + e));
      }
    }
  }
  return out;
}

/* ---------- 13. 整數乘除直式（3N2 / 3N3 / 4N1 / 4N2） ---------- */
/** 答案：整除只寫商；有餘數寫「商⋯餘」（香港小學常見記法）。 */
function formatQuotRem(quot, rem) {
  if (rem === 0) return String(quot);
  return `${quot}⋯${rem}`;
}

function digitsOf(n) {
  return String(Math.abs(n | 0)).length;
}

function genIntMulDivVertical(rng, mode, count, opts = {}) {
  const allowTrivial = !!opts.allowTrivial;
  const out = [];
  for (let i = 0; i < count; i++) {
    if (mode === "mul_2by1" || mode === "mul_3by1" || mode === "mul_2by2" || mode === "mul_3by2") {
      let a;
      let b;
      if (mode === "mul_2by1") {
        a = randInt(rng, 10, 99);
        b = allowTrivial ? randInt(rng, 0, 9) : randInt(rng, 2, 9);
      } else if (mode === "mul_3by1") {
        a = randInt(rng, 100, 999);
        b = allowTrivial ? randInt(rng, 0, 9) : randInt(rng, 2, 9);
      } else if (mode === "mul_2by2") {
        a = randInt(rng, 10, 99);
        b = allowTrivial ? randInt(rng, 10, 99) : randInt(rng, 12, 99);
        if (!allowTrivial && (b % 10 === 0 || b % 10 === 1)) {
          b = randInt(rng, 12, 99);
          if (b % 10 < 2) b += 2;
        }
      } else {
        // mul_3by2 — 4N1
        a = randInt(rng, 100, 999);
        b = allowTrivial ? randInt(rng, 10, 99) : randInt(rng, 12, 99);
        if (!allowTrivial && b % 10 < 2) b = Math.min(99, b + 2);
      }
      if (!allowTrivial && (b === 0 || b === 1)) b = 2;
      const prod = a * b;
      out.push(
        q(`${a} × ${b} = □`, prod, {
          layout: "vertical_mul",
          top: a,
          bottom: b,
          product: prod,
        })
      );
    } else {
      // division modes — 3N3 / 4N2；課程含餘數；約七成帶餘、三成整除
      let divisor;
      let quot;
      let rem;
      let dividend;
      const wantRem = rng() < 0.7;
      if (mode === "div_2by1") {
        divisor = allowTrivial ? randInt(rng, 2, 9) : randInt(rng, 2, 9);
        quot = randInt(rng, 2, 9); // 商仍為一位為主，被除數兩位
        rem = wantRem ? randInt(rng, 1, divisor - 1) : 0;
        dividend = divisor * quot + rem;
        // 保證兩位數被除數
        let guard = 0;
        while ((dividend < 10 || dividend > 99) && guard < 40) {
          quot = randInt(rng, 2, Math.floor(99 / divisor));
          rem = wantRem ? randInt(rng, 1, divisor - 1) : 0;
          if (divisor * quot + rem > 99) rem = 0;
          dividend = divisor * quot + rem;
          guard++;
        }
        if (dividend < 10) {
          quot = randInt(rng, 5, 9);
          rem = 0;
          dividend = divisor * quot;
        }
      } else if (mode === "div_3by1") {
        divisor = allowTrivial ? randInt(rng, 2, 9) : randInt(rng, 2, 9);
        quot = randInt(rng, 12, 99);
        rem = wantRem ? randInt(rng, 1, divisor - 1) : 0;
        dividend = divisor * quot + rem;
        let guard = 0;
        while ((dividend < 100 || dividend > 999) && guard < 40) {
          quot = randInt(rng, 12, Math.min(99, Math.floor(999 / divisor)));
          rem = wantRem ? randInt(rng, 1, divisor - 1) : 0;
          if (divisor * quot + rem > 999) rem = 0;
          dividend = divisor * quot + rem;
          guard++;
        }
      } else if (mode === "div_2by2") {
        divisor = allowTrivial ? randInt(rng, 10, 40) : randInt(rng, 11, 40);
        quot = randInt(rng, 2, 8);
        rem = wantRem ? randInt(rng, 1, divisor - 1) : 0;
        dividend = divisor * quot + rem;
        let guard = 0;
        while ((dividend < 10 || dividend > 99 || digitsOf(dividend) !== 2) && guard < 50) {
          divisor = randInt(rng, 11, 45);
          quot = randInt(rng, 2, Math.max(2, Math.floor(99 / divisor)));
          rem = wantRem && divisor > 1 ? randInt(rng, 1, Math.min(divisor - 1, 99 - divisor * quot)) : 0;
          if (rem < 0) rem = 0;
          dividend = divisor * quot + rem;
          guard++;
        }
        if (digitsOf(dividend) !== 2 || digitsOf(divisor) !== 2) {
          divisor = 12;
          quot = 5;
          rem = wantRem ? 3 : 0;
          dividend = divisor * quot + rem;
        }
      } else {
        // div_3by2 — 4N2
        divisor = allowTrivial ? randInt(rng, 10, 50) : randInt(rng, 11, 50);
        quot = randInt(rng, 3, 40);
        rem = wantRem ? randInt(rng, 1, divisor - 1) : 0;
        dividend = divisor * quot + rem;
        let guard = 0;
        while ((dividend < 100 || dividend > 999) && guard < 50) {
          divisor = randInt(rng, 11, 50);
          const maxQ = Math.floor(999 / divisor);
          quot = randInt(rng, 3, Math.max(3, Math.min(80, maxQ)));
          rem = wantRem ? randInt(rng, 1, divisor - 1) : 0;
          if (divisor * quot + rem > 999) {
            rem = 0;
            quot = Math.min(quot, maxQ);
          }
          dividend = divisor * quot + rem;
          guard++;
        }
      }
      out.push(
        q(`${dividend} ÷ ${divisor} = □`, formatQuotRem(quot, rem), {
          layout: "vertical_div",
          dividend,
          divisor,
          quotient: quot,
          remainder: rem,
          remain: rem > 0,
        })
      );
    }
  }
  return out;
}

/* ---------- 14. 百分數互化（6N3 only；不含 6N4 應用題） ---------- */
/**
 * 課標示例範圍：百分數↔小數、百分數↔分數；分數答案須最簡
 *（如 2.5%=1/40）；可含 >100%（如 122%=1.22）。不含應用題／折扣／利息。
 */
function formatPctLabel(pctNum) {
  // pctNum 為百分數數值（25 → "25%"；2.5 → "2.5%"）
  let s = String(pctNum);
  if (s.includes(".")) s = s.replace(/\.?0+$/, "");
  return `${s}%`;
}

function formatPlainDec(n) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n - Math.round(n)) < 1e-12) return String(Math.round(n));
  let s = n.toFixed(6).replace(/\.?0+$/, "");
  if (s === "-0") s = "0";
  return s;
}

/** 預設題庫：整數％與一位小數％（課標有 2.5%、122% 等） */
function percentBank() {
  // 足夠題幹去重（≥48）；含課標示例風格（2.5%、122%）及常見整數％
  const ints = [];
  for (let i = 1; i <= 100; i++) ints.push(i);
  for (const x of [105, 110, 115, 120, 122, 125, 130, 140, 150, 160, 175, 180, 200, 250]) {
    ints.push(x);
  }
  const tenths = [];
  for (let t = 5; t <= 995; t += 10) {
    // 0.5, 1.5, … 但略過已是整數的 *.0 — 此步皆 x.5
    tenths.push(t / 10);
  }
  // 去重
  return [...new Set(ints.concat(tenths))];
}

/** pctNum（如 2.5）→ 最簡分數字串（相對 1，即 pct/100） */
function pctToFracAnswer(pctNum) {
  // 以千分之一百分比避免浮點：2.5 → 25/10
  const scaled = Math.round(pctNum * 10); // 一位小數足夠
  // pct/100 = (scaled/10)/100 = scaled/1000
  return formatFrac(scaled, 1000, { allowMixed: true });
}

function pctToDecAnswer(pctNum) {
  return formatPlainDec(pctNum / 100);
}

function genPercentConvert(rng, mode, count, opts = {}) {
  const out = [];
  const bank = percentBank();

  // 分數→百分數：只取能化成有限百分數（至多一位小數）者
  const fracPctPairs = [];
  for (const pct of bank) {
    const scaled = Math.round(pct * 10);
    const s = simplifyFrac(scaled, 1000);
    fracPctPairs.push({
      frac: formatFrac(s.num, s.den, { allowMixed: true }),
      num: s.num,
      den: s.den,
      pct,
      pctLabel: formatPctLabel(pct),
      dec: pctToDecAnswer(pct),
    });
  }

  for (let i = 0; i < count; i++) {
    const item = pick(rng, fracPctPairs);
    let dir = mode;
    if (mode === "mixed") {
      dir = pick(rng, ["pct_to_dec", "dec_to_pct", "pct_to_frac", "frac_to_pct"]);
    }
    if (dir === "pct_to_dec") {
      out.push(
        q(`${item.pctLabel} = □（小數）`, item.dec, { kind: "pct_to_dec", pct: item.pct })
      );
    } else if (dir === "dec_to_pct") {
      out.push(
        q(`${item.dec} = □（百分數）`, item.pctLabel, { kind: "dec_to_pct", pct: item.pct })
      );
    } else if (dir === "pct_to_frac") {
      out.push(
        q(`${item.pctLabel} = □（最簡分數）`, item.frac, {
          kind: "pct_to_frac",
          pct: item.pct,
        })
      );
    } else {
      // frac_to_pct — 題幹用最簡（可帶）分數；答案為百分數
      out.push(
        q(`${item.frac} = □（百分數）`, item.pctLabel, {
          kind: "frac_to_pct",
          pct: item.pct,
        })
      );
    }
  }
  return out;
}

const HANDLERS = {
  bonds_add_sub: genBondsAddSub,
  mult_div_table: genMultDiv,
  add_sub_within_100: genWithin100,
  add_sub_within_1000: genWithin1000,
  int_mul_div_vertical: genIntMulDivVertical,
  factors_primes: genFactorsPrimes,
  hcf_lcm: genHcfLcm,
  frac_same_den: genFracSameDen,
  frac_unlike: genFracUnlike,
  frac_mul_div: genFracMulDiv,
  dec_add_sub: genDecAddSub,
  frac_dec_convert: genFracDecConvert,
  dec_mul_div: genDecMulDiv,
  percent_convert: genPercentConvert,
  mixed_ops: genMixedOps,
};

/**
 * 低資訊量／恆等題判定（預設過濾）。
 * 模式（書面說明見 README「品質」）：
 * - n − n
 * - 與 0 的加減：n + 0、0 + n、n − 0，或多項中的 + 0
 * - 與 0／1 的乘除：n × 0、0 × n、n × 1、1 × n、n ÷ 1、0 ÷ n
 * - 形如 n × m ÷ m 的相消恆等
 * - 分解／補數導致加數為 0：n = n + □、n = 0 + □、n + □ = n、□ + 0 = n、0 + □ = n
 */
export function isTrivialPrompt(prompt) {
  const p = String(prompt).replace(/\s+/g, " ").trim();
  if (/(\d+)\s*−\s*\1\b/.test(p)) return true;
  // 整數 0／1 恆等；勿把 0.5、1.2 等小數誤判（後隨小數點則排除）
  if (/(?:^|[^0-9.])0\s*\+/.test(p) || /\+\s*0(?![0-9.])/.test(p)) return true;
  if (/−\s*0(?![0-9.])/.test(p)) return true;
  if (/(?:^|[^0-9.])0\s*×/.test(p) || /×\s*0(?![0-9.])/.test(p)) return true;
  if (/(?:^|[^0-9.])1\s*×/.test(p) || /×\s*1(?![0-9.])/.test(p)) return true;
  if (/÷\s*1(?![0-9.])/.test(p)) return true;
  if (/(?:^|[^0-9.])0\s*÷/.test(p)) return true;
  if (/×\s*(\d+)\s*÷\s*\1\b/.test(p)) return true;
  if (/(\d+)\s*=\s*\1\s*\+\s*□/.test(p)) return true;
  if (/\d+\s*=\s*0\s*\+\s*□/.test(p)) return true;
  if (/(\d+)\s*\+\s*□\s*=\s*\1\b/.test(p)) return true;
  if (/□\s*\+\s*0\s*=/.test(p)) return true;
  if (/^0\s*\+\s*□/.test(p)) return true;
  return false;
}

/**
 * @param {string} familyId
 * @param {string} modeId
 * @param {function(): number} rng
 * @param {number} count
 * @param {{ allowTrivial?: boolean }} [options] allowTrivial 預設 false（對應 UI「包含零／恆等題」關閉）
 */
export function generateQuestions(familyId, modeId, rng, count, options = {}) {
  const fn = HANDLERS[familyId];
  if (!fn) throw new Error("未知操練族: " + familyId);
  const allowTrivial = options.allowTrivial === true;
  const opts = { allowTrivial };
  const seen = new Set();
  const out = [];
  const maxAttempts = Math.max(count * 50, 200);

  for (let attempt = 0; attempt < maxAttempts && out.length < count; attempt++) {
    const batch = fn(rng, modeId, 1, opts);
    const item = batch[0];
    if (!item || item.prompt == null) continue;
    if (!allowTrivial && isTrivialPrompt(item.prompt)) continue;
    if (seen.has(item.prompt)) continue;
    seen.add(item.prompt);
    out.push(item);
  }

  // 若仍不足：放寬恆等過濾但仍保持題幹不重複
  if (out.length < count) {
    const relaxOpts = { allowTrivial: true };
    for (let attempt = 0; attempt < maxAttempts && out.length < count; attempt++) {
      const batch = fn(rng, modeId, 1, relaxOpts);
      const item = batch[0];
      if (!item || item.prompt == null) continue;
      if (seen.has(item.prompt)) continue;
      seen.add(item.prompt);
      out.push(item);
    }
  }

  return out;
}

export function getFamily(id) {
  return DRILL_CATALOG.find((f) => f.id === id);
}
