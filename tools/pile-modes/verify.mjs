/**
 * Check the pile lab's physics against theory that does not come from it.
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
const START = 'const NEL = 20;';
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
    '; ({ solveModes, createSim, shapeAt, NDOF, TIME_SCALE, SIM_DT, TAP_IMPULSE, HAND_STIFFNESS, ZETA1 })',
);

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};

const dot = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);
/** Modal coordinate q_r = phi_r^T M u, the projection that mass-normalised modes allow. */
const modal = (M, phi, u) => {
  let s = 0;
  for (let i = 0; i < u.length; i++) for (let j = 0; j < u.length; j++) s += phi[i] * M[i][j] * u[j];
  return s;
};

// --- 1. Natural frequencies against the closed form ------------------------
// A clamped-free beam with a tip mass mu (as a fraction of the beam's mass):
//   1 + cos b cosh b + mu b (cos b sinh b - sin b cosh b) = 0,  omega = b^2
// in units L = EI = rhoA = 1. Solved here by scan and bisection.
function exactOmegas(mu, count) {
  const f = (b) =>
    (1 + Math.cos(b) * Math.cosh(b) + mu * b * (Math.cos(b) * Math.sinh(b) - Math.sin(b) * Math.cosh(b))) /
    Math.cosh(b);
  const roots = [];
  let a = 0.05, fa = f(a);
  for (let b = a + 0.005; b < 20 && roots.length < count; b += 0.005) {
    const fb = f(b);
    if (fa * fb < 0) {
      let lo = b - 0.005, hi = b;
      for (let k = 0; k < 80; k++) {
        const m = 0.5 * (lo + hi);
        if (f(lo) * f(m) <= 0) hi = m; else lo = m;
      }
      roots.push(0.5 * (lo + hi));
    }
    fa = fb;
  }
  return roots.map((b) => b * b);
}

console.log('Natural frequencies vs closed-form cantilever with a tip mass:');
let worstFreq = 0;
for (const mu of [0, 0.5, 1, 2, 3]) {
  const fe = P.solveModes(mu, 3).omega;
  const ex = exactOmegas(mu, 3);
  const errs = fe.map((w, r) => Math.abs(w - ex[r]) / ex[r]);
  worstFreq = Math.max(worstFreq, ...errs);
  console.log(
    `  nacelle ${mu.toFixed(1)}:  ` +
      fe.map((w, r) => `w${r + 1} ${w.toFixed(3)} (exact ${ex[r].toFixed(3)})`).join('  '),
  );
}
pass(worstFreq < 0.002, `first three modes within 0.2% across the nacelle range (worst ${(worstFreq * 100).toFixed(4)}%)`);

// --- 2. The time integration: period and damping of mode 1 ----------------
// Tap the top, follow mode 1's coordinate, and compare its period and decay
// with omega_1 and the damping the tool claims.
{
  const mu = 1;
  const { omega, phi, M } = P.solveModes(mu, 2);
  const sim = P.createSim(mu);
  sim.tap(1, P.TAP_IMPULSE, 1);
  const q = [];
  for (let i = 0; i < 4000; i++) { sim.step(); q.push(modal(M, phi[0], sim.u)); }
  // Upward zero crossings, interpolated.
  const ups = [];
  for (let i = 1; i < q.length; i++) {
    if (q[i - 1] < 0 && q[i] >= 0) ups.push(i - 1 + q[i - 1] / (q[i - 1] - q[i]));
  }
  const periodSim = ((ups[ups.length - 1] - ups[0]) / (ups.length - 1)) * P.SIM_DT;
  const expected = (2 * Math.PI) / (omega[0] * Math.sqrt(1 - P.ZETA1 ** 2));
  const perr = Math.abs(periodSim - expected) / expected;
  console.log(`\nMode 1 after a tap (nacelle 1): period ${periodSim.toFixed(4)} vs ${expected.toFixed(4)}  (${(perr * 100).toFixed(3)}%)`);
  pass(perr < 0.005, 'Newmark reproduces the mode-1 period within 0.5%');

  // Peaks between successive crossings, then the logarithmic decrement.
  const peaks = [];
  for (let c = 0; c + 1 < ups.length; c++) {
    let m = 0;
    for (let i = Math.ceil(ups[c]); i < ups[c + 1]; i++) m = Math.max(m, q[i]);
    peaks.push(m);
  }
  const n = peaks.length - 1;
  const delta = Math.log(peaks[0] / peaks[n]) / n;
  const zeta = delta / Math.sqrt(4 * Math.PI ** 2 + delta ** 2);
  console.log(`  damping from the decay: zeta_1 = ${(zeta * 100).toFixed(2)}%  (set ${(P.ZETA1 * 100).toFixed(1)}%)`);
  pass(Math.abs(zeta - P.ZETA1) / P.ZETA1 < 0.05, 'mode 1 decays at the damping the tool sets');

  const screenHz = (omega[0] / (2 * Math.PI)) * P.TIME_SCALE;
  console.log(`  on screen, mode 1 swings at ${screenHz.toFixed(3)} Hz`);
  pass(Math.abs(screenHz - 1) < 1e-9, 'time is scaled so the default pile swings at 1 Hz');
}

