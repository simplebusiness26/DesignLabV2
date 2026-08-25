import fs from 'node:fs';
import path from 'node:path';
import { scanRepository } from './scanner.mjs';
import { ensureClaudeAvailable, runClaude } from './claude.mjs';
import { ensureDir, writeJson, readJson, exists, slug, latestRunRoot } from './artifacts.mjs';
import { loadConfig, projectRoot } from './config.mjs';
import { truthPrompt, auditTruthPrompt, capabilityResearchPrompt, contestantPrompt, judgePrompt, featureReviewPrompt, finalSpecPrompt, implementationPrompt, fidelityRepairPrompt, finalAuditPrompt } from './prompts.mjs';
import { createDesignLock, removeDesignLock, lockedReferencePaths, verifyDesignLock } from './design-lock.mjs';
import { writeFallbackHtml } from './html.mjs';

const config = loadConfig();
const ROOT = projectRoot();

function modelFor(stage) {
  if (stage === 'ui') return config.models.visual;
  return config.models.reasoning;
}

function runRootFor(appPath, { create = false } = {}) {
  const appSlug = slug(appPath);
  if (create) {
    const id = new Date().toISOString().replace(/[:.]/g, '-');
    return ensureDir(path.join(ROOT, 'runs', appSlug, id));
  }
  const run = latestRunRoot(ROOT, appSlug);
  if (!run) throw new Error('No DesignLab run exists for this app. Run `inspect` first.');
  return run;
}

function selectedArtifacts(run, stage, personaId) {
  return {
    html: path.join(run, 'rounds', stage, personaId, 'artifact.html'),
    spec: path.join(run, 'rounds', stage, personaId, 'spec.json')
  };
}

export function inspect(appPath) {
  const run = runRootFor(appPath, { create: true });
  const scan = scanRepository(appPath);
  writeJson(path.join(run, 'repo-scan.json'), scan);
  writeJson(path.join(run, 'run.json'), {
    schemaVersion: 2, appPath: path.resolve(appPath), createdAt: new Date().toISOString(),
    status: 'SCANNED', selections: {}, models: config.models
  });
  return { run, scan };
}

export function buildTruth(appPath) {
  ensureClaudeAvailable();
  const run = runRootFor(appPath);
  const truthDir = ensureDir(path.join(run, 'truth'));
  const scanPath = path.join(run, 'repo-scan.json');
  runClaude({
    prompt: truthPrompt(scanPath, truthDir), model: config.models.worker, cwd: path.resolve(appPath),
    maxTurns: config.claude.maxTurns.truth, allowedTools: ['Read','Glob','Grep','Write']
  });
  runClaude({
    prompt: auditTruthPrompt(truthDir, scanPath), model: config.models.reasoning, cwd: path.resolve(appPath),
    maxTurns: config.claude.maxTurns.judge, allowedTools: ['Read','Glob','Grep','Write']
  });
  const capabilityFile = path.join(truthDir, 'CAPABILITY_RESEARCH.md');
  runClaude({
    prompt: capabilityResearchPrompt({ truthDir, outputFile: capabilityFile }), model: config.models.worker, cwd: path.resolve(appPath),
    maxTurns: config.claude.maxTurns.truth, allowedTools: ['Read','Glob','Grep','Write','WebSearch','WebFetch']
  });
  const runState = readJson(path.join(run,'run.json'));
  runState.status='TRUTH_AND_CAPABILITIES_READY';
  runState.capabilityResearch=capabilityFile;
  writeJson(path.join(run,'run.json'),runState);
  return { run, truthDir, capabilityFile };
}

function requireTruth(run) {
  const file = path.join(run,'truth','CURRENT_APP_TRUTH.md');
  if (!exists(file)) throw new Error('Truth Pack is missing. Run `truth` first.');
  return file;
}

function requireCapabilities(run) {
  const file = path.join(run,'truth','CAPABILITY_RESEARCH.md');
  if (!exists(file)) throw new Error('Capability Research Pack is missing. Re-run `truth` before starting the tournament.');
  return file;
}

