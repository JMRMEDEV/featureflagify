#!/usr/bin/env node
/**
 * check-docs.js — generalized, read-only documentation consistency validator.
 *
 * Scaffolded into every HermOS adoption. PURE VALIDATOR: it never writes.
 * It is the companion to any task-stats generator an adoption may add (that
 * generator OWNS the generated task stat blocks; this validator owns everything
 * the generator does NOT).
 *
 * It is GENERALIZED — it hardcodes no project-specific ID prefixes, domains, or
 * subprojects. Story IDs are discovered by scanning user-stories/*.md for
 * "## <PREFIX>-<N>:" sections where <PREFIX> is any uppercase token.
 *
 * Four checks:
 *   1. user-stories/INDEX.md lookup rows  <->  domain-file "## ID:" sections
 *      (reports missing story rows and orphan rows with no section).
 *   2. Hand-maintained story completion stat tables (user-stories/INDEX.md and
 *      user-stories/README.md) match the live INDEX row status glyphs. This
 *      check is SKIPPED when the adoption does not track status glyphs in its
 *      INDEX (no glyph column) — many adoptions legitimately do not.
 *   3. Task "Stories" / "Related Stories" IDs exist in the story INDEX.
 *   4. Relative markdown links in docs resolve to real files.
 *
 * Usage:
 *   node .hermos/scripts/check-docs.js            # report + exit 1 on any problem
 *   node .hermos/scripts/check-docs.js --quiet    # only print on failure
 *
 * Exit code: 0 = all consistent, 1 = at least one inconsistency.
 *
 * Forgiving of known-intentional patterns: stories whose INDEX title contains
 * "merged into" / "→ see" / "~~...~~" / "deprecated" / "replaced by" are allowed
 * to lack a full domain section.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Run from the adoption root (process.cwd()), so this works regardless of where
// the script physically lives inside the adoption.
const ROOT = process.cwd();
const STORIES_DIR = join(ROOT, 'user-stories');
const TASKS_DIR = join(ROOT, 'tasks');
const DOCS_DIR = join(ROOT, 'docs');
const quiet = process.argv.includes('--quiet');

const problems = [];
const fail = (msg) => problems.push(msg);

const STATUS_GLYPHS = ['✅', '🔧', '⬚'];
const SCOPES = ['MVP', 'Post-MVP', 'Premium'];
const ID_RE = /\b([A-Z]{2,}-\d+)\b/;
const isGlyph = (s) => STATUS_GLYPHS.includes(s);
const scopeOf = (s) => (SCOPES.includes(s) ? s : null);
const isRedirected = (title) =>
  /merged into|→ see|~~|deprecated|replaced by/i.test(title || '');

// ---------------------------------------------------------------------------
// Parse user-stories/INDEX.md lookup rows.
//
// Rows are pipe-delimited and begin with an ID token. Columns vary across
// adoptions (some include a status-glyph column, some do not; column order may
// differ). Rather than assume positions, we classify each cell:
//   - the ID is the leading "<PREFIX>-<N>" token
//   - the scope is whichever cell equals MVP / Post-MVP / Premium
//   - the status is whichever cell is a status glyph (may be absent)
//   - the file reference is whichever cell contains ".md"
//   - the title is the longest remaining free-text cell
// ---------------------------------------------------------------------------
function parseStoryIndex() {
  const indexPath = join(STORIES_DIR, 'INDEX.md');
  if (!existsSync(indexPath)) {
    fail('user-stories/INDEX.md not found');
    return { rows: [], hasStatusColumn: false };
  }
  const text = readFileSync(indexPath, 'utf8');
  const rows = [];
  let hasStatusColumn = false;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    // Must start with an ID followed by a pipe (table or code-block lookup row).
    const lead = line.match(/^([A-Z]{2,}-\d+)\s*\|/);
    if (!lead) continue;
    const id = lead[1];
    const cells = line.split('|').map((c) => c.trim());
    // cells[0] is the ID (possibly with trailing spaces already trimmed).
    const rest = cells.slice(1);

    let scope = null;
    let status = null;
    let file = '';
    const freeText = [];
    for (const cell of rest) {
      if (!cell) continue;
      if (!scope && scopeOf(cell)) { scope = cell; continue; }
      if (!status && isGlyph(cell)) { status = cell; hasStatusColumn = true; continue; }
      if (!file && cell.includes('.md')) { file = cell.split(':')[0].trim(); continue; }
      // Priority tokens (P0..P3) and subproject lists are not titles.
      if (/^P\d$/.test(cell)) continue;
      freeText.push(cell);
    }
    // Title: prefer the longest free-text cell (scope/status/file already removed).
    const title = freeText.sort((a, b) => b.length - a.length)[0] || '';
    rows.push({ id, scope, status, title, file });
  }
  return { rows, hasStatusColumn };
}

// Collect every story ID that has a real "## ID: ..." section in a domain file.
function collectDomainStoryIds() {
  const ids = new Map(); // id -> filename
  if (!existsSync(STORIES_DIR)) return ids;
  for (const f of readdirSync(STORIES_DIR)) {
    if (!f.endsWith('.md') || f === 'INDEX.md' || f === 'README.md' || f === 'TEMPLATE.md') continue;
    const text = readFileSync(join(STORIES_DIR, f), 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^##\s+([A-Z]{2,}-\d+):/);
      if (m) ids.set(m[1], f);
    }
  }
  return ids;
}

// ---------------------------------------------------------------------------
// CHECK 1: INDEX rows <-> domain story sections
// ---------------------------------------------------------------------------
function checkStoryIndexVsFiles(index, domainIds) {
  for (const r of index.rows) {
    if (!domainIds.has(r.id) && !isRedirected(r.title)) {
      fail(`story INDEX row ${r.id} has no "## ${r.id}:" section in a domain file (expected in ${r.file || '?'})`);
    }
  }
  const indexIds = new Set(index.rows.map((r) => r.id));
  for (const [id, file] of domainIds) {
    if (!indexIds.has(id)) {
      fail(`story ${id} (## section in ${file}) is missing from user-stories/INDEX.md lookup`);
    }
  }
}

// ---------------------------------------------------------------------------
// CHECK 2: hand-maintained story stat tables match live INDEX glyph counts.
// Skipped entirely when the adoption has no status-glyph column.
// ---------------------------------------------------------------------------
function liveStoryCounts(index) {
  const byScope = {};
  for (const s of [...SCOPES, 'All']) byScope[s] = { '✅': 0, '🔧': 0, '⬚': 0 };
  for (const r of index.rows) {
    if (!isGlyph(r.status)) {
      fail(`story ${r.id} has unrecognized/missing status glyph "${r.status ?? ''}" in INDEX`);
      continue;
    }
    const scope = scopeOf(r.scope);
    if (scope) byScope[scope][r.status] += 1;
    byScope.All[r.status] += 1;
  }
  return byScope;
}

// Extract "| Scope | a | b | c | total |"-style rows from a stat-table region.
function extractStatRows(text, headingRegex) {
  const lines = text.split('\n');
  const start = lines.findIndex((l) => headingRegex.test(l));
  if (start === -1) return null;
  const out = {};
  for (let i = start; i < lines.length; i += 1) {
    const l = lines[i];
    if (i > start && /^#{1,6}\s/.test(l)) break; // next heading ends the region
    const cells = l.split('|').map((c) => c.replace(/\*\*/g, '').trim()).filter((c) => c !== '');
    if (cells.length < 4) continue;
    const label = cells[0];
    const key =
      /Post-MVP/i.test(label) ? 'Post-MVP' :
      /MVP/i.test(label) ? 'MVP' :
      /Premium/i.test(label) ? 'Premium' :
      /^All$/i.test(label) ? 'All' : null;
    if (!key) continue;
    const nums = cells.slice(1).map((c) => Number(c)).filter((n) => !Number.isNaN(n));
    out[key] = nums;
  }
  return out;
}

