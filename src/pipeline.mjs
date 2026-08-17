import fs from 'node:fs';
import path from 'node:path';
import { scanRepository } from './scanner.mjs';
import { ensureClaudeAvailable, runClaude } from './claude.mjs';
import { ensureDir, writeJson, readJson, exists, slug, latestRunRoot } from './artifacts.mjs';
import { loadConfig, projectRoot } from './config.mjs';
import { truthPrompt, auditTruthPrompt, capabilityResearchPrompt, contestantPrompt, judgePrompt, featureReviewPrompt, finalSpecPrompt, implementationPrompt, finalAuditPrompt } from './prompts.mjs';
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

export function inspect(appPath) {
  const run = runRootFor(appPath, { create: true });
  const scan = scanRepository(appPath);
  writeJson(path.join(run, 'repo-scan.json'), scan);
  writeJson(path.join(run, 'run.json'), {
    schemaVersion: 1, appPath: path.resolve(appPath), createdAt: new Date().toISOString(),
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

export function runRound(appPath, stage) {
  ensureClaudeAvailable();
  if (!['architecture','ux','ui'].includes(stage)) throw new Error('Round must be architecture, ux, or ui.');
  const run = runRootFor(appPath);
  const truthFile = requireTruth(run);
  const capabilityFile = requireCapabilities(run);
  let winnerContext = '';
  if (stage === 'ux') winnerContext = path.join(run,'rounds','architecture',requireSelection(run,'architecture'),'spec.json');
  if (stage === 'ui') {
    requireSelection(run,'architecture');
    winnerContext = path.join(run,'rounds','ux',requireSelection(run,'ux'),'spec.json');
  }
  const ids = config.tournament[stage];
  const stageDir = ensureDir(path.join(run,'rounds',stage));
  const contextFiles = [truthFile, capabilityFile];
  if (stage !== 'architecture') contextFiles.push(path.join(run,'rounds','architecture',requireSelection(run,'architecture'),'spec.json'));
  if (stage === 'ui') contextFiles.push(path.join(run,'rounds','ux',requireSelection(run,'ux'),'spec.json'));

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
  const spec = path.join(run,'rounds',stage,personaId,'spec.json');
  if (!exists(spec)) throw new Error(`No completed ${stage} entry found for ${personaId}.`);
  const stateFile = path.join(run,'run.json'); const state=readJson(stateFile);
  state.selections ||= {}; state.selections[stage]=personaId; state.status=`${stage.toUpperCase()}_SELECTED`; writeJson(stateFile,state);
  return { run, selected: personaId };
}

export function featureReview(appPath) {
  ensureClaudeAvailable();
  const run = runRootFor(appPath); const truthFile=requireTruth(run);
  const a=requireSelection(run,'architecture'), u=requireSelection(run,'ux'), i=requireSelection(run,'ui');
  const dir=ensureDir(path.join(run,'feature-review'));
  const outputJson=path.join(dir,'changes.json'), outputHtml=path.join(dir,'review.html');
  runClaude({
    prompt:featureReviewPrompt({truthFile,architectureSpec:path.join(run,'rounds','architecture',a,'spec.json'),uxSpec:path.join(run,'rounds','ux',u,'spec.json'),uiSpec:path.join(run,'rounds','ui',i,'spec.json'),outputJson,outputHtml}),
    model:config.models.worker,cwd:path.resolve(appPath),maxTurns:config.claude.maxTurns.truth,allowedTools:['Read','Write']
  });
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
  const run=runRootFor(appPath), truthFile=requireTruth(run);
  const a=requireSelection(run,'architecture'),u=requireSelection(run,'ux'),i=requireSelection(run,'ui');
  const decisionsFile=path.join(run,'feature-review','changes.json'); if(!exists(decisionsFile)) throw new Error('Feature review is missing.');
  const data=readJson(decisionsFile), items=Array.isArray(data)?data:data.items;
  const pending=(items||[]).filter(x=>!['APPROVE','REJECT','DEFER'].includes(String(x.decision||x.defaultDecision||'').toUpperCase()));
  if(pending.length) throw new Error(`${pending.length} feature decisions are still pending. Decide them before final-spec.`);
  const outputFile=path.join(run,'FINAL_PRODUCT_SPEC.md');
  runClaude({prompt:finalSpecPrompt({truthFile,architectureSpec:path.join(run,'rounds','architecture',a,'spec.json'),uxSpec:path.join(run,'rounds','ux',u,'spec.json'),uiSpec:path.join(run,'rounds','ui',i,'spec.json'),decisionsFile,outputFile}),model:config.models.reasoning,cwd:path.resolve(appPath),maxTurns:config.claude.maxTurns.judge,allowedTools:['Read','Write']});
  return {run,outputFile};
}

export function implement(appPath) {
  ensureClaudeAvailable();
  const run=runRootFor(appPath), specFile=path.join(run,'FINAL_PRODUCT_SPEC.md'); if(!exists(specFile)) throw new Error('Final spec missing. Run `final-spec` first.');
  const reportFile=path.join(run,'IMPLEMENTATION_REPORT.md'); const finalSpecText=fs.readFileSync(specFile,'utf8');
  runClaude({prompt:implementationPrompt({finalSpecText,reportFile}),model:config.models.worker,cwd:path.resolve(appPath),maxTurns:config.claude.maxTurns.implementation,allowedTools:['Read','Glob','Grep','Write','Edit','Bash','WebSearch','WebFetch']});
  return {run,reportFile};
}

export function finalAudit(appPath) {
  ensureClaudeAvailable();
  const run=runRootFor(appPath), truthFile=requireTruth(run), specFile=path.join(run,'FINAL_PRODUCT_SPEC.md'), reportFile=path.join(run,'IMPLEMENTATION_REPORT.md');
  if(!exists(specFile)||!exists(reportFile)) throw new Error('Final spec and implementation report are required.');
  const outputFile=path.join(run,'FINAL_AUDIT.md');
  runClaude({prompt:finalAuditPrompt({truthText:fs.readFileSync(truthFile,'utf8'),finalSpecText:fs.readFileSync(specFile,'utf8'),implementationReportText:fs.readFileSync(reportFile,'utf8'),outputFile}),model:config.models.reasoning,cwd:path.resolve(appPath),maxTurns:config.claude.maxTurns.judge,allowedTools:['Read','Glob','Grep','Write','Bash']});
  return {run,outputFile};
}

export function status(appPath) {
  const run = runRootFor(appPath); return { run, state: readJson(path.join(run,'run.json')) };
}
