#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const checks = [
  { id: 'lint', label: 'Lint', cmd: 'npm', args: ['run', 'lint'] },
  { id: 'guided_smoke', label: 'Guided smoke', cmd: 'npx', args: ['vitest', 'run', '-c', 'vitest.guided-smoke.config.ts'] },
  { id: 'build', label: 'Production build', cmd: 'npm', args: ['run', 'build'] },
  { id: 'observability', label: 'Observability check', cmd: 'node', args: ['scripts/observability-check.mjs'] }
];

const rollbackChecks = [
  { id: 'rollback_target', label: 'Rollback target exists', cmd: 'git', args: ['rev-parse', '--verify', 'HEAD~1'] },
  { id: 'current_sha', label: 'Current release SHA', cmd: 'git', args: ['rev-parse', '--short', 'HEAD'] }
];

const runCheck = ({ id, label, cmd, args }) => {
  const startedAt = Date.now();
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  const passed = res.status === 0;
  return {
    id,
    label,
    passed,
    code: res.status ?? 1,
    durationMs: Date.now() - startedAt,
    stdout: (res.stdout || '').trim(),
    stderr: (res.stderr || '').trim()
  };
};

const results = checks.map(runCheck);
const rollback = rollbackChecks.map(runCheck);

const printGroup = (title, group) => {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
  for (const result of group) {
    const status = result.passed ? 'PASS' : 'FAIL';
    console.log(`${status.padEnd(5)} ${result.label} (${result.durationMs}ms)`);
    if (!result.passed && result.stderr) {
      console.log(`      ${result.stderr.split('\n')[0]}`);
    }
  }
};

printGroup('Release candidate checks', results);
printGroup('Rollback drill checks', rollback);

const failed = [...results, ...rollback].filter((result) => !result.passed);
console.log('\nPass/Fail Matrix');
console.log('----------------');
for (const result of [...results, ...rollback]) {
  console.log(`${result.id}: ${result.passed ? 'PASS' : 'FAIL'}`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}
