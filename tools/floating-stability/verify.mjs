/**
 * Check the floating-platform model against theory, not against itself.
 *
 * The maths is extracted from the applet rather than duplicated here, so this
 * tests the code that actually ships. Run with:
 *
 *   npm test
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(HERE, 'index.html'), 'utf8');

// COUPLING: the slice is located by these two literal markers in index.html.
// Edit either of them there and this harness stops testing the model, so the
// bounds are checked rather than assumed.
const START = 'const RHO = 1025;';
const END = '/* --------------------------------------------------------------- state */';
const start = html.indexOf(START);
const end = html.indexOf(END);
if (start < 0 || end < 0 || end <= start) {
  console.error(
    `Could not find the model in index.html.\n` +
      `  start marker ${start < 0 ? 'MISSING' : 'ok'}: ${START}\n` +
      `  end marker   ${end < 0 ? 'MISSING' : 'ok'}: ${END}\n` +
      `The markers moved or changed. Fix them here and in index.html together.`,
  );
  process.exit(1);
}
const maths = html.slice(start, end);

const F = {};
for (const name of [
  'colArea', 'colInertia', 'totals', 'immersion', 'catenary', 'lineForce',
  'forces', 'equilibrium', 'stiffness', 'analyse', 'shares', 'linePoints', 'bisect',
  'designFor', 'hubHeight', 'massMatrix', 'acceleration', 'pullLever',
]) {
  F[name] = eval(maths + '; ' + name);
}
const RHO = eval(maths + '; RHO');
const G = eval(maths + '; G');

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};
const rel = (a, b) => Math.abs(a - b) / Math.max(1e-30, Math.abs(b));

/** A plausible two-column semi-submersible, and the base case for everything. */
const base = () => ({
  D: 22, s: 52, Hc: 40,
  mBallast: 12.0e6, zBallast: 6,
  mTop: 2.25e6, thrust: 0,
  zFair: 5,
  rAnchor: 800, depth: 200,
  L0: 850, w: 1800, EA: 1.5e9,
  Ca11: 1.0, Ca33: 3.0,
});

const HYDRO = { buoy: true, weight: true };

/* ------------------------------------------------------- 1. Archimedes */
console.log('Floats where Archimedes says it does:');
{
  const P = base();
  const { q, ok } = F.equilibrium(P, null, HYDRO);
  const f = F.forces(P, q[0], q[1], q[2], HYDRO);
  const T = F.totals(P);
  console.log(`  draft ${(-q[1]).toFixed(3)} m, displacement ${(RHO * f.vol / 1e6).toFixed(3)} kt, mass ${(T.mass / 1e6).toFixed(3)} kt`);
  pass(ok, 'equilibrium converged');
  pass(rel(RHO * f.vol, T.mass) < 1e-9, 'displaced mass equals total mass to 1e-9');
  pass(Math.abs(q[2]) < 1e-9, 'floats upright when nothing pushes it over');
}

/* ------------------------------------ 2. the stiffness matches rho g V GM */
// The headline check. C55 comes from differentiating the force function; GM
// comes from the textbook KB + BM - KG. Nothing in the model computes one from
// the other, so agreement means the hydrostatics is right.
console.log('\nPitch stiffness against rho g V GM:');
for (const [label, tweak] of [
  ['base semi', {}],
  ['deep ballast', { zBallast: 1.5, mBallast: 14e6 }],
  ['high centre of gravity', { zBallast: 30, mBallast: 9e6 }],
  ['narrow spacing', { s: 20 }],
  ['wide spacing', { s: 110 }],
  ['fat columns', { D: 30 }],
]) {
  const P = Object.assign(base(), tweak);
  const { q } = F.equilibrium(P, null, HYDRO);
  const f = F.forces(P, q[0], q[1], q[2], HYDRO);
  const T = F.totals(P);
  const A = F.colArea(P.D);
  const Iwp = 2 * (A * (P.s / 2) ** 2 + F.colInertia(P.D));
  const GM = f.KB + Iwp / f.vol - T.KG;
  const theory = RHO * G * f.vol * GM;
  const found = F.stiffness(P, q, HYDRO)[2][2];
  console.log(`  ${label.padEnd(24)} GM ${GM.toFixed(3).padStart(8)} m   C55 ${(found / 1e9).toFixed(4)} GN.m/rad   theory ${(theory / 1e9).toFixed(4)}   err ${(rel(found, theory) * 100).toFixed(4)}%`);
  pass(rel(found, theory) < 1e-4, `${label}: C55 within 0.01% of rho g V GM`);
}

