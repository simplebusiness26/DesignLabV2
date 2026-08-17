import fs from 'node:fs';
import path from 'node:path';

export function ensureDir(dir) { fs.mkdirSync(dir, { recursive: true }); return dir; }
export function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }
export function readJson(file) { return JSON.parse(fs.readFileSync(file, 'utf8')); }
export function exists(file) { return fs.existsSync(file); }
export function slug(input) { return path.basename(path.resolve(input)).replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase(); }
export function latestRunRoot(base, appSlug) {
  const dir = path.join(base, 'runs', appSlug);
  if (!fs.existsSync(dir)) return null;
  const items = fs.readdirSync(dir).filter(n => fs.statSync(path.join(dir,n)).isDirectory()).sort();
  return items.length ? path.join(dir, items.at(-1)) : null;
}
