#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { loadConfig } from './config.js';
import { githubClient, fetchPullRequest } from './github.js';
import { MockProvider, OpenAIProvider } from './provider.js';
import { runReview } from './review.js';
import { publishReview } from './publish.js';
import { demoPr } from './demo.js';

function flag(name: string): boolean {
  return process.argv.includes(name);
}
function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}
function help(): void {
  console.log(
    [
      'AI Pull Request Reviewer (read-only by default)',
      'Usage:',
      '  npm run demo',
      '  npm run start -- --repo owner/name --pr 123 --provider mock',
      '  npm run start -- --repo owner/name --pr 123 --provider openai --allow-external-llm',
      'Options: --config file --report file --publish (requires multiple independent opt-ins)',
      'No automatic merge/approval/rejection.',
    ].join('\n'),
  );
}

export async function main(): Promise<void> {
  if (flag('--help')) {
    help();
    return;
  }
  const config = await loadConfig(option('--config'));
  const demo = flag('--demo');
  const repository = option('--repo');
  const prNumber = Number(option('--pr'));
  const providerName = option('--provider') ?? 'mock';
  if (!['mock', 'openai'].includes(providerName)) throw new Error('Invalid provider');
  if (!demo && (!repository || !Number.isSafeInteger(prNumber) || prNumber < 1)) {
    throw new Error('Supply --repo owner/name and --pr positive-number (or --demo)');
  }
  if (demo && (flag('--publish') || providerName !== 'mock'))
    throw new Error('Demo must remain read-only and simulated');
  if (providerName === 'openai' && !flag('--allow-external-llm')) {
    throw new Error('Sending PR data to a paid external LLM requires --allow-external-llm');
  }
  const api = demo ? null : githubClient(process.env.GITHUB_TOKEN || '');
  if (providerName === 'openai' && api && repository) {
    const [owner, repo] = repository.split('/');
    if (!owner || !repo) throw new Error('Invalid repository');
    const info = await api.repos.get({ owner, repo });
    if (info.data.private)
      throw new Error('Sending private repositories to a remote LLM is disabled');
  }
  const pr = demo ? demoPr : await fetchPullRequest(api!, repository!, prNumber);
  const provider = providerName === 'mock' ? new MockProvider() : new OpenAIProvider();
  const result = await runReview(pr, config, provider);
  const reportPath = option('--report') ?? (demo ? 'reports/demo.md' : 'reports/review.md');
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, result.report, 'utf8');
  console.log(
    'Report saved: ' +
      reportPath +
      ' | findings=' +
      result.findings.length +
      ' | partial=' +
      result.truncated +
      ' | provider=' +
      result.source,
  );
  if (flag('--publish')) {
    if (!api) throw new Error('Cannot publish a demo');
    const posted = await publishReview(api, pr, result, config, true);
    console.log('New comments posted: ' + posted);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  // Never print arbitrary API responses (which may contain sensitive payloads).
  console.error(
    'Reviewer failed: ' + message.slice(0, 240).replace(/(gh[pousr]_|sk-)[^\s]+/gi, '[REDACTED]'),
  );
  process.exitCode = 1;
});