/* ------------------------------------------- 3. closed form for a column */
console.log('\nA single column against the closed form:');
{
  // With the columns pushed together the pair behaves as one circle, whose
  // BM is exactly D^2 / 16T.
  const P = Object.assign(base(), { s: 1e-4 });
  const { q } = F.equilibrium(P, null, HYDRO);
  const f = F.forces(P, q[0], q[1], q[2], HYDRO);
  const T = -q[1];
  const A = F.colArea(P.D);
  const Iwp = 2 * (A * (P.s / 2) ** 2 + F.colInertia(P.D));
  const BM = Iwp / f.vol;
  // Two touching columns of diameter D have twice the area and twice the
  // inertia of one, so BM is the single-column value.
  const exact = (P.D * P.D) / (16 * T);
  console.log(`  draft ${T.toFixed(3)} m   KB ${f.KB.toFixed(4)} m (exact ${(T / 2).toFixed(4)})   BM ${BM.toFixed(5)} m (exact ${exact.toFixed(5)})`);
  pass(rel(f.KB, T / 2) < 1e-9, 'KB is half the draft for a vertical column');
  pass(rel(BM, exact) < 1e-6, 'BM is D^2 / 16T');
}

/* --------------------------------------------------- 4. the mooring line */
// The catenary is checked by measuring the curve it returns: integrate the arc
// length of the drawn shape and compare with the line length that went in.
console.log('\nMooring line, arc length of the returned shape:');
function arcLength(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}
for (const [label, P, xf, zf] of [
  ['touching down', Object.assign(base(), { L0: 900, w: 1800 }), 0, -5],
  ['nearly lifted', Object.assign(base(), { L0: 830, w: 1800 }), 0, -5],
  ['fully lifted', Object.assign(base(), { L0: 824, w: 1800 }), 0, -5],
  ['light line', Object.assign(base(), { L0: 900, w: 60 }), 0, -5],
]) {
  const xa = P.rAnchor, za = -P.depth;
  const f = F.lineForce(P, xf, zf, xa, za);
  const pts = F.linePoints(P, { xf, zf, xa, za, mode: f.mode }, 4000);
  const len = arcLength(pts);
  const chord = Math.hypot(xa - xf, za - zf);
  console.log(`  ${label.padEnd(16)} mode ${f.mode.padEnd(10)} H ${(f.H / 1e6).toFixed(3)} MN   V ${(-f.Fz / 1e6).toFixed(3)} MN   arc ${len.toFixed(2)} m (line ${P.L0}, chord ${chord.toFixed(1)})`);
  pass(rel(len, P.L0) < 2e-3, `${label}: the drawn curve is the length of the line`);
  pass(f.Fx > 0 && f.Fz <= 0, `${label}: pulls toward the anchor and downward`);
}
{
  // A tendon straight below the hull: pure stretch, no catenary anywhere.
  const P = Object.assign(base(), { rAnchor: 0, L0: 180, EA: 1.5e9 });
  const f = F.lineForce(P, 0, -5, 0, -200);
  // Stretch, plus the line's own weight hanging from the fairlead.
  const exact = (P.EA * (195 - P.L0)) / P.L0 + P.w * P.L0;
  console.log(`  ${'vertical tendon'.padEnd(16)} mode ${f.mode.padEnd(10)} T ${(f.T / 1e6).toFixed(3)} MN   exact EA(d-L0)/L0 + wL ${(exact / 1e6).toFixed(3)} MN`);
  pass(rel(f.T, exact) < 1e-9, 'a taut tendon carries its stretch plus its weight');
  pass(Math.abs(f.Fx) < 1e-9, 'a vertical tendon pulls straight down');
}