function requireSelection(run, stage) {
  const state = readJson(path.join(run,'run.json'));
  const selected = state.selections?.[stage];
  if (!selected) throw new Error(`No ${stage} winner selected. Run \`select ${stage} <persona-id>\`.`);
  return selected;
}

function requireDesignLock(run) {
  const stateFile = path.join(run, 'run.json');
  const state = readJson(stateFile);
  let manifestFile = state.designLock?.manifestFile || path.join(run, 'design-lock', 'manifest.json');
  if (!exists(manifestFile)) {
    const selections = state.selections || {};
    if (!selections.architecture || !selections.ux || !selections.ui) {
      throw new Error('Design Lock is missing. Select Architecture, UX and UI winners first.');
    }
    const lock = createDesignLock(run, selections);
    manifestFile = lock.manifestFile;
    state.designLock = { manifestFile, lockedAt: new Date().toISOString() };
    state.status = 'DESIGN_LOCKED';
    writeJson(stateFile, state);
  }
  verifyDesignLock(manifestFile);
  return lockedReferencePaths(manifestFile);
}

export function runRound(appPath, stage) {
  ensureClaudeAvailable();
  if (!['architecture','ux','ui'].includes(stage)) throw new Error('Round must be architecture, ux, or ui.');
  const run = runRootFor(appPath);
  const truthFile = requireTruth(run);
  const capabilityFile = requireCapabilities(run);
  let winnerContext = '';
  const contextFiles = [truthFile, capabilityFile];

  if (stage === 'ux') {
    const a = requireSelection(run,'architecture');
    const artifacts = selectedArtifacts(run,'architecture',a);
    contextFiles.push(artifacts.html, artifacts.spec);
    winnerContext = `${artifacts.html}, ${artifacts.spec}`;
  }
  if (stage === 'ui') {
    const a = requireSelection(run,'architecture');
    const u = requireSelection(run,'ux');
    const architecture = selectedArtifacts(run,'architecture',a);
    const ux = selectedArtifacts(run,'ux',u);
    contextFiles.push(architecture.html, architecture.spec, ux.html, ux.spec);
    winnerContext = `${architecture.html}, ${architecture.spec}, ${ux.html}, ${ux.spec}`;
  }

  const ids = config.tournament[stage];
  const stageDir = ensureDir(path.join(run,'rounds',stage));
  const contestantFiles = [];
  for (const id of ids) {
    const personaFile = path.join(ROOT,'personas',stage,`${id}.md`);
    const personaText = fs.readFileSync(personaFile,'utf8');
    const dir = ensureDir(path.join(stageDir,id));
    const html = path.join(dir,'artifact.html');
    const spec = path.join(dir,'spec.json');
    const result = runClaude({
      prompt: contestantPrompt({ stage, personaText, contextFiles, outputHtml: html, outputSpec: spec }),
      model: modelFor(stage), cwd: path.resolve(appPath), maxTurns: config.claude.maxTurns.contestant,
      allowedTools: ['Read','Write']
    });
    if (!exists(html)) writeFallbackHtml(html,{title:`${stage}: ${id}`,body:'<p>The model did not create the requested HTML artifact. Its response is preserved below.</p>',sourceText:result});
    if (!exists(spec)) writeJson(spec,{persona:id,stage,warning:'Model did not create spec.json',raw:String(result)});
    contestantFiles.push(html);
  }
  runClaude({
    prompt: judgePrompt({ stage, truthFile, winnerContext, contestantFiles, outputFile:path.join(stageDir,'JUDGE.md') }),
    model: config.models.reasoning, cwd:path.resolve(appPath), maxTurns:config.claude.maxTurns.judge, allowedTools:['Read','Write']
  });
  return { run, stageDir, ids };
}

