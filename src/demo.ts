import type { PullRequestData } from './models.js';

const buggyPatch = [
  '@@ -1,1 +1,5 @@',
  ' export function average(values: number[]): number {',
  '+  const total = values.reduce((sum, value) => sum + value, 0); // DEMO_EDGE',
  '+  const denominator = values.length + 1; // DEMO_BUG',
  '+  return total / denominator;',
  '+}',
].join('\n');

const safePatch = [
  '@@ -1,2 +1,3 @@',
  ' export function greet(name: string): string {',
  '+  return name.trim() || "friend";',
  ' }',
].join('\n');

export const demoPr: PullRequestData = {
  repo: 'example/synthetic-demo',
  number: 42,
  title: 'Synthetic arithmetic sample',
  base: 'main',
  head: 'demo',
  headSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  headRepo: 'example/synthetic-demo',
  changedFiles: 2,
  files: [
    {
      filename: 'src/average.ts',
      status: 'modified',
      patch: buggyPatch,
      additions: 4,
      deletions: 0,
      changes: 4,
    },
    {
      filename: 'src/greeting.ts',
      status: 'modified',
      patch: safePatch,
      additions: 1,
      deletions: 0,
      changes: 1,
    },
  ],
};