/* ------------------------------------------- 5. the three terms behave */
console.log('\nEach mechanism responds to its own slider:');
{
  const low = F.analyse(Object.assign(base(), { zBallast: 2 }));
  const high = F.analyse(Object.assign(base(), { zBallast: 25 }));
  console.log(`  ballast at 2 m: GM ${low.GM.toFixed(2)} m, Cbal ${(low.Cbal / 1e9).toFixed(3)} GN.m   at 25 m: GM ${high.GM.toFixed(2)} m, Cbal ${(high.Cbal / 1e9).toFixed(3)} GN.m`);
  pass(low.GM > high.GM, 'lowering the ballast raises GM');
  pass(low.Cbal > high.Cbal, 'lowering the ballast raises the ballast term');

  const A40 = 2 * F.colArea(base().D) * 20 * 20;
  const own = 2 * F.colInertia(base().D);
  const s1 = F.analyse(Object.assign(base(), { s: 40 }));
  const s2 = F.analyse(Object.assign(base(), { s: 80 }));
  // The parallel-axis term dominates, so the waterplane term grows as s^2.
  // Just under four, and it should be: each column's own waterplane circle
  // contributes the same inertia wherever the column is put, so it dilutes the
  // s^2 growth of the parallel-axis term.
  const ratio = s2.Cwp / s1.Cwp;
  const exact = (4 * A40 + own) / (A40 + own);
  console.log(`  spacing 40 -> 80 m: Cwp ratio ${ratio.toFixed(4)} (parallel axis alone would give 4; with each column's own circle, ${exact.toFixed(4)})`);
  pass(rel(ratio, exact) < 1e-6, 'the waterplane term grows as the spacing squared, diluted by each column\'s own circle');

  const slack = F.analyse(Object.assign(base(), { rAnchor: 800, L0: 900 }));
  const tlp = F.analyse(Object.assign(base(), { rAnchor: 10, L0: 180, mBallast: 4e6 }));
  console.log(`  catenary: mooring share ${(slack.shares[2] * 100).toFixed(1)}%   tendons: ${(tlp.shares[2] * 100).toFixed(1)}%`);
  pass(tlp.shares[2] > slack.shares[2], 'pulling the anchors in shifts the work to the mooring');
  pass(tlp.shares[2] > 0.5, 'a tension-leg platform is mooring-stabilised');
}

/* -------------------------------------------------- 6. the triangle itself */
console.log('\nThe triangle:');
{
  for (const [label, tweak] of [
    ['semi', {}],
    ['spar', { Hc: 120, D: 14, s: 16, zBallast: 4, mBallast: 24e6 }],
    ['tlp', { Hc: 35, D: 18, s: 40, mBallast: 2e6, rAnchor: 10, L0: 176 }],
  ]) {
    const a = F.analyse(Object.assign(base(), tweak));
    const sum = a.shares[0] + a.shares[1] + a.shares[2];
    console.log(`  ${label.padEnd(5)} waterplane ${(a.shares[0] * 100).toFixed(1)}%  ballast ${(a.shares[1] * 100).toFixed(1)}%  mooring ${(a.shares[2] * 100).toFixed(1)}%   GM ${a.GM.toFixed(2)} m`);
    pass(Math.abs(sum - 1) < 1e-12, `${label}: shares sum to one`);
    const corner = { semi: 0, spar: 1, tlp: 2 }[label];
    pass(a.shares[corner] > 0.7, `${label}: sits in its own corner of the triangle`);
    pass(a.C55 > 0, `${label}: is stable in pitch`);
  }
  const a = F.analyse(base());
  pass(rel(a.C55, a.Cwp + a.Cbal + a.Cmoor) < 1e-12, 'the three terms add up to C55');
  // A tension-leg platform has no hydrostatic stability at all; the tendons are
  // the whole story. Worth pinning, because it looks like a bug otherwise.
  const tlp = F.analyse(Object.assign(base(), { Hc: 35, D: 18, s: 40, mBallast: 2e6, rAnchor: 10, L0: 176 }));
  console.log(`  a tension-leg platform has GM ${tlp.GM.toFixed(2)} m and is still stable, C55 ${(tlp.C55 / 1e9).toFixed(2)} GN.m/rad`);
  pass(tlp.GM < 0 && tlp.C55 > 0, 'negative GM, held up by the tendons');
}

