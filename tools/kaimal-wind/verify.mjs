/**
 * Check the Wind lab's physics against theory that does not come from it.
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
const START = 'const HUB = 150;';
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
const P = eval(
  html.slice(start, end) +
    '; ({ kaimal, coherence, tiNTM, createField, probeRecord, estimateSpectrum, NX, NZ, DX, DZ, LX, HUB_ROW, L_IEC })',
);

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};
const pct = (x) => (x * 100).toFixed(2) + '%';

// --- 1. The Kaimal spectrum itself -------------------------------------------
console.log('Kaimal spectrum:');
{
  // Area by the trapezium rule in log f, independent of any closed form.
  let worst = 0;
  for (const [U, sigma, L] of [[4, 1, 50], [10, 1.8, 340], [25, 7, 1000]]) {
    let s = 0;
    const a = Math.log(1e-8), b = Math.log(1e5), n = 200000, h = (b - a) / n;
    for (let i = 0; i <= n; i++) {
      const f = Math.exp(a + i * h);
      s += (i === 0 || i === n ? 0.5 : 1) * P.kaimal(f, U, sigma, L) * f * h;
    }
    // The f^(-5/3) tail beyond 1e5 Hz is not negligible at this precision: add it.
    const tail = (sigma * sigma * 4 * L / U) * (6 * L / U) ** (-5 / 3) * 1.5 * 1e5 ** (-2 / 3);
    worst = Math.max(worst, Math.abs((s + tail) / (sigma * sigma) - 1));
  }
  console.log(`  worst area error ${pct(worst)}`);
  pass(worst < 0.002, 'integrates to sigma^2');

  // f S peaks at 6fL/U = 3/2, i.e. f = U / (4L).
  const U = 10, L = 340, fp = U / (4 * L);
  const fs = (f) => f * P.kaimal(f, U, 1, L);
  pass(fs(fp) > fs(fp * 1.01) && fs(fp) > fs(fp / 1.01), `f S peaks at U/(4L) = ${fp.toFixed(5)} Hz`);

  // Inertial range: local log-log slope of S tends to -5/3.
  const slope = Math.log(P.kaimal(20, U, 1, L) / P.kaimal(10, U, 1, L)) / Math.log(2);
  pass(Math.abs(slope + 5 / 3) < 0.002, `high-frequency slope ${slope.toFixed(4)} is -5/3`);

  // IEC normal turbulence: class A at 15 m/s is 0.16 (0.75 + 5.6/15).
  pass(Math.abs(P.tiNTM(15, 0.16) - 0.179733) < 1e-5, 'IEC NTM turbulence intensity');
}

// --- 2. The coherence formula -------------------------------------------------
console.log('Coherence formula:');
{
  const c = P.coherence(30, 0.05, 10, 340.2, 12);
  const byHand = Math.exp(-12 * Math.sqrt((0.05 * 30 / 10) ** 2 + (0.12 * 30 / 340.2) ** 2));
  pass(Math.abs(c - byHand) < 1e-12 && P.coherence(0, 1, 10, 340, 12) === 1, 'matches IEC 61400-1, and is 1 at zero separation');
  pass(P.coherence(5, 0.1, 10, 340, Infinity) === 0 && P.coherence(50, 0.1, 10, 340, 0) === 1, 'independent is 0, a = 0 is 1');
}

// --- 3. The generated field ---------------------------------------------------
// A DFT at chosen bins only, written here, so the field is not judged by its own FFT.
function dftBin(row, k) {
  let re = 0, im = 0;
  for (let n = 0; n < row.length; n++) {
    const th = (-2 * Math.PI * k * n) / row.length;
    re += row[n] * Math.cos(th); im += row[n] * Math.sin(th);
  }
  return [re, im];
}
const row = (field, j) => field.phi.subarray(j * P.NX, (j + 1) * P.NX);

console.log('Generated field (averaged over 16 fields):');
{
  const L = P.L_IEC, a = 12, SEEDS = 16;
  // Resolved variance: the discrete sum the field is built from, which is
  // sigma^2 less what lies below the longest wave the 32.8 km field can hold.
  const dk = 1 / P.LX;
  let target = 0;
  for (let k = 1; k < P.NX / 2; k++) target += 4 * L / (1 + 6 * k * dk * L) ** (5 / 3) * dk;
  const closed = (1 + 6 * L / P.LX) ** (-2 / 3);
  console.log(`  resolved variance ${target.toFixed(4)} of sigma^2 (closed form above 1/LX: ${closed.toFixed(4)})`);

  let v = 0, count = 0;
  const bands = [[4, 30], [30, 150]], ks = [];
  for (const [k1, k2] of bands) ks.push({ k1, k2, pAA: 0, pBB: 0, pAB: 0 });
  const r = 6 * P.DZ, j0 = P.HUB_ROW - 3, j1 = j0 + 6;
  for (let s = 1; s <= SEEDS; s++) {
    const f = P.createField(1000 + s);
    f.shape(L, a);
    for (let j = 0; j < P.NZ; j += 8) {
      const x = row(f, j);
      let m = 0, q = 0;
      for (let i = 0; i < x.length; i++) { m += x[i]; q += x[i] * x[i]; }
      v += q / x.length - (m / x.length) ** 2; count++;
    }
    for (const b of ks) {
      for (let k = b.k1; k < b.k2; k += 3) {
        const [ar, ai] = dftBin(row(f, j0), k), [br, bi] = dftBin(row(f, j1), k);
        b.pAA += ar * ar + ai * ai; b.pBB += br * br + bi * bi; b.pAB += ar * br + ai * bi;
      }
    }
  }
  v /= count;
  console.log(`  mean row variance ${v.toFixed(4)}, ${pct(v / target - 1)} off`);
  pass(Math.abs(v / target - 1) < 0.05, 'each height has the resolved Kaimal variance within 5%');

  for (const b of ks) {
    const est = b.pAB / Math.sqrt(b.pAA * b.pBB);
    // Expected: the IEC coherence at the band's centre wavenumber, averaged
    // over the same bins the estimate used, weighted by their power.
    let wsum = 0, csum = 0;
    for (let k = b.k1; k < b.k2; k += 3) {
      const kappa = k * dk, w = 4 * L / (1 + 6 * kappa * L) ** (5 / 3);
      wsum += w; csum += w * P.coherence(r, kappa, 1, L, a);   // f/U = kappa with U = 1
    }
    const want = csum / wsum;
    console.log(`  r = ${r.toFixed(1)} m, wavenumber bins ${b.k1}-${b.k2}: estimated ${est.toFixed(3)}, IEC ${want.toFixed(3)}`);
    pass(Math.abs(est - want) < 0.05, `coherence between two heights matches IEC (bins ${b.k1}-${b.k2})`);
  }
}

{
  const f = P.createField(7);
  f.shape(340, 0);
  const a = row(f, 0), b = row(f, P.NZ - 1);
  let d = 0;
  for (let i = 0; i < a.length; i++) d = Math.max(d, Math.abs(a[i] - b[i]));
  pass(d < 1e-9, 'a = 0: the top and bottom rows are identical');

  f.shape(340, Infinity);
  let sab = 0, saa = 0, sbb = 0;
  const x = row(f, 20), y = row(f, 21);
  for (let i = 0; i < x.length; i++) { sab += x[i] * y[i]; saa += x[i] * x[i]; sbb += y[i] * y[i]; }
  const corr = sab / Math.sqrt(saa * sbb);
  console.log(`  independent: correlation of neighbouring rows ${corr.toFixed(3)}`);
  pass(Math.abs(corr) < 0.25, 'independent: neighbouring rows are uncorrelated');
}

// --- 4. Morphing ---------------------------------------------------------------
console.log('Morphing:');
{
  const f = P.createField(3);
  f.shape(340, 12);
  const before = Float32Array.from(f.phi);
  f.shape(80, 40);
  f.shape(340, 12);
  let d = 0;
  for (let i = 0; i < before.length; i++) d = Math.max(d, Math.abs(before[i] - f.phi[i]));
  pass(d < 1e-6, 'changing L and a and changing them back returns the same field');
  f.newField(4);
  f.shape(340, 12);
  let same = 0;
  for (let i = 0; i < before.length; i += 97) if (Math.abs(before[i] - f.phi[i]) < 1e-6) same++;
  pass(same < 5, 'New field draws different random numbers');

  // The chain starts at hub height, so the Probe's row does not depend on a.
  f.shape(340, 12);
  const hub12 = Float32Array.from(row(f, P.HUB_ROW));
  f.shape(340, 0);
  const hub0 = row(f, P.HUB_ROW);
  let dh = 0;
  for (let i = 0; i < hub0.length; i++) dh = Math.max(dh, Math.abs(hub0[i] - hub12[i]));
  pass(dh < 1e-6, 'changing the coherence leaves the hub row, and so the Probe record, unchanged');
}

// --- 5. The Probe and the estimate --------------------------------------------
console.log('Probe record and spectrum estimate:');
{
  const f = P.createField(11);
  f.shape(340, 12);
  const U = 10, sigma = 1.8, N = 8192, T = 600;
  const rec = P.probeRecord(f, 1234, U, sigma, T, N, new Float64Array(N));
  // The newest sample is the air at the Probe now; one 30 s earlier is 300 m downwind.
  const i30 = N - 1 - Math.round(30 / (T / N));
  const tau = (N - 1 - i30) * (T / N);
  pass(Math.abs(rec[N - 1] - (U + sigma * f.at(P.HUB_ROW, -1234))) < 1e-9 &&
       Math.abs(rec[i30] - (U + sigma * f.at(P.HUB_ROW, -1234 + U * tau))) < 1e-9,
       'the record is the hub row downwind of the Rotor, read back in time');

  // Averaged over many records, the band-averaged estimate follows Kaimal.
  const want = [[0.01, 0.03], [0.1, 0.3], [0.5, 1.5]].map(([lo, hi]) => ({ lo, hi, est: 0, n: 0, model: 0 }));
  for (let s = 0; s < 24; s++) {
    const g = P.createField(200 + s);
    g.shape(340, 12);
    for (let off = 0; off < 3; off++) {
      P.probeRecord(g, off * 9000, U, sigma, T, N, rec);
      for (const p of P.estimateSpectrum(rec, T / N, 10)) {
        for (const b of want) if (p.f >= b.lo && p.f < b.hi) { b.est += p.S / P.kaimal(p.f, U, sigma, 340); b.n++; }
      }
    }
  }
  for (const b of want) {
    const r = b.est / b.n;
    console.log(`  ${b.lo}-${b.hi} Hz: estimate / Kaimal = ${r.toFixed(3)}`);
    pass(Math.abs(r - 1) < 0.1, `estimate agrees with Kaimal within 10% between ${b.lo} and ${b.hi} Hz`);
  }
}

// --- 6. Speed -------------------------------------------------------------------
{
  const f = P.createField(5);
  const t0 = performance.now();
  for (let i = 0; i < 5; i++) f.shape(100 + i * 50, 12);
  const ms = (performance.now() - t0) / 5;
  console.log(`Reshaping the field takes ${ms.toFixed(0)} ms in Node.`);
  pass(ms < 150, 'reshaping is fast enough to follow a dragged slider');
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
