#!/usr/bin/env node
import { inspect, buildTruth, runRound, selectWinner, featureReview, decideFeature, finalSpec, implement, finalAudit, status } from './pipeline.mjs';

function usage() {
  console.log(`DesignLab V2\n\nUsage:\n  npm run designlab -- inspect <app-path>\n  npm run designlab -- truth <app-path>\n  npm run designlab -- round <architecture|ux|ui> <app-path>\n  npm run designlab -- select <architecture|ux|ui> <persona-id> <app-path>\n  npm run designlab -- feature-review <app-path>\n  npm run designlab -- decide <item-id> <approve|reject|defer> <app-path>\n  npm run designlab -- final-spec <app-path>\n  npm run designlab -- build <app-path>\n  npm run designlab -- final-audit <app-path>\n  npm run designlab -- status <app-path>\n\nEach round stops for human review. A later round cannot run until the prior winner is selected.`);
}

const [cmd,...args]=process.argv.slice(2);
try {
  if (!cmd || cmd==='help' || cmd==='--help') { usage(); process.exit(0); }
  if (cmd==='inspect') {
    const app=args[0]; if(!app) throw new Error('Missing app path.');
    const r=inspect(app); console.log(`Scan complete. Run: ${r.run}\nReachable source files: ${r.scan.counts.reachableSourceFiles}\nOrphan candidates: ${r.scan.counts.orphanCandidates}`);
  } else if (cmd==='truth') {
    const r=buildTruth(args[0]); console.log(`Truth Pack created and Opus-audited: ${r.truthDir}`);
  } else if (cmd==='round') {
    const [stage,app]=args; const r=runRound(app,stage); console.log(`${stage} round complete: ${r.stageDir}\nOpen each contestant's artifact.html, then select a winner.`);
  } else if (cmd==='select') {
    const [stage,id,app]=args; const r=selectWinner(app,stage,id); console.log(`${stage} winner locked: ${r.selected}`);
  } else if (cmd==='feature-review') {
    const r=featureReview(args[0]); console.log(`Feature Change Review ready: ${r.outputHtml}\nDecisions remain human-owned.`);
  } else if (cmd==='decide') {
    const [id,decision,app]=args; const r=decideFeature(app,id,decision); console.log(`Feature ${id}: ${r.item.decision}`);
  } else if (cmd==='final-spec') {
    const r=finalSpec(args[0]); console.log(`Final product contract locked: ${r.outputFile}`);
  } else if (cmd==='build') {
    const r=implement(args[0]); console.log(`Implementation pass complete. Report: ${r.reportFile}`);
  } else if (cmd==='final-audit') {
    const r=finalAudit(args[0]); console.log(`Final audit complete: ${r.outputFile}`);
  } else if (cmd==='status') {
    console.log(JSON.stringify(status(args[0]),null,2));
  } else { usage(); process.exitCode=1; }
} catch (error) {
  console.error(`DesignLab error: ${error.message}`); process.exitCode=1;
}