/* ---------------------------------------------------------- 7. periods */
console.log('\nNatural periods of the base design:');
{
  const a = F.analyse(base());
  console.log(`  surge ${a.Tsurge.toFixed(1)} s   heave ${a.Theave.toFixed(1)} s   pitch ${a.Tpitch.toFixed(1)} s`);
  pass(a.Tsurge > 40, 'surge is far below the wave band, as a catenary mooring makes it');
  pass(a.Theave > 12 && a.Theave < 40, 'heave sits above the wave band');
  pass(a.Tpitch > 12, 'pitch sits above the wave band');
}

/* ------------------------------ 8. every design on the grid is a real one */
// The applet offers a grid of platforms rather than sliders, so every node has
// to be something that floats, stands up and can be pulled on. A node that
// failed would be a dead spot on the triangle with nothing to show.
console.log('\nThe grid of designs offered on the triangle:');
{
  const NX = 5, NY = 5;
  let worstMoor = 0, worstBal = 0, worstWp = 0;
  let solved = 0;
  const rows = [];
  for (let j = 0; j < NY; j++) {
    for (let i = 0; i < NX; i++) {
      const slender = i / (NX - 1);
      const tight = j / (NY - 1);
      const a = F.analyse(F.designFor(slender, tight));
      rows.push({ slender, tight, a });
      if (a.ok) solved++;
      pass(a.ok, `design (${slender.toFixed(2)}, ${tight.toFixed(2)}) settles somewhere`);
      if (!a.ok) continue;
      const fine = a.draft > 3 && a.C55 > 0 && isFinite(a.Tpitch) && a.Tpitch > 1 && a.mass > 0;
      pass(fine, `design (${slender.toFixed(2)}, ${tight.toFixed(2)}) floats, stands up and has a pitch period`);
      worstWp = Math.max(worstWp, a.shares[0]);
      worstBal = Math.max(worstBal, a.shares[1]);
      worstMoor = Math.max(worstMoor, a.shares[2]);
    }
  }
  console.log(`  ${solved} of ${NX * NY} solved; best waterplane ${(worstWp * 100).toFixed(0)}%, best ballast ${(worstBal * 100).toFixed(0)}%, best mooring ${(worstMoor * 100).toFixed(0)}%`);
  pass(worstWp > 0.85, 'one corner of the grid is a genuine semi-submersible');
  pass(worstBal > 0.85, 'another is a genuine spar');
  pass(worstMoor > 0.7, 'another is a genuine tension-leg platform');

  // Ballast is derived, never chosen, so Archimedes has to come out right at
  // every node once the lines are taken away.
  let worstArch = 0;
  for (const { slender, tight } of rows) {
    const P = F.designFor(slender, tight);
    const { q } = F.equilibrium(P, null, HYDRO);
    const f = F.forces(P, q[0], q[1], q[2], HYDRO);
    worstArch = Math.max(worstArch, rel(RHO * f.vol, F.totals(P).mass));
  }
  console.log(`  worst departure from displaced mass = total mass: ${worstArch.toExponential(1)}`);
  pass(worstArch < 1e-9, 'every design on the grid floats where Archimedes says');
}

