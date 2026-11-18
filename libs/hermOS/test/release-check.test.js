import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

test('release metadata is consistent', () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const version = readFileSync(resolve(root, 'VERSION'), 'utf8').trim();
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  const changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
  assert.match(version, /^\d+\.\d+\.\d+$/);
  assert.equal(pkg.version, version);
  assert.match(changelog, new RegExp(`## \\[${version}\\]`));
});