// --- 3. The lab's central claim: a tap at a node misses that mode ---------
{
  const mu = 1;
  const { phi, M } = P.solveModes(mu, 2);
  const at = (x) => dot(P.shapeAt(x), phi[1]);
  // The interior zero of mode 2, found on the interpolated shape.
  let lo = 0.3, hi = 0.999;
  if (at(lo) * at(hi) > 0) throw new Error('mode 2 has no node between 0.3 and 1 - check the solver');
  for (let k = 0; k < 60; k++) {
    const m = 0.5 * (lo + hi);
    if (at(lo) * at(m) <= 0) hi = m; else lo = m;
  }
  const node = 0.5 * (lo + hi);

  const peakQ2 = (x) => {
    const sim = P.createSim(mu);
    sim.tap(x, P.TAP_IMPULSE, 1);
    let peak = 0;
    for (let i = 0; i < 1500; i++) { sim.step(); peak = Math.max(peak, Math.abs(modal(M, phi[1], sim.u))); }
    return peak;
  };
  const atNode = peakQ2(node);
  const atMid = peakQ2(0.45);
  console.log(`\nMode 2 node with nacelle 1 at ${node.toFixed(4)} L.`);
  console.log(`  peak mode-2 response: tap at the node ${atNode.toExponential(2)}, tap at 0.45 L ${atMid.toExponential(2)}`);
  pass(atNode < atMid * 1e-3, 'a tap at the mode-2 node leaves mode 2 still');
}

// --- 4. A heavy nacelle makes the top a near-node of mode 2 ---------------
{
  console.log('\nHow much mode 2 moves the top, relative to its largest swing:');
  let prev = Infinity, falling = true, last = 0;
  for (const mu of [0, 0.5, 1, 2, 3]) {
    const { phi } = P.solveModes(mu, 2);
    let peak = 0;
    for (let x = 0; x <= 1.0001; x += 0.01) peak = Math.max(peak, Math.abs(dot(P.shapeAt(x), phi[1])));
    const top = Math.abs(dot(P.shapeAt(1), phi[1])) / peak;
    console.log(`  nacelle ${mu.toFixed(1)}: ${top.toFixed(3)}`);
    if (top > prev) falling = false;
    prev = top; last = top;
  }
  pass(falling && last < 0.1, 'the heavier the nacelle, the less mode 2 shows at the top');
}

// --- 5. Shaking: the hand drives without pinning --------------------------
{
  const mu = 1;
  const free = P.solveModes(mu, 1).omega[0];
  const held = P.solveModes(mu, 1, { x: 1, k: P.HAND_STIFFNESS }).omega[0];
  const shift = held / free - 1;
  console.log(`\nHolding the top shifts omega_1 by ${(shift * 100).toFixed(1)}%`);
  pass(shift < 0.1, 'the hand spring changes the first frequency by under 10%');

  // Shake the top with the same hand amplitude at resonance and well off it.
  const shake = (ratio) => {
    const sim = P.createSim(mu);
    const w = free * ratio;
    sim.grab(1);
    let peak = 0;
    for (let i = 0; i < 6000; i++) {
      sim.moveHand(0.02 * Math.sin(w * i * P.SIM_DT));
      sim.step();
      if (i > 3000) peak = Math.max(peak, Math.abs(sim.displacementAt(1)));
    }
    return peak;
  };
  const onRes = shake(Math.sqrt(1 + shift)); // the frequency of the held pile
  const off = shake(0.6);
  console.log(`  steady swing at the top: shaken at resonance ${onRes.toFixed(3)}, at 0.6 of it ${off.toFixed(3)}`);
  pass(onRes > 5 * off, 'shaking in time builds a swing at least five times larger');
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} CHECK(S) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
