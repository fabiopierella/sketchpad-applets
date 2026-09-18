/**
 * Run every tool's verify.mjs.
 *
 * Tools are discovered from tools/manifest.json rather than by globbing, so a
 * tool that is not in the manifest - and therefore never shown or vendored -
 * is not silently tested either. A tool without a verify.mjs is skipped, not
 * failed: not every applet has maths worth checking.
 */
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(ROOT, 'tools', 'manifest.json'), 'utf8'));
const slugs = manifest.tools ?? [];

let ran = 0;
let failed = 0;

for (const slug of slugs) {
  const script = join(ROOT, 'tools', slug, 'verify.mjs');
  if (!existsSync(script)) {
    console.log(`\n--- ${slug}: no verify.mjs, skipped`);
    continue;
  }
  console.log(`\n--- ${slug} ---`);
  const r = spawnSync(process.execPath, [script], { stdio: 'inherit' });
  ran++;
  if (r.status !== 0) failed++;
}

console.log(
  failed === 0
    ? `\n${ran} tool(s) verified, all passed.`
    : `\n${failed} of ${ran} tool(s) FAILED.`,
);
process.exit(failed === 0 ? 0 : 1);
