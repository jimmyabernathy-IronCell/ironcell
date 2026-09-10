// Jimmy's base structure, locked.
//
// Julien, 2026-09-10: "his main operations and desired integrations and processes are the
// base structure that isn't touched." This script is how that is checked instead of hoped.
//
// It pulls every statement that touches Jimmy's own systems out of every order-taking and
// signup page, and compares them with the approved snapshot in ops/base-contract.json:
//
//   order-number   generateOrderNumber() / orderNumber() - HIS six-digit format
//   sheet          every statement that calls his Apps Script (order row, newsletter row,
//                  welcome/reta lookups, the popup's SHEET const and its use)
//   email          every Web3Forms fetch - key, recipient, subject line, from_name, body
//
// Whitespace is ignored. Any other change to any of those statements - a renamed sheet
// parameter, a reordered one, a new subject line, a second number format, a removed call,
// an added call - fails the check and prints the statement before and after.
//
// Lines that only feed OUR systems (ironcell-ingest, gtag/fbq/ttq) are not part of the
// contract and can change freely.
//
//   node ops/base-contract.mjs            check the working tree   (exit 1 on drift)
//   node ops/base-contract.mjs --live     check the published site (exit 1 on drift)
//   node ops/base-contract.mjs --write    re-approve the snapshot from the working tree
//
// --write is ONLY for a change Julien has relayed Jimmy's OK for. Put that approval in the
// commit message. Re-approving to make a red check go green is exactly the failure this
// file exists to stop.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SNAPSHOT = path.join(ROOT, 'ops', 'base-contract.json');
const LIVE_ORIGIN = 'https://ironcellresearch.com';

// Every page that takes an order or a signup. A new page that takes either belongs here.
const FILES = [
  'index.html', 'mvp.html', 'truetransformation.html',
  'amber/index.html', 'billy/index.html', 'carlos/index.html', 'chel/index.html',
  'davu/index.html', 'dro/index.html', 'dupree/index.html', 'merv/index.html', 'ray/index.html',
  'research-supplies/index.html', 'peptidecalculator/index.html',
  'welcome/index.html',
];

const EXEC = 'AKfycbwha_53kpXJWgZ6X94dM4d9NJcgwaGabxKWPMJpQYaXQqMWmgoTpgcw7RARBu0quJ6BQw/exec';
const ANCHORS = [
  { kind: 'order-number', re: /function\s+(generateOrderNumber|orderNumber)\s*\(/g },
  { kind: 'sheet', re: new RegExp(EXEC.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g') },
  { kind: 'sheet', re: /\bSHEET\s*\+/g },
  { kind: 'email', re: /api\.web3forms\.com\/submit/g },
];

// From `from`, walk forward to the end of the statement: the first `;` at depth 0, or, for a
// function declaration, the `}` that closes its body. Strings, template literals (including
// ${...} nesting), regex-free code and comments are respected.
function statementEnd(src, from, isFunction) {
  const stack = [];          // '(' '[' '{' '${' '`'
  let i = from;
  let sawBody = false;
  const top = () => stack[stack.length - 1];
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (top() === '`') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { stack.pop(); i++; continue; }
      if (c === '$' && n === '{') { stack.push('${'); i += 2; continue; }
      i++; continue;
    }
    if (c === '/' && n === '/') { const e = src.indexOf('\n', i); i = e < 0 ? src.length : e; continue; }
    if (c === '/' && n === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? src.length : e + 2; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; if (src[j] === '\n') break; j++; }
      i = j + 1; continue;
    }
    if (c === '`') { stack.push('`'); i++; continue; }
    if (c === '(' || c === '[') { stack.push(c); i++; continue; }
    if (c === '{') { stack.push('{'); if (isFunction && stack.length === 1) sawBody = true; i++; continue; }
    if (c === ')' || c === ']') { stack.pop(); i++; continue; }
    if (c === '}') {
      stack.pop();
      i++;
      if (isFunction && sawBody && stack.length === 0) return i;
      continue;
    }
    if (c === ';' && stack.length === 0 && !isFunction) return i + 1;
    if (c === '<' && src.startsWith('</script', i)) return i; // never run past the script
    i++;
  }
  return src.length;
}

function lineStart(src, idx) {
  const nl = src.lastIndexOf('\n', idx);
  let s = nl + 1;
  while (s < idx && (src[s] === ' ' || src[s] === '\t')) s++;
  return s;
}

const norm = (s) => s.replace(/\s+/g, ' ').trim();

