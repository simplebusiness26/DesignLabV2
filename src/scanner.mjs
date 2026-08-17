import fs from 'node:fs';
import path from 'node:path';

const IGNORE_DIRS = new Set(['.git','.idea','.vscode','node_modules','vendor','Pods','DerivedData','build','dist','.next','.gradle','coverage','.dart_tool','.expo']);
const SOURCE_EXTS = new Set(['.js','.jsx','.ts','.tsx','.mjs','.cjs','.kt','.kts','.java','.dart','.swift','.py','.rb','.go','.rs','.vue','.svelte']);
const ENTRY_NAMES = new Set(['index.js','index.ts','index.tsx','main.js','main.ts','main.tsx','main.dart','main.py','App.js','App.jsx','App.ts','App.tsx','Application.kt','MainActivity.kt','AppDelegate.swift']);

function walk(root) {
  const files = [], stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith('.') && ent.name !== '.env.example') continue;
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) { if (!IGNORE_DIRS.has(ent.name)) stack.push(full); }
      else files.push(full);
    }
  }
  return files;
}

function normalize(root, full) { return path.relative(root, full).split(path.sep).join('/'); }

function extractRefs(text) {
  const refs = new Set();
  const patterns = [
    /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:import)\(\s*['"]([^'"]+)['"]\s*\)/g,
    /(?:from|import)\s+([A-Za-z0-9_\.]+)/g
  ];
  for (const rx of patterns) { let m; while ((m = rx.exec(text))) refs.add(m[1]); }
  return [...refs];
}

function resolveLocal(fromRel, ref, allSet) {
  if (!ref.startsWith('.')) return null;
  const fromDir = path.posix.dirname(fromRel);
  const base = path.posix.normalize(path.posix.join(fromDir, ref));
  const candidates = [base];
  for (const ext of SOURCE_EXTS) candidates.push(base + ext);
  for (const ext of SOURCE_EXTS) candidates.push(path.posix.join(base, 'index' + ext));
  return candidates.find(c => allSet.has(c)) ?? null;
}

function detectRoots(root, files, allSet) {
  const roots = [];
  for (const f of files) if (ENTRY_NAMES.has(path.posix.basename(f))) roots.push(f);
  if (allSet.has('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
      for (const value of [pkg.main, pkg.module, pkg['react-native']]) {
        if (typeof value !== 'string') continue;
        const clean = value.replace(/^\.\//, '');
        if (allSet.has(clean)) roots.push(clean);
        else for (const ext of SOURCE_EXTS) if (allSet.has(clean + ext)) roots.push(clean + ext);
      }
    } catch {}
  }
  return [...new Set(roots)];
}

export function scanRepository(rootInput) {
  const root = path.resolve(rootInput);
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`App path does not exist: ${root}`);
  const allFull = walk(root), all = allFull.map(f => normalize(root, f)), allSet = new Set(all);
  const sources = all.filter(f => SOURCE_EXTS.has(path.posix.extname(f)));
  const graph = {}, parseErrors = [];
  for (const rel of sources) {
    try {
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      graph[rel] = extractRefs(text).map(ref => resolveLocal(rel, ref, allSet)).filter(Boolean);
    } catch (error) { parseErrors.push({ file: rel, error: String(error.message || error) }); }
  }
  const roots = detectRoots(root, all, allSet).filter(f => graph[f] || SOURCE_EXTS.has(path.posix.extname(f)));
  const reachable = new Set(), queue = roots.filter(r => graph[r]);
  while (queue.length) {
    const cur = queue.shift(); if (reachable.has(cur)) continue; reachable.add(cur);
    for (const next of graph[cur] || []) if (!reachable.has(next)) queue.push(next);
  }
  const inbound = Object.fromEntries(sources.map(f => [f, 0]));
  for (const deps of Object.values(graph)) for (const d of deps) if (d in inbound) inbound[d]++;
  const orphanCandidates = sources.filter(f => !reachable.has(f) && (inbound[f] || 0) === 0 && !ENTRY_NAMES.has(path.posix.basename(f)));
  return {
    schemaVersion: 1, scannedAt: new Date().toISOString(), root,
    counts: { files: all.length, sourceFiles: sources.length, reachableSourceFiles: reachable.size, orphanCandidates: orphanCandidates.length },
    entryCandidates: roots, files: all, sourceFiles: sources, dependencyGraph: graph,
    reachableSourceFiles: [...reachable].sort(), orphanCandidates: orphanCandidates.sort(), parseErrors,
    notes: [
      'Reachability is conservative and based on static local references plus entry-point heuristics.',
      'Dynamic routing, reflection, dependency injection, generated routes, runtime feature flags and native manifests can require model verification.',
      'Orphan candidate means unreferenced by this static scan, not proven dead code.'
    ]
  };
}
