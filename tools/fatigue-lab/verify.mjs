/**
 * Check the Fatigue lab against the m = 3 branch of DNV-RP-C203's D-curve in
 * air, which is written for the stress range 2 sa, and the Palmgren-Miner
 * rule, worked by hand:
 *
 *   N = 10^12.164 / (2 sa)^3,   D = sum n_i / N_i,   failure at D = 1
 *
 * and check that the Blocks the lab plays frame by frame add up to the same
 * damage, in any order, and break on the cycle that takes D to exactly 1.
 *
 * The physics and the queue are sliced out of index.html, so this tests the
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
// Each evaluation gets its own queue and ledger, as a fresh page would.
const fresh = () => eval(html.slice(start, end) + `; ({
  SN, NS, cyclesToFailure, createLedger, take, blockSeconds, send, reset, advance,
  get ledger() { return ledger; }, get blocks() { return blocks; }, get broken() { return broken; },
})`);
const P = fresh();

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};
const rel = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);

console.log('The S-N curve:');
{
  const life = (sa) => 10 ** 12.164 / (2 * sa) ** 3;
  pass(rel(P.cyclesToFailure(50), life(50), 1e-12), `N(50 MPa) = ${P.cyclesToFailure(50).toExponential(3)}, about 1.46e6`);
  pass(rel(P.cyclesToFailure(100), life(100), 1e-12), `N(100 MPa) = ${P.cyclesToFailure(100).toExponential(3)}, about 1.8e5`);
  pass(rel(P.cyclesToFailure(10), life(10), 1e-12), `N(10 MPa) = ${P.cyclesToFailure(10).toExponential(3)}: one slope, no knee`);
  pass(rel(P.cyclesToFailure(50) / P.cyclesToFailure(100), 8, 1e-12), 'doubling the amplitude cuts the life by 8, everywhere');
}

console.log('The slider:');
{
  pass(P.NS.length === 16 && P.NS[0] === 1e3 && P.NS.at(-1) === 1e8 && P.NS.includes(2e5) && P.NS.includes(5e7),
    `n steps through 1, 2, 5 x 10^k from 1e3 to 1e8 (${P.NS.length} steps)`);
  pass(P.blockSeconds(1e3) === 1.5 && Math.abs(P.blockSeconds(1e8) - 6) < 1e-12, 'a Block plays 1.5 s at 1e3 cycles and 6 s at 1e8');
}

/** Play the lab's queue at 60 frames a second until it is empty or broken. */
function play(lab) {
  for (let i = 0; i < 60 * 600 && (lab.blocks.length && !lab.broken); i++) lab.advance(1 / 60);
}

console.log('Miner, played frame by frame:');
{
  const lab = fresh();
  lab.send(50, 1e6);
  play(lab);
  const D = lab.ledger.damage();
  pass(!lab.broken && rel(D, 1e6 / (10 ** 12.164 / 1e6), 1e-9), `10^6 cycles at 50 MPa: D = ${D.toFixed(4)}, about 0.685`);

  lab.send(50, 1e6);
  play(lab);
  const left = (1 - 1e6 / (10 ** 12.164 / 1e6)) * (10 ** 12.164 / 1e6);
  pass(!!lab.broken && lab.broken.cycle === Math.ceil(left - 1e-6),
    `a second one breaks it after ${lab.broken?.cycle} of 1 000 000 cycles (by hand: ${Math.ceil(left)})`);
  pass(lab.ledger.damage() === 1 || rel(lab.ledger.damage(), 1, 1e-12), `D is exactly 1 at the break (${lab.ledger.damage()})`);
  pass(lab.blocks.length === 0, 'the queue is dropped when it breaks');
  lab.send(50, 1e3);
  pass(lab.blocks.length === 0, 'nothing more can be sent until Reset');
  lab.reset();
  pass(lab.ledger.damage() === 0 && !lab.broken, 'Reset repairs it');
}

console.log('Order does not matter:');
{
  const spectrum = [[100, 2e4], [30, 1e6], [60, 1e5], [20, 5e6], [100, 1e4], [45, 2e5]];
  const byHand = spectrum.reduce((D, [s, n]) => D + n / P.cyclesToFailure(s), 0);
  const results = [];
  for (const order of [spectrum, spectrum.slice().reverse(), [3, 0, 5, 1, 4, 2].map((i) => spectrum[i])]) {
    const lab = fresh();
    for (const [s, n] of order) lab.send(s, n);
    play(lab);
    results.push(lab.ledger.damage());
  }
  pass(byHand < 1 && results.every((D) => rel(D, byHand, 1e-9)),
    `three orders give D = ${results.map((D) => D.toFixed(6)).join(', ')}; by hand ${byHand.toFixed(6)}`);
  const lab = fresh();
  for (const [s, n] of spectrum) lab.send(s, n);
  play(lab);
  pass(rel(lab.ledger.counts.get(100), 3e4, 1e-12), 'Blocks at the same amplitude add into one count');
}

console.log('The break, from a part-used pile:');
{
  // In one go and in many small pieces, the pile breaks on the same cycle.
  const one = P.createLedger(), many = P.createLedger();
  P.take(one, 75, 1e4); P.take(many, 75, 1e4);
  const r = P.take(one, 40, 1e8);
  let taken = 0, broke = false;
  while (!broke) { const s = P.take(many, 40, 997); taken += s.taken; broke = s.broke; }
  pass(r.broke && rel(taken, r.taken, 1e-9) && rel(one.damage(), 1, 1e-12) && rel(many.damage(), 1, 1e-12),
    `breaks after ${Math.ceil(r.taken)} cycles at 40 MPa either way, with D = 1`);
}

if (failures) {
  console.log(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
