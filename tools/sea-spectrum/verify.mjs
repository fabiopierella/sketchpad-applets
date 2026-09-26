/**
 * Check the Sea lab's physics against theory that does not come from it.
 *
 * The maths is extracted from the applet itself rather than duplicated here, so
 * this tests the code that actually ships. Run with:
 *
 *   npm test
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(HERE, 'index.html'), 'utf8');

// COUPLING: the slice is located by these two literal markers in index.html.
// Edit either of them there and this harness stops testing the physics, so the
// bounds are checked rather than assumed.
const START = 'const G = 9.81;';
const END = '/* --------------------------------------------------------------- state */';
const start = html.indexOf(START);
const end = html.indexOf(END);
if (start < 0 || end < 0 || end <= start) {
  console.error(
    `Could not find the physics in index.html.\n` +
      `  start marker ${start < 0 ? 'MISSING' : 'ok'}: ${START}\n` +
      `  end marker   ${end < 0 ? 'MISSING' : 'ok'}: ${END}\n` +
      `The markers moved or changed. Fix them here and in index.html together.`,
  );
  process.exit(1);
}
const P = eval(html.slice(start, end) + '; ({ spectrum, hsLimit, clampSeaState, createSea })');

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};

const G = 9.81;
const GAMMAS = [1, 2, 3.3, 5, 7];

/** Area under S(f) by the trapezium rule on a fine grid, independent of the tool's own normalisation. */
function area(hs, tp, gamma) {
  const df = 0.00005;
  let s = 0;
  for (let f = df; f < 6; f += df) s += P.spectrum(f, hs, tp, gamma) * df;
  return s;
}

// --- 1. Hs fixes the area, whatever gamma is --------------------------------
console.log('Spectrum area against Hs^2/16:');
let worstArea = 0;
for (const gamma of GAMMAS) {
  const errs = [];
  for (const [hs, tp] of [[1, 4], [4, 10], [8, 12], [12, 16]]) {
    const e = Math.abs(area(hs, tp, gamma) / (hs * hs / 16) - 1);
    errs.push(e);
    worstArea = Math.max(worstArea, e);
  }
  console.log(`  gamma ${gamma.toFixed(1)}: worst ${(Math.max(...errs) * 100).toFixed(3)}%`);
}
pass(worstArea < 0.01, 'area is Hs^2/16 within 1% for every gamma');

// The area test cannot catch a wrong shape that is normalised correctly, so
// compare the peak with DNV-RP-C205's closed-form approximation:
//   S_J(fp) = (1 - 0.287 ln gamma) * gamma * S_PM(fp), good to a few percent.
{
  let worst = 0;
  for (const gamma of GAMMAS) {
    const tp = 10, hs = 4, fp = 1 / tp;
    const pm = (5 / 16) * hs * hs * fp ** 4 * fp ** -5 * Math.exp(-1.25);
    const dnv = (1 - 0.287 * Math.log(gamma)) * gamma * pm;
    const e = Math.abs(P.spectrum(fp, hs, tp, gamma) / dnv - 1);
    worst = Math.max(worst, e);
    console.log(`  gamma ${gamma.toFixed(1)}: peak ${P.spectrum(fp, hs, tp, gamma).toFixed(3)} vs DNV approximation ${dnv.toFixed(3)} (${(e * 100).toFixed(2)}%)`);
  }
  pass(worst < 0.03, 'peak height agrees with the DNV approximation within 3%');
}

