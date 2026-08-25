import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function sha256File(file) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
}

function requireFile(file, label) {
  if (!fs.existsSync(file)) throw new Error(`${label} is missing: ${file}`);
}

function copyLockedReference({ run, lockDir, stage, persona, filename }) {
  const source = path.join(run, 'rounds', stage, persona, filename);
  requireFile(source, `${stage} ${filename}`);
  const stageDir = path.join(lockDir, stage);
  fs.mkdirSync(stageDir, { recursive: true });
  const destination = path.join(stageDir, filename);
  fs.copyFileSync(source, destination);
  return {
    stage,
    persona,
    kind: filename === 'artifact.html' ? 'html' : 'spec',
    file: path.relative(lockDir, destination),
    sha256: sha256File(destination),
    bytes: fs.statSync(destination).size
  };
}

export function removeDesignLock(run) {
  fs.rmSync(path.join(run, 'design-lock'), { recursive: true, force: true });
}

export function createDesignLock(run, selections) {
  const architecture = selections?.architecture;
  const ux = selections?.ux;
  const ui = selections?.ui;
  if (!architecture || !ux || !ui) {
    throw new Error('Architecture, UX and UI winners must all be selected before the design can be locked.');
  }

  const lockDir = path.join(run, 'design-lock');
  removeDesignLock(run);
  fs.mkdirSync(lockDir, { recursive: true });

  const references = [];
  for (const [stage, persona] of [['architecture', architecture], ['ux', ux], ['ui', ui]]) {
    references.push(copyLockedReference({ run, lockDir, stage, persona, filename: 'artifact.html' }));
    references.push(copyLockedReference({ run, lockDir, stage, persona, filename: 'spec.json' }));
  }

  const manifest = {
    schemaVersion: 1,
    kind: 'DESIGN_LOCK',
    immutable: true,
    createdAt: new Date().toISOString(),
    selections: { architecture, ux, ui },
    precedence: {
      structure: 'architecture/artifact.html + architecture/spec.json',
      interaction: 'ux/artifact.html + ux/spec.json',
      visual: 'ui/artifact.html + ui/spec.json',
      capabilityChanges: 'human feature decisions only'
    },
    rules: [
      'After UI selection, creative redesign is over.',
      'Locked HTML artifacts are implementation references, not inspiration.',
      'Specs explain the artifacts but do not replace them.',
      'Implementation may adapt code architecture, never the approved product design merely for convenience.',
      'Any unavoidable fidelity exception must be explicit and evidence-backed; it may not be silently redesigned.'
    ],
    references
  };

  const manifestFile = path.join(lockDir, 'manifest.json');
  fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(lockDir, 'DESIGN_LOCK.md'), `# Design Lock\n\nThe product owner selected these artifacts. They are immutable implementation references.\n\n**After this point, design is over.** The implementation agent is a reproduction engineer, not a new contestant.\n\n## Precedence\n\n- Architecture HTML/spec: structure, hierarchy, navigation and screen boundaries.\n- UX HTML/spec: behavior, interaction, flow, state transitions and gestures.\n- UI HTML/spec: visual appearance, component anatomy, typography, spacing, color, shape, density, chrome, motion treatment and integration presentation.\n- Human feature decisions: the only authority for adding, altering or removing product capability.\n\nIf implementation becomes difficult, refactor the code. Do not replace the selected design with an easier one.\n`);
  return { lockDir, manifestFile, manifest };
}

export function verifyDesignLock(manifestFile) {
  requireFile(manifestFile, 'Design lock manifest');
  const lockDir = path.dirname(manifestFile);
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (manifest.kind !== 'DESIGN_LOCK' || manifest.immutable !== true) throw new Error('Invalid design lock manifest.');
  for (const reference of manifest.references || []) {
    const file = path.join(lockDir, reference.file);
    requireFile(file, `Locked ${reference.stage} ${reference.kind}`);
    const actual = sha256File(file);
    if (actual !== reference.sha256) {
      throw new Error(`DESIGN LOCK VIOLATION: ${reference.file} changed after selection.`);
    }
  }
  return manifest;
}

export function lockedReferencePaths(manifestFile) {
  const manifest = verifyDesignLock(manifestFile);
  const lockDir = path.dirname(manifestFile);
  const find = (stage, kind) => {
    const ref = manifest.references.find(x => x.stage === stage && x.kind === kind);
    if (!ref) throw new Error(`Design lock is missing ${stage} ${kind}.`);
    return path.join(lockDir, ref.file);
  };
  return {
    manifestFile,
    lockDir,
    architectureHtml: find('architecture', 'html'),
    architectureSpec: find('architecture', 'spec'),
    uxHtml: find('ux', 'html'),
    uxSpec: find('ux', 'spec'),
    uiHtml: find('ui', 'html'),
    uiSpec: find('ui', 'spec')
  };
}
