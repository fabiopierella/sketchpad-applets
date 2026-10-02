/**
 * Check the Two-mass lab against the closed-form answer for the spring chain
 * with m1 = m2 = m and k1 = k2 = k:
 *
 *   omega^2 = (3 -+ sqrt 5)/2 * k/m,   x2/x1 = (1 +- sqrt 5)/2
 *
 * and check that the integrator that moves the masses - which knows nothing
 * about modes - keeps a mode's shape, swings at the mode's frequency, and
 * neither gains nor loses energy over a long run.
 *
 * The physics is sliced out of index.html, so this tests the code that ships.
 * Run with:
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
const END = '/* --------------------------------------------------------------- state */';
const start = html.indexOf(START), end = html.indexOf(END);
if (start < 0 || end < 0 || end < start) {
  console.error('Could not find the physics section in index.html. Fix the markers here and there together.');
  process.exit(1);
}
const P = eval(html.slice(start, end) + '; ({ characteristic, modes, modeStart, modalAmplitudes, createSim })');

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const r5 = Math.sqrt(5);

console.log('The answer:');
{
  const { a, b, c } = P.characteristic();
  pass(a === 1 && b === -3 && c === 1, `characteristic equation ${a} L^2 + (${b}) L + ${c} = 0, as derived: L^2 - 3L + 1`);
  const [m1, m2] = P.modes();
  pass(near(m1.omega ** 2, (3 - r5) / 2, 1e-12) && near(m2.omega ** 2, (3 + r5) / 2, 1e-12),
    `omega1 = ${m1.omega.toFixed(4)}, omega2 = ${m2.omega.toFixed(4)} sqrt(k/m)`);
  pass(near(m1.ratio, (1 + r5) / 2, 1e-12) && near(m2.ratio, (1 - r5) / 2, 1e-12),
    `x2/x1 = ${m1.ratio.toFixed(4)} (golden ratio) and ${m2.ratio.toFixed(4)}`);
  const [a1, b1] = P.modeStart(0, 1), [a2, b2] = P.modeStart(1, 1);
  pass(near(b1, 1, 1e-12) && near(b1 / a1, m1.ratio, 1e-12) && near(a2, 1, 1e-12) && near(b2 / a2, m2.ratio, 1e-12),
    'Start in mode: the larger displacement is x0, at the exact ratio');
}

/** Run a release for `T` time units, sampling every `dt`. */
function run(x1, x2, T, dt = 0.01) {
  const sim = P.createSim();
  sim.place(x1, x2);
  sim.release();
  const out = [];
  const e0 = sim.energy();
  for (let t = 0; t < T; t += dt) {
    sim.advance(dt);
    out.push({ t: t + dt, x1: sim.x[0], x2: sim.x[1] });
  }
  return { out, e0, e1: sim.energy() };
}

/** Upward zero crossings of a signal, interpolated. */
function crossings(out, key) {
  const z = [];
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1][key], b = out[i][key];
    if (a < 0 && b >= 0) z.push(out[i - 1].t + (out[i].t - out[i - 1].t) * (-a / (b - a)));
  }
  return z;
}

console.log('Released in a mode, the motion keeps its shape:');
for (const r of [0, 1]) {
  const mode = P.modes()[r];
  const [x1, x2] = P.modeStart(r, 1);
  const { out } = run(x1, x2, 200);
  // Shape: x2 - ratio*x1 stays zero (to integrator accuracy) throughout.
  const off = Math.max(...out.map((s) => Math.abs(s.x2 - mode.ratio * s.x1)));
  pass(off < 1e-4, `mode ${r + 1}: x2 - (${mode.ratio.toFixed(3)}) x1 never strays past ${off.toExponential(1)}`);
  const z = crossings(out, 'x1');
  const period = (z[z.length - 1] - z[0]) / (z.length - 1);
  const expected = 2 * Math.PI / mode.omega;
  pass(near(period, expected, expected * 1e-4), `mode ${r + 1}: period ${period.toFixed(4)}, theory ${expected.toFixed(4)}`);
}

console.log('Released anywhere else, it does not:');
{
  const { out } = run(1, 0, 60);
  let lo = Infinity, hi = -Infinity;
  for (const s of out) if (Math.abs(s.x1) > 0.2) { const q = s.x2 / s.x1; lo = Math.min(lo, q); hi = Math.max(hi, q); }
  pass(hi - lo > 1, `x1 = x0, x2 = 0: the ratio x2/x1 wanders from ${lo.toFixed(2)} to ${hi.toFixed(2)}`);
}

console.log('Undamped means it comes back forever:');
{
  const { e0, e1 } = run(1, -0.3, 2000);
  pass(near(e1, e0, e0 * 1e-5), `energy after 2000 time units (~200 swings): ${(100 * (e1 - e0) / e0).toExponential(1)} % change`);
}

console.log('Holding:');
{
  const sim = P.createSim();
  sim.place(0.5, 0.2); sim.release();
  sim.advance(3);
  const other = sim.x[1];
  sim.set(0, 0.9);
  sim.advance(5);
  pass(sim.held && sim.x[0] === 0.9 && sim.x[1] === other,
    'dragging a mass stops everything, and the other mass stays where it was');
}

console.log('The mode plane:');
{
  const [q11, q12] = P.modalAmplitudes(...P.modeStart(0, 1));
  const [q21, q22] = P.modalAmplitudes(...P.modeStart(1, 1));
  pass(near(q11, 1, 1e-12) && near(q12, 0, 1e-12) && near(q21, 0, 1e-12) && near(q22, 1, 1e-12),
    'a start in mode 1 reads q = (1, 0), in mode 2 q = (0, 1)');
  const [a1, b1] = P.modeStart(0, 1), [a2, b2] = P.modeStart(1, 1);
  let worst = 0;
  for (let i = 0; i < 200; i++) {
    const x1 = Math.sin(i * 1.7) * 1.6, x2 = Math.cos(i * 2.3) * 1.6;
    const [q1, q2] = P.modalAmplitudes(x1, x2);
    worst = Math.max(worst, Math.abs(q1 * a1 + q2 * a2 - x1), Math.abs(q1 * b1 + q2 * b2 - x2));
  }
  pass(worst < 1e-12, `q1 phi1 + q2 phi2 rebuilds any displacement (worst error ${worst.toExponential(1)})`);

  // The honest part: released from a mix, the simulated motion projected onto
  // each mode swings as q_r cos(omega_r t) - each keeps its amplitude for ever.
  const x0 = [1.2, -0.4];
  const [Q1, Q2] = P.modalAmplitudes(...x0);
  const [w1, w2] = P.modes().map((m) => m.omega);
  const { out } = run(...x0, 300);
  let err = 0;
  for (const s of out) {
    const [q1, q2] = P.modalAmplitudes(s.x1, s.x2);
    err = Math.max(err, Math.abs(q1 - Q1 * Math.cos(w1 * s.t)), Math.abs(q2 - Q2 * Math.cos(w2 * s.t)));
  }
  // Tolerance: Verlet's phase drift, ~2e-4 after ~77 swings of mode 2. Any
  // exchange of energy between the modes would show as an error of order 1.
  pass(err < 1e-3, `from (${x0}): q1(t) = ${Q1.toFixed(3)} cos(w1 t), q2(t) = ${Q2.toFixed(3)} cos(w2 t) over 300 units, worst ${err.toExponential(1)}`);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
