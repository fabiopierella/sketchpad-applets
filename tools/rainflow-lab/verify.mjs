/**
 * Check the Rainflow lab's counting against ASTM E1049's worked example, and
 * against facts any correct count must respect:
 *
 *   - no swing is lost: twice the full cycles' ranges plus the half-cycles'
 *     ranges add up to the record's whole path, turning point to turning point;
 *   - two sines at a whole-number ratio give one big cycle and f2/f1 - 1 small
 *     ones, and rainflow damage is never less than counting each sine apart.
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
const fresh = () => eval(html.slice(start, end) + `; ({
  cyclesToFailure, turningPoints, rainflow, damageOf, pathLength, twoSines, seaRecord, SEA, binOf, KS,
  lab, buildRecord, stepCount, counted, recordDamage, perSineDamage, sendRecords, resetDamage,
})`);
const P = fresh();

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};
const rel = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

/** Counts per range from a list of events, as { range: cycles }. */
function byRange(events) {
  const out = {};
  for (const e of events) out[2 * e.amp] = (out[2 * e.amp] || 0) + e.count;
  return out;
}

console.log('ASTM E1049, the rainflow example:');
{
  const seq = [-2, 1, -3, 5, -1, 3, -4, 4, -2];
  const pts = P.turningPoints(seq.map((_, i) => i), seq);
  pass(pts.length === 9, `all ${pts.length} values are turning points`);
  const got = byRange(P.rainflow(pts));
  const want = { 3: 0.5, 4: 1.5, 6: 0.5, 8: 1, 9: 0.5 };
  const same = Object.keys(want).length === Object.keys(got).length && Object.entries(want).every(([r, c]) => got[r] === c);
  pass(same, `ranges ${JSON.stringify(got)}, the standard's ${JSON.stringify(want)}`);
}

console.log('Turning points:');
{
  const t = [0, 1, 2, 3, 4, 5, 6], s = [0, 2, 2, 3, 1, 1, 4];
  const pts = P.turningPoints(t, s).map((p) => p.s);
  pass(JSON.stringify(pts) === JSON.stringify([0, 3, 1, 4]), `flat stretches are skipped: ${JSON.stringify(pts)}`);
}

console.log('Two sines:');
for (const [s1, s2, r] of [[60, 20, 6], [100, 10, 3], [40, 30, 7], [150, 80, 12], [10, 5, 2]]) {
  const { t, s } = P.twoSines(s1, s2, r);
  const pts = P.turningPoints(t, s);
  const ev = P.rainflow(pts);
  const full = ev.filter((e) => e.kind === 'cycle'), halves = ev.filter((e) => e.kind === 'half');
  const big = Math.max(...ev.map((e) => e.amp));
  let lo = Infinity; for (const v of s) lo = Math.min(lo, v);
  const total = ev.reduce((n, e) => n + e.count, 0);
  pass(rel(big, (s1 + s2 - lo) / 2, 1e-12) && halves.length === 2 && halves.every((h) => rel(h.amp, big, 1e-12)),
    `${s1}+${s2} MPa at x${r}: the residue is one big cycle, amplitude ${big.toFixed(2)} MPa, in two halves`);
  // The fast sine makes peaks of its own only where its slope can beat the
  // slow one's: sigma2 r > sigma1. Weaker than that, it only bends the big swing.
  if (s2 * r >= 1.5 * s1) pass(full.length === r - 1 && rel(total, r, 1e-12), `  and ${full.length} small full cycles, ${total} cycles in all`);
  else if (s2 * r < s1) pass(full.length === 0, `  and no small cycles: at sigma2 r = ${s2 * r} < sigma1 the fast sine makes no peaks of its own`);
  const Dr = P.damageOf(ev), Ds = 1 / P.cyclesToFailure(s1) + r / P.cyclesToFailure(s2);
  pass(Dr >= Ds, `  rainflow damage ${Dr.toExponential(3)} >= per sine ${Ds.toExponential(3)} (x${(Dr / Ds).toFixed(2)})`);
}

console.log('No swing is lost:');
for (const seed of [1, 7, 42, 1234]) {
  const { t, s } = P.seaRecord(20, seed);
  const pts = P.turningPoints(t, s);
  const ev = P.rainflow(pts);
  const counted = ev.reduce((L, e) => L + (e.kind === 'cycle' ? 4 : 2) * e.amp, 0);
  pass(pts.length === P.SEA.points && rel(counted, P.pathLength(pts), 1e-12),
    `sea ${seed}: ${pts.length} turning points, path ${P.pathLength(pts).toFixed(1)} MPa, counted ${counted.toFixed(1)} MPa`);
}

console.log('The sea:');
{
  const a = P.seaRecord(20, 7), b = P.seaRecord(20, 7), c = P.seaRecord(40, 7);
  pass(a.s.length === b.s.length && a.s.every((v, i) => v === b.s[i]), 'the same seed gives the same sea');
  pass(c.s.every((v, i) => rel(v, 2 * a.s[i], 1e-9) || Math.abs(v) < 1e-9), 'twice the stress level gives twice the stress, same shape');
  // The standard deviation of a long record at the set level.
  const long = P.seaRecord(20, 3);
  const n = long.s.length, mean = long.s.reduce((x, y) => x + y, 0) / n;
  const sd = Math.sqrt(long.s.reduce((x, y) => x + (y - mean) ** 2, 0) / n);
  pass(sd > 12 && sd < 28, `a record set to 20 MPa has a sample standard deviation of ${sd.toFixed(1)} MPa`);
}

console.log('Counting and sending, as the page does:');
{
  const lab = fresh();
  lab.buildRecord();
  let steps = 0;
  while (lab.stepCount()) steps++;
  pass(lab.counted() && steps === lab.lab.events.length, `the default record counts in ${steps} steps`);
  let binned = 0;
  for (const h of lab.lab.hist.values()) binned += h.D;
  pass(rel(binned, lab.recordDamage(), 1e-12), 'the histogram carries the whole damage of the record');
  const Dr = lab.recordDamage();
  lab.sendRecords(1000);
  pass(rel(lab.lab.D, 1000 * Dr, 1e-12) && !lab.lab.broken, `1000 records give D = ${lab.lab.D.toFixed(4)}`);
  lab.sendRecords(1e6);
  const want = Math.ceil((1 - 1000 * Dr) / Dr);
  pass(lab.lab.broken && lab.lab.broken.take === want && lab.lab.D === 1, `a million more break it after ${lab.lab.broken?.take} (by hand ${want})`);
  lab.sendRecords(1);
  pass(lab.lab.D === 1, 'nothing more is taken once broken');
  lab.resetDamage();
  pass(lab.lab.D === 0 && lab.lab.sent.size === 0 && !lab.lab.broken, 'Reset damage repairs it');
  pass(lab.KS.length === 19 && lab.KS[0] === 1 && lab.KS.at(-1) === 1e6, 'k steps through 1, 2, 5 x 10^j up to 10^6');
}

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
