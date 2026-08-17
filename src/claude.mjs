import { spawnSync } from 'node:child_process';

export function ensureClaudeAvailable() {
  const probe = spawnSync('claude', ['--version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    throw new Error('Claude Code CLI was not found. Install/authenticate Claude Code before running DesignLab.');
  }
  return (probe.stdout || probe.stderr || '').trim();
}

export function runClaude({ prompt, model, cwd, maxTurns = 8, allowedTools = [] }) {
  const args = ['-p', prompt, '--model', model, '--output-format', 'json', '--max-turns', String(maxTurns)];
  if (allowedTools.length) args.push('--allowedTools', allowedTools.join(','));
  const result = spawnSync('claude', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Claude call failed (${model}): ${result.stderr || result.stdout}`);
  const text = result.stdout.trim();
  try {
    const parsed = JSON.parse(text);
    return parsed.result ?? parsed.response ?? parsed;
  } catch {
    return text;
  }
}
