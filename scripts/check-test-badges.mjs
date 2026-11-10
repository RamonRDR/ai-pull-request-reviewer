import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync('reports/vitest-results.json', 'utf8'));
const passed = report.numPassedTests;
const failed = report.numFailedTests;
const skipped = report.numPendingTests ?? 0;

if (!report.success || !Number.isInteger(passed) || passed <= 0 || failed !== 0) {
  throw new Error('Vitest JSON report is invalid or contains failed tests');
}

const files = ['README.md', 'README.pt-BR.md', 'README.es.md'];
for (const file of files) {
  const content = readFileSync(file, 'utf8');
  const counts = [...content.matchAll(/img\.shields\.io\/badge\/Vitest-(\d+)%20passing/g)];
  if (counts.length !== 1 || Number(counts[0][1]) !== passed) {
    throw new Error(file + ': Vitest badge must match ' + passed + ' passing tests');
  }
}
console.log('Verified Vitest badges in 3 READMEs: ' + passed + ' passed, ' + failed + ' failed, ' + skipped + ' skipped');
