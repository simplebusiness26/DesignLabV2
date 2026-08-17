import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function projectRoot() {
  return ROOT;
}

export function loadConfig() {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'designlab.config.json'), 'utf8'));
  raw.models.worker = process.env.DESIGNLAB_WORKER_MODEL || raw.models.worker;
  raw.models.reasoning = process.env.DESIGNLAB_REASONING_MODEL || raw.models.reasoning;
  raw.models.visual = process.env.DESIGNLAB_VISUAL_MODEL || raw.models.visual;
  return raw;
}