export function selectWinner(appPath, stage, personaId) {
  const run = runRootFor(appPath);
  const artifact = selectedArtifacts(run, stage, personaId);
  if (!exists(artifact.spec) || !exists(artifact.html)) throw new Error(`No completed ${stage} entry found for ${personaId}.`);
  const stateFile = path.join(run,'run.json');
  const state=readJson(stateFile);
  state.selections ||= {};

  if (stage === 'architecture') {
    delete state.selections.ux;
    delete state.selections.ui;
    delete state.designLock;
    removeDesignLock(run);
  }
  if (stage === 'ux') {
    delete state.selections.ui;
    delete state.designLock;
    removeDesignLock(run);
  }

  state.selections[stage]=personaId;
  state.status=`${stage.toUpperCase()}_SELECTED`;

  if (stage === 'ui') {
    const lock = createDesignLock(run, state.selections);
    state.designLock = { manifestFile: lock.manifestFile, lockedAt: new Date().toISOString() };
    state.status = 'DESIGN_LOCKED';
  }

  writeJson(stateFile,state);
  return { run, selected: personaId, designLock: state.designLock || null };
}

export function featureReview(appPath) {
  ensureClaudeAvailable();
  const run = runRootFor(appPath);
  const truthFile=requireTruth(run);
  const refs=requireDesignLock(run);
  const dir=ensureDir(path.join(run,'feature-review'));
  const outputJson=path.join(dir,'changes.json'), outputHtml=path.join(dir,'review.html');
  runClaude({
    prompt:featureReviewPrompt({truthFile,architectureHtml:refs.architectureHtml,architectureSpec:refs.architectureSpec,uxHtml:refs.uxHtml,uxSpec:refs.uxSpec,uiHtml:refs.uiHtml,uiSpec:refs.uiSpec,outputJson,outputHtml}),
    model:config.models.worker,cwd:path.resolve(appPath),maxTurns:config.claude.maxTurns.truth,allowedTools:['Read','Write']
  });
  verifyDesignLock(refs.manifestFile);
  return {run,outputJson,outputHtml};
}

export function decideFeature(appPath, itemId, decision) {
  const normalized = String(decision).toUpperCase();
  if (!['APPROVE','REJECT','DEFER'].includes(normalized)) throw new Error('Decision must be approve, reject, or defer.');
  const run = runRootFor(appPath); const file=path.join(run,'feature-review','changes.json');
  if (!exists(file)) throw new Error('Feature review is missing. Run `feature-review` first.');
  const data=readJson(file); const items=Array.isArray(data) ? data : data.items;
  if (!Array.isArray(items)) throw new Error('Feature review JSON does not contain an item list.');
  const item=items.find(x=>x.id===itemId); if(!item) throw new Error(`Unknown feature-review item: ${itemId}`);
  item.decision=normalized; item.defaultDecision=normalized; item.decidedAt=new Date().toISOString();
  writeJson(file,data); return {run,item};
}

export function finalSpec(appPath) {
  ensureClaudeAvailable();
  const run=runRootFor(appPath), truthFile=requireTruth(run), refs=requireDesignLock(run);
  const decisionsFile=path.join(run,'feature-review','changes.json'); if(!exists(decisionsFile)) throw new Error('Feature review is missing.');
  const data=readJson(decisionsFile), items=Array.isArray(data)?data:data.items;
  const pending=(items||[]).filter(x=>!['APPROVE','REJECT','DEFER'].includes(String(x.decision||x.defaultDecision||'').toUpperCase()));
  if(pending.length) throw new Error(`${pending.length} feature decisions are still pending. Decide them before final-spec.`);
  const outputFile=path.join(run,'FINAL_PRODUCT_SPEC.md');
  runClaude({
    prompt:finalSpecPrompt({truthFile,designLockManifest:refs.manifestFile,architectureHtml:refs.architectureHtml,architectureSpec:refs.architectureSpec,uxHtml:refs.uxHtml,uxSpec:refs.uxSpec,uiHtml:refs.uiHtml,uiSpec:refs.uiSpec,decisionsFile,outputFile}),
    model:config.models.reasoning,cwd:path.resolve(appPath),maxTurns:config.claude.maxTurns.judge,allowedTools:['Read','Write']
  });
  verifyDesignLock(refs.manifestFile);
  return {run,outputFile,designLock:refs.manifestFile};
}

