/**
 * Check the Forcing lab's steady-state maths against closed form.
 *
 * The engine is sliced out of index.html, so this tests the code that ships.
 * Run with:
 *
 *   npm test
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(join(HERE, 'index.html'), 'utf8');

// COUPLING: the slice is located by these two literal markers in index.html.
const START = '/* ------------------------------------------------------- forcing engine';
const END = '/* --------------------------------------------------------------- state */';
const start = html.indexOf(START);
const end = html.indexOf(END);
if (start < 0 || end < 0 || end <= start) {
  console.error(
    `Could not find the forcing engine in index.html.\n` +
      `  start marker ${start < 0 ? 'MISSING' : 'ok'}\n  end marker   ${end < 0 ? 'MISSING' : 'ok'}`,
  );
  process.exit(1);
}
const E = eval(
  html.slice(start, end) +
    '; ({ ZETA, EDGE_FC, forcingCoeffs, harmonicCount, transfer, evalSeries, seriesPeak, steadyState })',
);

let failures = 0;
const pass = (ok, msg) => {
  if (!ok) failures++;
  console.log((ok ? '  PASS  ' : '  FAIL  ') + msg);
};
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const amplification = (waveform, fF, edge = E.EDGE_FC) => {
  const c = E.forcingCoeffs(waveform, fF, edge, E.harmonicCount(waveform, fF, 5));
  return E.steadyState(c, fF, 1, E.ZETA).peak;
};

console.log('Forcing:');
{
  const c = E.forcingCoeffs('saw', 0.3, 0, 50);
  pass(c.every(([re, im], i) => near(Math.hypot(re, im), 1 / (i + 1), 1e-12)),
    'ideal sawtooth harmonics have heights 1/n');
  // Against the closed form: -sum sin(n t)/n = (t - pi)/2 on (0, 2 pi).
  const big = E.forcingCoeffs('saw', 0.3, 0, 4000);
  const worst = Math.max(...[0.5, 1.5, 3, 4.5, 5.8].map((t) => Math.abs(E.evalSeries(big, t) - (t - Math.PI) / 2)));
  pass(worst < 2e-3, `ideal sawtooth matches the rising ramp away from its drop (worst ${worst.toExponential(1)})`);
  const soft = E.forcingCoeffs('saw', 0.4, 3, 40);
  const ratio = (n) => (1 / n) / (1 + ((n * 0.4) / 3) ** 2);
  pass(soft.every(([re, im], i) => near(Math.hypot(re, im), ratio(i + 1) / ratio(1), 1e-12)),
    'softened harmonics are 1/n through a two-pole low-pass, fundamental 1');
  const sine = E.forcingCoeffs('sine', 0.4, 3, 40);
  pass(sine.length === 1 && near(sine[0][0], soft[0][0], 1e-15) && near(sine[0][1], soft[0][1], 1e-15),
    'the sine is exactly the sawtooth\'s fundamental');
}

console.log('Transfer function:');
for (const w of [0, 0.5, 1, 2, 6]) {
  const [re, im] = E.transfer(w, E.ZETA);
  const mag = 1 / Math.sqrt((1 - w * w) ** 2 + (2 * E.ZETA * w) ** 2);
  pass(near(Math.hypot(re, im), mag, 1e-12), `|H(${w})| = ${mag.toFixed(4)}`);
}
pass(near(amplification('sine', 1), 1 / (2 * E.ZETA), 1e-3), `sine at f1: Amplification 1/(2 zeta) = ${1 / (2 * E.ZETA)}`);
pass(near(amplification('sine', 0.5), 1 / (1 - 0.25), 5e-3), 'sine at f1/2: Amplification 1/(1 - 1/4), to within damping');

console.log('Acceptance:');
{
  const sineFar = Math.max(...[0.15, 0.3, 0.5, 0.7, 1.4, 1.5].map((f) => amplification('sine', f)));
  pass(amplification('sine', 1) > 9 && sineFar < 2.1, `sine: large only near f1 (10 there, at most ${sineFar.toFixed(2)} elsewhere)`);
  for (const n of [2, 3, 4]) {
    const on = amplification('saw', 1 / n), off = amplification('saw', 1 / (n + 0.5)), sine = amplification('sine', 1 / n);
    pass(on > 3 * sine && on > 1.4 * off,
      `sawtooth at f1/${n}: ${on.toFixed(2)} against sine ${sine.toFixed(2)}, falling to ${off.toFixed(2)} at f1/${n + 0.5}`);
  }
  // The third harmonic's peak must be wide enough to find by hand: above half
  // its height over at least 0.02 f1 of slider.
  const pk = amplification('saw', 1 / 3);
  let width = 0;
  for (let f = 0.30; f <= 0.37; f += 0.0005) if (amplification('saw', f) > 0.5 * (pk + amplification('saw', 0.3))) width += 0.0005;
  pass(width > 0.02, `the f1/3 peak spans ${width.toFixed(3)} f1 of slider`);
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