/* ------------------------------------------ 9. the platform actually moves */
// These exist because every static check above passed while the animation was
// visibly wrong: it integrated a frozen stiffness, so a catenary never
// stiffened and the platform slid out and stalled. The equations of motion are
// in the tested slice now precisely so that cannot happen again.
function rk4(P, res, x0, v0, Q, seconds, h) {
  let x = x0.slice();
  let v = v0.slice();
  const mix = (p, q, k) => [p[0] + k * q[0], p[1] + k * q[1], p[2] + k * q[2]];
  for (let t = 0; t < seconds / h; t++) {
    const a1 = F.acceleration(P, res, x, v, Q);
    const x2 = mix(x, v, h / 2), v2 = mix(v, a1, h / 2);
    const a2 = F.acceleration(P, res, x2, v2, Q);
    const x3 = mix(x, v2, h / 2), v3 = mix(v, a2, h / 2);
    const a3 = F.acceleration(P, res, x3, v3, Q);
    const x4 = mix(x, v3, h), v4 = mix(v, a3, h);
    const a4 = F.acceleration(P, res, x4, v4, Q);
    for (let i = 0; i < 3; i++) {
      x[i] += (h / 6) * (v[i] + 2 * v2[i] + 2 * v3[i] + v4[i]);
      v[i] += (h / 6) * (a1[i] + 2 * a2[i] + 2 * a3[i] + a4[i]);
    }
  }
  return { x, v };
}

console.log('\nA catenary stiffens as it lifts off the bed:');
{
  const P = F.designFor(0, 0);
  const r = F.analyse(P);
  const zero = F.forces(P, r.q[0], r.q[1], r.q[2], { moor: true }).Fx;
  const at = (dx) => -(F.forces(P, r.q[0] + dx, r.q[1], r.q[2], { moor: true }).Fx - zero);
  const ratio = at(90) / (r.C[0][0] * 90);
  console.log(`  restoring at 90 m is ${ratio.toFixed(2)}x what a constant stiffness would give`);
  pass(ratio > 2, 'the line stiffens with offset rather than staying linear');

  // The secant stiffness must climb, and the force must never fall back. An
  // earlier version switched from a hanging line to a weightless elastic rod
  // once the chord passed the unstretched length, and the restoring force
  // collapsed by two thirds at the crossover - the platform lurched outward
  // exactly where it should have been caught. Sampled finely enough to see it.
  // Tolerance is relative: the line solve leaves a fraction of a percent of
  // wobble at twenty meganewtons, and the fault being guarded against was a
  // collapse of two thirds, so 5% separates them with room to spare.
  let prev = -Infinity;
  let dropAt = 0;
  for (let dx = 0; dx <= 110; dx += 1) {
    const f = at(dx);
    if (f < prev * 0.95 && !dropAt) dropAt = dx;
    prev = f;
  }
  console.log(`  secant stiffness ${(at(10) / 10).toExponential(2)} N/m at 10 m, ${(at(90) / 90).toExponential(2)} N/m at 90 m`);
  pass(!dropAt, dropAt ? `restoring falls back at ${dropAt} m` : 'restoring never falls back as it is pulled out');
  pass(at(90) / 90 > 1.5 * (at(10) / 10), 'the line is markedly stiffer far out than near rest');
}

console.log('\nLeft alone, it stays put:');
{
  let worst = 0;
  for (let j = 0; j < 5; j++) {
    for (let i = 0; i < 5; i++) {
      const P = F.designFor(i / 4, j / 4);
      const r = F.analyse(P);
      const a = F.acceleration(P, r, [0, 0, 0], [0, 0, 0], [0, 0, 0]);
      worst = Math.max(worst, Math.abs(a[0]), Math.abs(a[1]), Math.abs(a[2]));
      const M = F.massMatrix(P, r);
      const minor2 = M[0][0] * M[1][1];
      const det = M[0][0] * (M[1][1] * M[2][2]) - M[0][2] * (M[1][1] * M[2][0]);
      pass(M[0][0] > 0 && minor2 > 0 && det > 0, `design (${i}, ${j}): mass matrix is positive definite`);
    }
  }
  console.log(`  worst acceleration at rest across the grid: ${worst.toExponential(1)} m/s^2`);
  pass(worst < 1e-6, 'nothing creeps on its own');
}