function checkStoryStatTables(index) {
  if (!index.hasStatusColumn) return; // adoption does not track status glyphs
  const live = liveStoryCounts(index);
  const indexPath = join(STORIES_DIR, 'INDEX.md');
  const readmePath = join(STORIES_DIR, 'README.md');
  const indexText = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';
  const readmeText = existsSync(readmePath) ? readFileSync(readmePath, 'utf8') : '';

  // INDEX "Completion Stats": only validate if the table exists.
  const idxStats = extractStatRows(indexText, /Completion Stats/i);
  if (idxStats) {
    for (const s of [...SCOPES, 'All']) {
      const row = idxStats[s];
      const L = live[s];
      if (!row) { fail(`INDEX Completion Stats missing "${s}" row`); continue; }
      const total = L['✅'] + L['🔧'] + L['⬚'];
      const with3 = [L['✅'], L['🔧'], L['⬚'], total];
      const with2 = [L['✅'], L['⬚'], total];
      if (row.join(',') !== with3.join(',') && row.join(',') !== with2.join(',')) {
        fail(`INDEX Completion Stats "${s}" = [${row}] but live INDEX glyphs give ✅${L['✅']}/🔧${L['🔧']}/⬚${L['⬚']} (total ${total})`);
      }
    }
  }

  // README "Completion Summary": only validate if the table exists.
  const rmStats = extractStatRows(readmeText, /Completion Summary/i);
  if (rmStats) {
    for (const s of [...SCOPES, 'All']) {
      const row = rmStats[s];
      const L = live[s];
      if (!row) { fail(`README Completion Summary missing "${s}" row`); continue; }
      const total = L['✅'] + L['🔧'] + L['⬚'];
      const with3 = [L['✅'], L['🔧'], L['⬚'], total];
      const with2 = [L['✅'], L['⬚'], total];
      if (row.join(',') !== with3.join(',') && row.join(',') !== with2.join(',')) {
        fail(`README Completion Summary "${s}" = [${row}] but live INDEX glyphs give ✅${L['✅']}/🔧${L['🔧']}/⬚${L['⬚']} (total ${total})`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// CHECK 3: task "Stories" / "Related Stories" IDs exist in the story INDEX.
// ---------------------------------------------------------------------------
function checkTaskStoryRefs(index) {
  if (!existsSync(TASKS_DIR)) return;
  const known = new Set(index.rows.map((r) => r.id));
  if (known.size === 0) return; // nothing to validate against
  for (const f of readdirSync(TASKS_DIR)) {
    if (!f.endsWith('.md') || f === 'TEMPLATE.md') continue;
    const text = readFileSync(join(TASKS_DIR, f), 'utf8');
    // Match either a bullet "- **Stories**: ..." or a table row "| Stories | ... |".
    const m =
      text.match(/^-\s*\*\*(?:Related )?Stories\*\*:\s*(.+)$/m) ||
      text.match(/^\|\s*(?:Related )?Stories\s*\|\s*(.+?)\s*\|\s*$/m);
    if (!m) continue;
    const val = m[1].trim();
    if (val === '—' || val === '-' || val === '' || /\{\{/.test(val)) continue;
    const ids = val.match(/[A-Z]{2,}-\d+/g) || [];
    for (const id of ids) {
      if (!known.has(id)) fail(`${f}: Stories references unknown story ID ${id}`);
    }
  }
}

// ---------------------------------------------------------------------------
// CHECK 4: relative markdown links in docs resolve to real files.
// ---------------------------------------------------------------------------
function checkMarkdownLinks() {
  const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;
  const isCheckableRelPath = (raw) => {
    const t = raw.trim();
    if (!t) return false;
    if (/^(https?:|mailto:|tel:|#)/.test(t)) return false; // external / anchor
    if (t.includes('${') || t.includes('{{')) return false; // template / placeholder
    const path = t.split('#')[0];
    if (!path) return false;
    if (!path.includes('/') && !/\.[a-z0-9]+$/i.test(path)) return false;
    return true;
  };
  const scanFile = (full) => {
    const text = readFileSync(full, 'utf8');
    let m;
    while ((m = linkRe.exec(text))) {
      if (!isCheckableRelPath(m[1])) continue;
      const target = m[1].trim().split('#')[0];
      if (!existsSync(resolve(dirname(full), target))) {
        fail(`${full.replace(ROOT + '/', '')}: broken relative link → ${m[1]}`);
      }
    }
  };
  const walk = (dir, depth = 0) => {
    if (depth > 4 || !existsSync(dir)) return;
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (['node_modules', '.git', '.githooks', 'dist'].includes(e.name)) continue;
      const full = join(dir, e.name);
      if (e.isDirectory()) { walk(full, depth + 1); continue; }
      if (e.name.endsWith('.md')) scanFile(full);
    }
  };
  walk(DOCS_DIR);
  for (const base of [ROOT, STORIES_DIR, TASKS_DIR]) {
    if (!existsSync(base)) continue;
    for (const e of readdirSync(base, { withFileTypes: true })) {
      if (e.isFile() && e.name.endsWith('.md')) scanFile(join(base, e.name));
    }
  }
}

// ---------------------------------------------------------------------------
function main() {
  const index = parseStoryIndex();
  const domainIds = collectDomainStoryIds();
  checkStoryIndexVsFiles(index, domainIds);
  checkStoryStatTables(index);
  checkTaskStoryRefs(index);
  checkMarkdownLinks();

  if (problems.length) {
    console.error(`check-docs: ${problems.length} inconsistency(ies) found:`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }
  if (!quiet) {
    console.log(
      `check-docs OK: ${index.rows.length} story index row(s) consistent with domain files; ` +
      `${index.hasStatusColumn ? 'stat tables in sync; ' : ''}task→story refs + markdown links valid.`,
    );
  }
}

main();
