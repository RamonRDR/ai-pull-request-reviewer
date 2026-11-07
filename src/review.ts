import { createHash } from 'node:crypto';
import type { ReviewerConfig } from './config.js';
import { prepareContext, redact } from './context.js';
import {
  findingSchema,
  severityOrder,
  type Finding,
  type PullRequestData,
  type ReviewResult,
} from './models.js';
import type { ReviewProvider } from './provider.js';
import { markdownReport } from './report.js';

export function fingerprint(finding: Finding): string {
  const key = [
    finding.path,
    finding.line,
    finding.category,
    finding.title.toLowerCase().trim(),
  ].join(':');
  return createHash('sha256').update(key).digest('hex').slice(0, 20);
}

/** Fail closed: accept only schema-valid, anchored, relevant, nonduplicated findings. */
export function validateFindings(
  unknownFindings: unknown[],
  context: ReturnType<typeof prepareContext>,
  config: ReviewerConfig,
): { valid: Finding[]; excluded: number } {
  const result: Finding[] = [];
  const seen = new Set<string>();
  let excluded = 0;
  for (const raw of unknownFindings) {
    const checked = findingSchema.safeParse(raw);
    if (!checked.success) {
      excluded++;
      continue;
    }
    const item = checked.data;
    const file = context.files.find((entry) => entry.path === item.path);
    const anchored = file?.added.some((added) => added.line === item.line);
    const distinct = item.path + ':' + item.line + ':' + item.category;
    const relevant =
      config.categories.includes(item.category) &&
      severityOrder[item.severity] >= severityOrder[config.minSeverity];
    const safe = [item.title, item.explanation, item.suggestion, item.evidence ?? ''].map(redact);
    if (!anchored || !relevant || seen.has(distinct) || safe.some((s) => s.includes('[REDACTED'))) {
      excluded++;
      continue;
    }
    seen.add(distinct);
    result.push({ ...item, id: 'APR-' + fingerprint(item).slice(0, 12) });
  }
  result.sort(
    (a, b) =>
      severityOrder[b.severity] - severityOrder[a.severity] ||
      a.path.localeCompare(b.path) ||
      a.line - b.line,
  );
  if (result.length > config.maxComments) excluded += result.length - config.maxComments;
  return { valid: result.slice(0, config.maxComments), excluded };
}

export async function runReview(
  pr: PullRequestData,
  config: ReviewerConfig,
  provider: ReviewProvider,
): Promise<ReviewResult> {
  const context = prepareContext(pr.files, config);
  if (pr.changedFiles > pr.files.length) {
    context.truncated = true;
    context.skipped.push('GitHub API returned fewer files than the PR metadata reports');
  }
  const response = context.files.length
    ? await provider.analyze(context, config)
    : { findings: [], usage: { inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 } };
  const { valid, excluded } = validateFindings(response.findings, context, config);
  const result: ReviewResult = {
    source: provider.kind,
    findings: valid,
    excludedFindings: excluded,
    skipped: context.skipped,
    truncated: context.truncated,
    fileCount: context.files.length,
    usage: response.usage,
    report: '',
  };
  result.report = markdownReport(pr, result);
  return result;
}
