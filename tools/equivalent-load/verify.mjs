/**
 * Check the Equivalent-load lab: that sigma_eq really does the lifetime's
 * damage in 10^7 cycles, that the judgement of a Try is honest, that every
 * lifetime lands its damage between 0.3 and 0.9, and that the rainflow count
 * matches ASTM E1049's worked example.
 *
 * The physics and the state are sliced out of index.html, so this tests the
 * code that ships. Run with:
 *
 *   npm test
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(HERE, 'index.html'), 'utf8');

// COUPLING: these markers in index.html.
const START = '/* ---------------------------------------------------------------- physics';
const END = '/* ------------------------------------------------------------ rendering */';
const start = html.indexOf(START), end = html.indexOf(END);
if (start < 0 || end < 0 || end < start) {
  console.error('Could not find the physics and state sections in index.html. Fix the markers here and there together.');
  process.exit(1);
}
const P = eval(html.slice(start, end) + `; ({
  N_EQ, TOLERANCE, cyclesToFailure, turningPoints, rainflow, damageAt, recordMoment,
  lab, buildLifetime, judge, tryAt, lifetimeStats,
})`);

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};
const rel = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

console.log('ASTM E1049, the rainflow example:');
{
  const seq = [-2, 1, -3, 5, -1, 3, -4, 4, -2];
  const got = {};
  for (const e of P.rainflow(P.turningPoints(seq.map((_, i) => i), seq))) got[2 * e.amp] = (got[2 * e.amp] || 0) + e.count;
  const want = { 3: 0.5, 4: 1.5, 6: 0.5, 8: 1, 9: 0.5 };
  pass(JSON.stringify(got) === JSON.stringify(want), `ranges ${JSON.stringify(got)}`);
}

console.log('sigma_eq does the same damage:');
{
  P.buildLifetime();
  const L = P.lab;
  const direct = L.events.reduce((D, e) => D + L.k * e.count / P.cyclesToFailure(e.amp), 0);
  pass(rel(L.D, direct, 1e-12), `the lifetime's damage, ${L.D.toFixed(4)}, is k times the record's`);
  pass(rel(P.damageAt(L.sigmaEq), L.D, 1e-12), `10^7 cycles at sigma_eq = ${L.sigmaEq.toFixed(3)} MPa give D = ${P.damageAt(L.sigmaEq).toFixed(4)}`);
  // Found by bisection, with no knowledge of the formula, as a student would.
  let lo = 1, hi = 200;
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (P.damageAt(m) < L.D) lo = m; else hi = m; }
  pass(rel(lo, L.sigmaEq, 1e-9), `bisection on the damage alone finds ${lo.toFixed(3)} MPa`);
  const st = P.lifetimeStats();
  pass(st.mean < st.rms && st.rms < st.own && st.own < st.big,
    `mean ${st.mean.toFixed(1)} < rms ${st.rms.toFixed(1)} < own-count equivalent ${st.own.toFixed(1)} < largest ${st.big.toFixed(1)} MPa`);
  pass(rel(st.own * (st.n / P.N_EQ) ** (1 / 3), L.sigmaEq, 1e-12), 'sigma_eq at 10^7 is the own-count equivalent scaled by (n / 10^7)^(1/3)');
}

console.log('Judging a Try:');
{
  const L = P.lab, s = L.sigmaEq;
  pass(P.judge(P.damageAt(s)) === 'found', 'sigma_eq itself is found');
  const edge = (1 + P.TOLERANCE) ** (1 / 3);
  pass(P.judge(P.damageAt(s * edge * 0.999)) === 'found' && P.judge(P.damageAt(s * edge * 1.001)) === 'high',
    `the window ends at +${((edge - 1) * 100).toFixed(2)} % on sigma`);
  pass(P.judge(P.damageAt(s / edge * 1.001)) === 'found' && P.judge(P.damageAt(s / edge / 1.001)) === 'low',
    'and at the same distance below');
  let mono = true, prev = 'low';
  const order = { low: 0, found: 1, high: 2 };
  for (let g = 1; g <= 150; g += 0.1) { const v = P.judge(P.damageAt(g)); if (order[v] < order[prev]) mono = false; prev = v; }
  pass(mono, 'low, then found, then high, as sigma rises: never back');
  L.tries = []; L.found = null;
  P.tryAt(s * 0.8); P.tryAt(s * 1.2); P.tryAt(s * 1.001);
  pass(L.tries.map((t) => t.verdict).join() === 'low,high,found' && L.found.tries === 3, 'three tries: low, high, found in 3');
}

console.log('Every lifetime lands its damage in 0.3 to 0.9:');
{
  let ok = true, lo = Infinity, hi = 0, n = 0;
  for (const sd of [5, 10, 20, 30, 40]) {
    for (let seed = 1; seed <= 12; seed++) {
      P.lab.sd = sd; P.lab.seed = seed * 977;
      P.buildLifetime();
      lo = Math.min(lo, P.lab.D); hi = Math.max(hi, P.lab.D); n++;
      if (!(P.lab.D >= 0.3 && P.lab.D <= 0.9) || !Number.isInteger(P.lab.k)) ok = false;
    }
  }
  pass(ok, `${n} lifetimes, D from ${lo.toFixed(3)} to ${hi.toFixed(3)}`);
}

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
