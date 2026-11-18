import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const required = ['README.md', 'docs/INDEX.md', 'docs/VISION.md', 'user-stories/README.md', 'user-stories/INDEX.md', 'user-stories/TEMPLATE.md', 'tasks/INDEX.md', 'tasks/TEMPLATE.md', 'delivery/WEEKLY-REPORT.md', '.hermos/scripts/check-docs.js', '.hermos/manifest.json'];
const missing = required.filter((file) => !existsSync(join(process.cwd(), file)));
if (missing.length) { console.error('HermOS audit failed; missing: ' + missing.join(', ')); process.exit(1); }
console.log('HermOS audit passed.');
const checkDocs = join(dirname(fileURLToPath(import.meta.url)), 'check-docs.js');
const result = spawnSync(process.execPath, [checkDocs, ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(result.status ?? 1);
