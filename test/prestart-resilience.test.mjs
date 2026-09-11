import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const script = await readFile(new URL('../scripts/fetch-design-assets.mjs', import.meta.url), 'utf8');
const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const gitignore = await readFile(new URL('../.gitignore', import.meta.url), 'utf8');

test('the prestart asset fetch cannot stop the server from booting', () => {
  assert.equal(pkg.scripts.prestart, 'node scripts/fetch-design-assets.mjs');
  // Every third-party fetch is behind its own guard; none of them is awaited
  // at top level without a catch, and the script pins its exit code to 0.
  assert.doesNotMatch(script, /^const baseMeta=await ensurePng/m);
  assert.match(script, /try\{const baseMeta=await ensurePng\(BASE\)/);
  assert.match(script, /process\.exitCode=0/);
  // Each of the three fetch phases reports its own failure and continues.
  for (const phase of [/design base unavailable/, /spring scene unavailable/, /autumn scene unavailable/]) {
    assert.match(script, phase);
  }
  assert.match(script, /gradient-only scenes/);
});

test('generated scene masters are not committed to the repository', () => {
  assert.match(gitignore, /public\/assets\/scenes\//);
  assert.match(gitignore, /public\/assets\/\*\.png/);
});
