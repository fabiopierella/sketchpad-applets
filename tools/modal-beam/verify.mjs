/**
 * Check the beam solver against the closed-form cantilever solution.
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

// Pull the maths straight out of the applet, so this tests the shipped code
// rather than a copy of it.
const html = readFileSync(join(HERE, 'index.html'), 'utf8');

// COUPLING: the slice is located by these two literal markers in index.html.
// Edit either of them there and this harness stops testing the solver, so the
// bounds are checked rather than assumed.
const START = 'const NEL = 16;';
const END = '/* --------------------------------------------------------------- state */';
const start = html.indexOf(START);
const end = html.indexOf(END);
if (start < 0 || end < 0 || end <= start) {
  console.error(
    `Could not find the solver in index.html.\n` +
      `  start marker ${start < 0 ? 'MISSING' : 'ok'}: ${START}\n` +
      `  end marker   ${end < 0 ? 'MISSING' : 'ok'}: ${END}\n` +
      `The markers moved or changed. Fix them here and in index.html together.`,
  );
  process.exit(1);
}
const maths = html.slice(start, end);
const solveModes = eval(maths + '; solveModes');

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};

// --- bare cantilever against the closed-form solution --------------------
// omega_n = (beta_n L)^2 sqrt(EI / rho A L^4), beta L = 1.8751, 4.6941, 7.8548
const exact = [1.87510407, 4.69409113, 7.85475744].map((b) => b * b);
const bare = solveModes(0, 0);

console.log('Bare cantilever (L=EI=rhoA=1):');
for (let r = 0; r < 3; r++) {
  const err = Math.abs(bare.omega[r] - exact[r]) / exact[r];
  console.log(`  omega_${r + 1} = ${bare.omega[r].toFixed(4)}  exact ${exact[r].toFixed(4)}  err ${(err * 100).toFixed(4)}%`);
  pass(err < 0.002, `mode ${r + 1} within 0.2% of theory`);
}
const ratios = [bare.omega[1] / bare.omega[0], bare.omega[2] / bare.omega[0]];
console.log(`  ratios 1 : ${ratios[0].toFixed(3)} : ${ratios[1].toFixed(3)}  (theory 1 : 6.267 : 17.548)`);
pass(Math.abs(ratios[0] - 6.2669) < 0.02 && Math.abs(ratios[1] - 17.5478) < 0.08, 'frequency ratios match theory');

// --- mass normalisation --------------------------------------------------
// phi^T M phi must be 1, which is what gives the modal equations unit mass.
const NELc = 16, NDOFc = 32;
const asm = eval(maths + '; assemble');
const { M } = asm(0.7, 12);
const loaded = solveModes(0.7, 12);
let worst = 0;
for (let r = 0; r < 3; r++) {
  const p = loaded.phi[r];
  let s = 0;
  for (let i = 0; i < NDOFc; i++) for (let j = 0; j < NDOFc; j++) s += p[i] * M[i][j] * p[j];
  worst = Math.max(worst, Math.abs(s - 1));
}
console.log(`\nMass normalisation: worst |phi^T M phi - 1| = ${worst.toExponential(2)}`);
pass(worst < 1e-8, 'modes are mass-normalised');

// --- physical behaviour --------------------------------------------------
console.log('\nAdding mass at the tip:');
let prev = Infinity;
let monotone = true;
for (const m of [0, 0.25, 0.5, 1, 2]) {
  const s = solveModes(m, NELc);
  console.log(`  m/mbeam = ${m.toFixed(2)}  ->  omega_1 = ${s.omega[0].toFixed(4)}`);
  if (s.omega[0] > prev) monotone = false;
  prev = s.omega[0];
}
pass(monotone, 'omega_1 falls as tip mass grows');

// --- the teaching point: a mass on a node barely moves that mode ---------
// Mode 2 of a bare cantilever crosses zero at x/L = 0.7834 -> node 12.5 of 16.
console.log('\nMass of 1.0 at different heights (change in omega_2 vs unloaded):');
const base2 = bare.omega[1];
const rows = [];
for (let node = 4; node <= 16; node += 2) {
  const s = solveModes(1.0, node);
  const d1 = (s.omega[0] / bare.omega[0] - 1) * 100;
  const d2 = (s.omega[1] / base2 - 1) * 100;
  rows.push({ node, x: node / 16, d1, d2 });
  console.log(`  x/L = ${(node / 16).toFixed(2)}   omega_1 ${d1.toFixed(1)}%   omega_2 ${d2.toFixed(1)}%`);
}
const nearNode = rows.reduce((a, b) => (Math.abs(b.x - 0.78) < Math.abs(a.x - 0.78) ? b : a));
const atTip = rows[rows.length - 1];
console.log(`\n  nearest the mode-2 node (x/L=${nearNode.x.toFixed(2)}): omega_2 shifts ${nearNode.d2.toFixed(1)}%`);
console.log(`  at the tip                       : omega_2 shifts ${atTip.d2.toFixed(1)}%`);
pass(Math.abs(nearNode.d2) < Math.abs(atTip.d2) / 3, 'mass near the mode-2 node barely affects omega_2');

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} CHECK(S) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
