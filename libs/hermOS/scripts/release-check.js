import { readFileSync } from 'node:fs';
const version = readFileSync('VERSION', 'utf8').trim();
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const changelog = readFileSync('CHANGELOG.md', 'utf8');
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('VERSION must be SemVer.');
if (pkg.version !== version) throw new Error('package.json version must equal VERSION.');
if (!changelog.includes(`## [${version}]`)) throw new Error('CHANGELOG needs a release heading for VERSION.');
console.log(`Release check passed for ${version}.`);