console.log('\nHeld at rated thrust (2.4 MN at the nacelle):');
{
  const cases = [
    ['catenary semi', 0, 0],
    ['tension-leg', 0, 1],
    ['spar', 1, 0],
  ];
  const out = {};
  for (const [label, sl, tg] of cases) {
    const P = F.designFor(sl, tg);
    const r = F.analyse(P);
    const Q = [2.4e6, 0, 2.4e6 * F.hubHeight(P)];
    const { x } = rk4(P, r, [0, 0, 0], [0, 0, 0], Q, 900, 0.02);
    out[label] = x;
    console.log(`  ${label.padEnd(15)} ${x[0].toFixed(1).padStart(6)} m off station, leaning ${((x[2] * 180) / Math.PI).toFixed(2)} deg`);
  }
  pass(out['catenary semi'][0] > 5 && out['catenary semi'][0] < 45, 'a catenary lets it drift, but not away');
  pass(Math.abs((out['tension-leg'][2] * 180) / Math.PI) < 1.5, 'a tension-leg platform barely leans');
  pass(out['spar'][2] > out['tension-leg'][2], 'a spar leans more than a tension-leg platform');
}

console.log('\nReleased, it comes back:');
{
  for (const [label, sl, tg] of [['catenary semi', 0, 0], ['tension-leg', 0, 1]]) {
    const P = F.designFor(sl, tg);
    const r = F.analyse(P);
    const held = rk4(P, r, [0, 0, 0], [0, 0, 0], [3e6, 0, 3e6 * F.hubHeight(P)], 900, 0.02);
    const back = rk4(P, r, held.x, held.v, [0, 0, 0], 4 * r.Tsurge, 0.02);
    const shrunk = Math.abs(back.x[0]) / Math.max(1e-9, Math.abs(held.x[0]));
    console.log(`  ${label.padEnd(15)} let go from ${held.x[0].toFixed(1)} m, after four surge periods ${back.x[0].toFixed(2)} m (${(shrunk * 100).toFixed(0)}% left)`);
    pass(shrunk < 0.15, `${label}: springs back when released`);
  }
}

console.log('\nThe pull acts on the lever it is given:');
{
  const P = F.designFor(0, 0);
  const r = F.analyse(P);
  const high = F.pullLever(0, F.hubHeight(P), 0);
  const low = F.pullLever(0, 0, 0);
  console.log(`  lever at the nacelle ${high.toFixed(0)} m, at the keel ${low.toFixed(0)} m`);
  pass(high > 100, 'grabbing the nacelle is a long lever about the keel');
  pass(Math.abs(low) < 1e-12, 'grabbing the keel is no lever at all');
  const tipHigh = F.acceleration(P, r, [0, 0, 0], [0, 0, 0], [3e6, 0, 3e6 * high])[2];
  const tipLow = F.acceleration(P, r, [0, 0, 0], [0, 0, 0], [3e6, 0, 3e6 * low])[2];
  console.log(`  pitch acceleration: nacelle ${tipHigh.toExponential(2)}, keel ${tipLow.toExponential(2)} rad/s^2`);
  pass(tipHigh > 0, 'pulling the nacelle downwind tips it downwind');
  pass(tipHigh > Math.abs(tipLow), 'and tips it much more than pulling at the keel does');
}

/* ----------------------------------- 10. the canvas cannot run away again */
// Not physics, but the only fault that ever actually broke the applet for a
// user: `canvas.height` is a reflected attribute, so assigning the property
// rewrites the attribute it was read from. Reading it back each frame and
// scaling it again is a no-op at one device pixel per CSS pixel and doubles
// the buffer every frame at two - fine on a laptop, a flash and a crash on a
// phone. The rule is that the attribute is read once and remembered.
console.log('\nThe canvas sizing cannot feed back on itself:');
{
  const reads = html.match(/getAttribute\('height'\)/g) || [];
  console.log(`  ${reads.length} read(s) of the height attribute in the whole file`);
  pass(reads.length === 1, 'the height attribute is read in exactly one place');
  pass(
    /function designHeight\(cv\)[\s\S]{0,260}getAttribute\('height'\)/.test(html),
    'and that place is designHeight, which remembers it',
  );
  pass(/designHeights\.has\(cv\)/.test(html), 'the remembered value is keyed per canvas');
  pass(/MAX_BUFFER/.test(html), 'and the buffer is clamped besides');
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} CHECK(S) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