export function implement(appPath) {
  ensureClaudeAvailable();
  const run=runRootFor(appPath), specFile=path.join(run,'FINAL_PRODUCT_SPEC.md');
  if(!exists(specFile)) throw new Error('Final spec missing. Run `final-spec` first.');
  const refs=requireDesignLock(run);
  const reportFile=path.join(run,'IMPLEMENTATION_REPORT.md');
  runClaude({
    prompt:implementationPrompt({finalSpecFile:specFile,designLockManifest:refs.manifestFile,architectureHtml:refs.architectureHtml,architectureSpec:refs.architectureSpec,uxHtml:refs.uxHtml,uxSpec:refs.uxSpec,uiHtml:refs.uiHtml,uiSpec:refs.uiSpec,reportFile}),
    model:config.models.worker,cwd:path.resolve(appPath),maxTurns:config.claude.maxTurns.implementation,
    allowedTools:['Read','Glob','Grep','Write','Edit','Bash','WebSearch','WebFetch']
  });
  verifyDesignLock(refs.manifestFile);
  return {run,reportFile,designLock:refs.manifestFile};
}

function auditPassed(file) {
  if (!exists(file)) return false;
  return /STATUS:\s*PASS\b/.test(fs.readFileSync(file,'utf8'));
}

export function finalAudit(appPath) {
  ensureClaudeAvailable();
  const run=runRootFor(appPath), truthFile=requireTruth(run), specFile=path.join(run,'FINAL_PRODUCT_SPEC.md'), reportFile=path.join(run,'IMPLEMENTATION_REPORT.md');
  if(!exists(specFile)||!exists(reportFile)) throw new Error('Final spec and implementation report are required.');
  const refs=requireDesignLock(run);
  const outputFile=path.join(run,'FINAL_AUDIT.md');
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    verifyDesignLock(refs.manifestFile);
    const attemptFile=path.join(run,`FINAL_AUDIT_ATTEMPT_${attempt}.md`);
    runClaude({
      prompt:finalAuditPrompt({truthFile,finalSpecFile:specFile,implementationReportFile:reportFile,designLockManifest:refs.manifestFile,architectureHtml:refs.architectureHtml,architectureSpec:refs.architectureSpec,uxHtml:refs.uxHtml,uxSpec:refs.uxSpec,uiHtml:refs.uiHtml,uiSpec:refs.uiSpec,outputFile:attemptFile}),
      model:config.models.reasoning,cwd:path.resolve(appPath),maxTurns:config.claude.maxTurns.judge,
      allowedTools:['Read','Glob','Grep','Write','Bash']
    });
    if (exists(attemptFile)) fs.copyFileSync(attemptFile, outputFile);
    if (auditPassed(attemptFile)) return {run,outputFile,attempts:attempt,status:'PASS'};
    if (attempt === maxAttempts) break;

    runClaude({
      prompt:fidelityRepairPrompt({auditFile:attemptFile,finalSpecFile:specFile,designLockManifest:refs.manifestFile,architectureHtml:refs.architectureHtml,uxHtml:refs.uxHtml,uiHtml:refs.uiHtml,reportFile}),
      model:config.models.worker,cwd:path.resolve(appPath),maxTurns:config.claude.maxTurns.implementation,
      allowedTools:['Read','Glob','Grep','Write','Edit','Bash','WebSearch','WebFetch']
    });
    verifyDesignLock(refs.manifestFile);
  }

  return {run,outputFile,attempts:maxAttempts,status:'NEEDS_REVIEW'};
}

export function status(appPath) {
  const run = runRootFor(appPath); return { run, state: readJson(path.join(run,'run.json')) };
}
