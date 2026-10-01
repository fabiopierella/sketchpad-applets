/**
 * Check the Modes lab: its forcing engine is the Forcing lab's, its mode
 * shapes are the clamped-free beam's, and the handover's acceptance checks
 * hold for both presets.
 *
 * The maths is sliced out of index.html, so this tests the code that ships.
 * Run with:
 *
 *   npm test
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(HERE, 'index.html'), 'utf8');
const sibling = readFileSync(join(HERE, '..', 'forcing-lab', 'index.html'), 'utf8');

// COUPLING: these markers in both index.html files.
const START = '/* ------------------------------------------------------- forcing engine';
const ENGINE_END = '/* ---------------------------------------------------------------- modes';
const END = '/* --------------------------------------------------------------- state */';
const start = html.indexOf(START), mid = html.indexOf(ENGINE_END), end = html.indexOf(END);
if (start < 0 || mid < 0 || end < 0 || !(start < mid && mid < end)) {
  console.error('Could not find the engine and modes sections in index.html. Fix the markers here and there together.');
  process.exit(1);
}

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;

console.log('Shared engine:');
{
  const mine = html.slice(start, mid).trimEnd();
  const s0 = sibling.indexOf(START), s1 = sibling.indexOf(END);
  const theirs = sibling.slice(s0, s1).trimEnd();
  pass(mine === theirs, 'identical to the Forcing lab\'s, character for character');
}

const M = eval(
  html.slice(start, end) +
    '; ({ ZETA, EDGE_FC, forcingCoeffs, harmonicCount, steadyState, modeShape, modeNodes, PRESETS, BETAS })',
);

console.log('Mode shapes:');
for (let j = 0; j < 3; j++) {
  const h = 1e-5;
  const d1 = (M.modeShape(j, h) - M.modeShape(j, 0)) / h;
  pass(near(M.modeShape(j, 1), 1, 1e-12) && near(M.modeShape(j, 0), 0, 1e-12) && Math.abs(d1) < 1e-3,
    `mode ${j + 1}: unit at the top, clamped at the base`);
  // Free end: zero moment and shear, so the 2nd and 3rd derivatives vanish at x = 1.
  const f = (x) => M.modeShape(j, x), e = 1e-3;
  const d2 = (f(1) - 2 * f(1 - e) + f(1 - 2 * e)) / (e * e);
  const curv = Math.abs((f(0.5 + e) - 2 * f(0.5) + f(0.5 - e)) / (e * e)) + 1;
  pass(Math.abs(d2) / curv < 0.05 * (j + 1) * 3, `mode ${j + 1}: free at the top (no bending moment)`);
}
pass(near(M.PRESETS.uniform[1], 6.267, 0.002) && near(M.PRESETS.uniform[2], 17.547, 0.003),
  `uniform beam: f2/f1 = ${M.PRESETS.uniform[1].toFixed(3)}, f3/f1 = ${M.PRESETS.uniform[2].toFixed(3)}`);
pass(near(M.modeNodes(1)[0], 0.7834, 2e-4), `mode 2's node at ${M.modeNodes(1)[0].toFixed(4)} L (theory 0.7834)`);
pass(near(M.modeNodes(2)[0], 0.5035, 2e-4) && near(M.modeNodes(2)[1], 0.8677, 2e-4), 'mode 3\'s nodes at 0.5035 and 0.8677 L');

/** Each mode's bar, as the tool computes it. */
function bars(preset, waveform, fF, loadAt = 1) {
  const r = M.PRESETS[preset];
  const c = M.forcingCoeffs(waveform, fF, M.EDGE_FC, M.harmonicCount(waveform, fF, r[2]));
  return r.map((rj, j) => Math.abs(M.modeShape(j, loadAt)) * M.steadyState(c, fF, rj, M.ZETA).peak);
}

console.log('Acceptance:');
for (const preset of ['uniform', 'lab']) {
  // Check 3, as agreed: across the whole slider only mode 1 resonates; modes 2
  // and 3 stay near their static level.
  let m1 = 0, m2 = 0, m3 = 0;
  for (let f = 0.15; f <= 1.5; f += 0.005) {
    const b = bars(preset, 'saw', f);
    m1 = Math.max(m1, b[0]); m2 = Math.max(m2, b[1]); m3 = Math.max(m3, b[2]);
  }
  pass(m1 > 9 && m2 < 2.5 && m3 < 2,
    `${preset}, sawtooth sweep: mode 1 reaches ${m1.toFixed(1)}, modes 2 and 3 never pass ${m2.toFixed(2)} and ${m3.toFixed(2)}`);
  // Check 4: at mode 2's node there is no mode 2, at any frequency.
  const node = M.modeNodes(1)[0];
  let worst = 0;
  for (let f = 0.15; f <= 1.5; f += 0.05) worst = Math.max(worst, bars(preset, 'saw', f, node)[1]);
  pass(worst < 1e-9, `${preset}: load at mode 2's node leaves mode 2 at ${worst.toExponential(1)}`);
}
// Check 5: the presets differ only in frequency, and switching needs no state.
{
  const a = bars('uniform', 'saw', 0.4), b = bars('lab', 'saw', 0.4), a2 = bars('uniform', 'saw', 0.4);
  pass(a.every((v, i) => v === a2[i]) && a.some((v, i) => v !== b[i]), 'switching presets is a pure function of the preset');
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