// --- 2. The peak sits at 1/Tp, and gamma = 1 is Pierson-Moskowitz ------------
{
  let worstPeak = 0;
  for (const gamma of GAMMAS) {
    for (const tp of [4, 7, 10, 16]) {
      let best = 0, fBest = 0;
      for (let f = 0.01; f < 1; f += 0.00002) {
        const s = P.spectrum(f, 4, tp, gamma);
        if (s > best) { best = s; fBest = f; }
      }
      worstPeak = Math.max(worstPeak, Math.abs(fBest * tp - 1));
    }
  }
  console.log(`\nPeak position: worst |f_peak * Tp - 1| = ${(worstPeak * 100).toFixed(3)}%`);
  // gamma = 1 has a flat maximum; the analytic PM peak is exactly at fp.
  pass(worstPeak < 0.005, 'the peak lies at f = 1/Tp');

  // Pierson-Moskowitz in its Hs-Tp form, written out independently.
  const pm = (f, hs, tp) => {
    const fp = 1 / tp;
    return (5 / 16) * hs * hs * fp ** 4 * f ** -5 * Math.exp(-1.25 * (fp / f) ** 4);
  };
  let worstPm = 0;
  for (let f = 0.03; f < 1; f += 0.005) {
    const ref = pm(f, 5, 9);
    if (ref > 1e-6) worstPm = Math.max(worstPm, Math.abs(P.spectrum(f, 5, 9, 1) / ref - 1));
  }
  console.log(`  gamma = 1 vs Pierson-Moskowitz: worst ${(worstPm * 100).toFixed(4)}%`);
  pass(worstPm < 0.001, 'gamma = 1 is the Pierson-Moskowitz spectrum');
}

// --- 3. The sea it draws carries the energy the spectrum says ----------------
{
  const hs = 4, tp = 10, gamma = 3.3;
  let sum = 0, sum2 = 0, n = 0;
  for (let seed = 1; seed <= 4; seed++) {
    const sea = P.createSea(seed);
    sea.setState(hs, tp, gamma);
    for (let i = 0; i < 3 * 3600 * 4; i++) {        // three hours at 4 samples a second
      sea.advance(0.25);
      const e = sea.eta(0);
      sum += e; sum2 += e * e; n++;
    }
  }
  const variance = sum2 / n - (sum / n) ** 2;
  const err = variance / (hs * hs / 16) - 1;
  console.log(`\nVariance of eta at the Probe over 4 x 3 h: ${variance.toFixed(4)} m^2 vs Hs^2/16 = ${(hs * hs / 16).toFixed(4)} (${(err * 100).toFixed(2)}%)`);
  pass(Math.abs(err) < 0.05, 'the sea carries Hs^2/16 within 5%');
}

// --- 4. The Sea morphs; New sea re-rolls -----------------------------------
{
  const sea = P.createSea(7);
  sea.setState(4, 10, 3.3);
  const before = Float64Array.from(sea.phases);
  const amps = Float64Array.from(sea.amplitudes);
  sea.setState(6, 12, 1);
  sea.setState(4, 10, 7);
  const same = sea.phases.every((p, i) => p === before[i]);
  pass(same, 'changing Hs, Tp or gamma leaves every phase unchanged');

  sea.setState(4, 10, 3.3);
  sea.newSea();
  const changed = sea.phases.filter((p, i) => p !== before[i]).length;
  const ampsSame = sea.amplitudes.every((a, i) => Math.abs(a - amps[i]) < 1e-15);
  pass(changed === before.length && ampsSame, 'New sea draws fresh phases and leaves the spectrum alone');
}

// --- 5. The steepness limit ------------------------------------------------
{
  console.log('\nHighest Hs the handle allows:');
  let ok = true;
  for (const tp of [4, 6, 8, 10, 12, 16]) {
    const { hs } = P.clampSeaState(100, tp);
    const lambda = (G * tp * tp) / (2 * Math.PI);
    console.log(`  Tp ${String(tp).padStart(2)} s: Hs ${hs.toFixed(2)} m  (Hs/lambda_p = 1/${(lambda / hs).toFixed(1)})`);
    if (hs / lambda > 1 / 15 + 1e-12 || hs > 12) ok = false;
  }
  pass(ok, 'Hs never exceeds 1/15 of the peak wavelength, nor 12 m');
  const low = P.clampSeaState(0, 2);
  pass(low.hs === 0.5 && low.tp === 4, 'Hs and Tp stop at the bottom of their ranges');
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} CHECK(S) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
