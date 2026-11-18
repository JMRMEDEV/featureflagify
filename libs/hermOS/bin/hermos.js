#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const version = readFileSync(join(root, 'VERSION'), 'utf8').trim();
const [command, destination, ...args] = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];

if (command !== 'init' || !destination || !option('--name')) {
  console.error('Usage: hermos init <planning-dir> --name <product name> [--repos web,api]');
  process.exit(1);
}
const target = resolve(destination);
if (existsSync(join(target, '.hermos', 'manifest.json'))) {
  console.error(`Refusing to overwrite existing HermOS adoption: ${target}`);
  process.exit(1);
}
mkdirSync(target, { recursive: true });
cpSync(join(root, 'templates'), target, { recursive: true, errorOnExist: true });
const product = option('--name');
const repos = (option('--repos') || 'app').split(',').map((id) => id.trim()).filter(Boolean);
const replace = (path) => writeFileSync(path, readFileSync(path, 'utf8')
  .replaceAll('{{PRODUCT_NAME}}', product)
  .replaceAll('{{HERMOS_VERSION}}', version));
replace(join(target, 'README.md'));
replace(join(target, 'delivery', 'WEEKLY-REPORT.md'));
mkdirSync(join(target, '.hermos', 'scripts'), { recursive: true });
writeFileSync(join(target, '.hermos', 'manifest.json'), `${JSON.stringify({
  schemaVersion: 1, hermosVersion: version, project: product,
  installedAt: new Date().toISOString().slice(0, 10), migrations: [],
}, null, 2)}\n`);
writeFileSync(join(target, '.hermos', 'scripts', 'audit.js'), `import { existsSync } from 'node:fs';\nimport { join, dirname } from 'node:path';\nimport { fileURLToPath } from 'node:url';\nimport { spawnSync } from 'node:child_process';\nconst required = ['README.md', 'docs/INDEX.md', 'docs/VISION.md', 'user-stories/README.md', 'user-stories/INDEX.md', 'user-stories/TEMPLATE.md', 'tasks/INDEX.md', 'tasks/TEMPLATE.md', 'delivery/WEEKLY-REPORT.md', '.hermos/scripts/check-docs.js', '.hermos/manifest.json'];\nconst missing = required.filter((file) => !existsSync(join(process.cwd(), file)));\nif (missing.length) { console.error('HermOS audit failed; missing: ' + missing.join(', ')); process.exit(1); }\nconsole.log('HermOS audit passed.');\nconst checkDocs = join(dirname(fileURLToPath(import.meta.url)), 'check-docs.js');\nconst result = spawnSync(process.execPath, [checkDocs, ...process.argv.slice(2)], { stdio: 'inherit' });\nprocess.exit(result.status ?? 1);\n`);
writeFileSync(join(target, `${product.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.code-workspace`), `${JSON.stringify({ folders: [{ name: '📋 planning', path: '.' }, ...repos.map((id) => ({ name: `📦 ${id}`, path: `../${id}` }))], settings: { 'files.exclude': { '**/node_modules': true, '**/dist': true } } }, null, 2)}\n`);
console.log(`Initialized HermOS ${version} in ${target}`);
