/** Shared number/fraction helpers for EDB-aligned generators. */

export function gcd(a, b) {
  a = Math.abs(a | 0);
  b = Math.abs(b | 0);
  while (b) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a || 1;
}

export function lcm(a, b) {
  return Math.abs(a * b) / gcd(a, b);
}

export function factorsOf(n) {
  n = Math.abs(n | 0);
  if (n < 1) return [];
  const small = [];
  const large = [];
  for (let i = 1; i * i <= n; i++) {
    if (n % i === 0) {
      small.push(i);
      if (i * i !== n) large.push(n / i);
    }
  }
  return small.concat(large.reverse());
}

export function isPrime(n) {
  if (n < 2) return false;
  if (n === 2 || n === 3) return true;
  if (n % 2 === 0 || n % 3 === 0) return false;
  for (let i = 5; i * i <= n; i += 6) {
    if (n % i === 0 || n % (i + 2) === 0) return false;
  }
  return true;
}

/** Simplify {num, den} to 最簡 (den > 0). */
export function simplifyFrac(num, den) {
  if (den < 0) {
    num = -num;
    den = -den;
  }
  if (den === 0) return { num, den: 1 };
  const g = gcd(num, den);
  return { num: num / g, den: den / g };
}

/** Format as 最簡假分數 or 最簡帶分數 when |num|>=den. Prefer mixed when allowMixed. */
export function formatFrac(num, den, { allowMixed = true } = {}) {
  const s = simplifyFrac(num, den);
  if (s.den === 1) return String(s.num);
  const neg = s.num < 0;
  const n = Math.abs(s.num);
  if (allowMixed && n > s.den) {
    const whole = Math.floor(n / s.den);
    const rem = n % s.den;
    const core = rem === 0 ? String(whole) : `${whole} ${rem}/${s.den}`;
    return neg ? `−${core}` : core;
  }
  if (allowMixed && n === s.den) return neg ? "−1" : "1";
  return `${neg ? "−" : ""}${n}/${s.den}`;
}

/** True if a − b needs at least one decimal digit borrow. */
export function subtractionNeedsBorrow(a, b) {
  while (a > 0 || b > 0) {
    if (a % 10 < b % 10) return true;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return false;
}

export function additionNeedsCarry(a, b) {
  while (a > 0 || b > 0) {
    if (a % 10 + b % 10 >= 10) return true;
    a = Math.floor(a / 10);
    b = Math.floor(b / 10);
  }
  return false;
}