// A mention in a comment is documentation, not plumbing.
function inComment(src, idx) {
  const ls = src.lastIndexOf('\n', idx) + 1;
  const head = src.slice(ls, idx).trimStart();
  if (head.startsWith('//') || head.startsWith('*') || head.startsWith('/*')) return true;
  if (head.includes('//') && !/['"`]/.test(head.slice(0, head.indexOf('//')))) return true;
  const open = src.lastIndexOf('/*', idx), close = src.lastIndexOf('*/', idx);
  return open > close;
}

export function extract(src) {
  const hits = [];
  for (const a of ANCHORS) {
    a.re.lastIndex = 0;
    let m;
    while ((m = a.re.exec(src))) {
      if (inComment(src, m.index)) continue;
      hits.push({ kind: a.kind, at: m.index, isFunction: a.kind === 'order-number' });
    }
  }
  hits.sort((x, y) => x.at - y.at);
  const blocks = [];
  let coveredTo = -1;
  for (const h of hits) {
    if (h.at < coveredTo) continue; // several anchors inside one statement = one block
    let start, end;
    if (h.isFunction) {
      start = h.at;
      end = statementEnd(src, start, true);
    } else {
      // Walk statement by statement from the start of the line until one contains the
      // anchor - `var t = new Image(); t.src = SHEET + ...` is two statements on one line.
      start = lineStart(src, h.at);
      for (;;) {
        end = statementEnd(src, start, false);
        if (end > h.at || end >= src.length) break;
        start = end;
        while (start < h.at && /\s/.test(src[start])) start++;
      }
    }
    const line = src.slice(0, start).split('\n').length;
    blocks.push({ kind: h.kind, line, text: norm(src.slice(start, end)) });
    coveredTo = end;
  }
  return blocks;
}

async function readSource(file, live) {
  if (!live) return fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/\r\n/g, '\n');
  const url = `${LIVE_ORIGIN}/${file.replace(/index\.html$/, '')}?cb=${Date.now()}`;
  const res = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return (await res.text()).replace(/\r\n/g, '\n');
}

function diffFile(file, want, got) {
  const out = [];
  const max = Math.max(want.length, got.length);
  for (let i = 0; i < max; i++) {
    const w = want[i], g = got[i];
    if (w && g && w.kind === g.kind && w.text === g.text) continue;
    if (w && !got.some((x) => x.text === w.text)) out.push(`  - REMOVED or CHANGED (${w.kind}, was near line ${w.line}):\n      ${w.text.slice(0, 600)}`);
    if (g && !want.some((x) => x.text === g.text)) out.push(`  + NEW or CHANGED (${g.kind}, line ${g.line}):\n      ${g.text.slice(0, 600)}`);
  }
  if (!out.length && want.length !== got.length) out.push(`  block count ${want.length} -> ${got.length}`);
  if (!out.length && want.map((b) => b.text).join('\n') !== got.map((b) => b.text).join('\n')) out.push('  same statements, different order');
  return out.length ? [`${file}:`, ...out] : [];
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const live = args.has('--live');
  const write = args.has('--write');
  if (live && write) throw new Error('--write only snapshots the working tree');

  const current = {};
  for (const f of FILES) current[f] = extract(await readSource(f, live));

  if (write) {
    const snap = { note: 'Approved snapshot of Jimmy\'s base structure. See ops/base-contract.mjs before changing.', files: current };
    fs.writeFileSync(SNAPSHOT, JSON.stringify(snap, null, 1) + '\n');
    const n = Object.values(current).reduce((a, b) => a + b.length, 0);
    console.log(`snapshot written: ${FILES.length} files, ${n} statements`);
    return;
  }

  const snap = JSON.parse(fs.readFileSync(SNAPSHOT, 'utf8')).files;
  const problems = [];
  for (const f of FILES) {
    if (!snap[f]) { problems.push(`${f}: not in the snapshot`); continue; }
    problems.push(...diffFile(f, snap[f], current[f]));
  }
  const n = Object.values(current).reduce((a, b) => a + b.length, 0);
  if (problems.length) {
    console.log(`BASE CONTRACT BROKEN (${live ? 'live site' : 'working tree'}). Jimmy's order/signup plumbing changed:\n`);
    console.log(problems.join('\n'));
    console.log('\nPut it back. If Jimmy approved this change (relayed by Julien), re-snapshot with --write and say so in the commit.');
    process.exit(1);
  }
  console.log(`OK - ${live ? 'live site' : 'working tree'} matches the approved base: ${FILES.length} files, ${n} statements (order numbers, sheet calls, order + signup emails).`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message || e); process.exit(2); });
}
