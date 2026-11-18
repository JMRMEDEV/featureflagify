import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('templates define the canonical vision and user-story layers and the scaffold audits them', () => {
  assert.equal(existsSync(join(root, 'templates', 'docs', 'VISION.md')), true,
    'docs/VISION.md should exist');
  for (const file of ['user-stories/README.md', 'user-stories/INDEX.md',
    'user-stories/TEMPLATE.md']) {
    assert.equal(existsSync(join(root, 'templates', file)), true, `${file} should exist`);
  }
  assert.equal(existsSync(join(root, 'templates', 'stories')), false);
  assert.match(readFileSync(join(root, 'templates', 'README.md'), 'utf8'), /docs\/VISION\.md/);
  assert.match(readFileSync(join(root, 'templates', 'docs', 'INDEX.md'), 'utf8'), /docs\/VISION\.md/);
  assert.match(readFileSync(join(root, 'templates', 'README.md'), 'utf8'), /user-stories\/INDEX\.md/);
  assert.match(readFileSync(join(root, 'templates', 'tasks', 'TEMPLATE.md'), 'utf8'), /Stories/);
  assert.match(readFileSync(join(root, 'bin', 'hermos.js'), 'utf8'),
    /docs\/VISION\.md.*user-stories\/README\.md.*user-stories\/INDEX\.md.*user-stories\/TEMPLATE\.md/);
});

test('the documentation-consistency validator is scaffolded and wired into audit', () => {
  assert.equal(existsSync(join(root, 'templates', '.hermos', 'scripts', 'check-docs.js')), true,
    'templates/.hermos/scripts/check-docs.js should exist');
  const checkDocs = readFileSync(join(root, 'templates', '.hermos', 'scripts', 'check-docs.js'), 'utf8');
  // Generalized: discovers IDs via "## <PREFIX>-<N>:" and hardcodes no Hermes prefixes.
  assert.match(checkDocs, /\^##\\s\+\(\[A-Z\]\{2,\}-\\d\+\):/);
  assert.match(checkDocs, /--quiet/);
  assert.doesNotMatch(checkDocs, /\b(AUTH|BRD|CRD|LST|PRJ|ORG)-\d/,
    'validator must not hardcode Hermes-specific story prefixes');
  // Audit requires check-docs and chains into it.
  const bin = readFileSync(join(root, 'bin', 'hermos.js'), 'utf8');
  assert.match(bin, /\.hermos\/scripts\/check-docs\.js/);
  assert.match(bin, /HermOS audit passed\./);
  assert.match(bin, /spawnSync/);
});
