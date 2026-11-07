import type { Octokit } from '@octokit/rest';
import { parseRepo } from './github.js';
import type { ReviewerConfig } from './config.js';
import type { Finding, PullRequestData, ReviewResult } from './models.js';
import { fingerprint } from './review.js';
import { redact } from './context.js';

const marker = '<!-- ai-pr-reviewer:';
function inlineBody(finding: Finding): string {
  return [
    '**' +
      finding.severity.toUpperCase() +
      ' / ' +
      finding.category +
      '**: ' +
      redact(finding.title),
    '',
    redact(finding.explanation),
    '',
    '**Suggestion:** ' + redact(finding.suggestion),
    '',
    marker + fingerprint(finding) + ' -->',
  ].join('\n');
}

/** Explicit opt-in on every layer. No default Action calls this function. */
export async function publishReview(
  api: Octokit,
  pr: PullRequestData,
  result: ReviewResult,
  config: ReviewerConfig,
  explicitFlag: boolean,
): Promise<number> {
  if (!explicitFlag || !config.enablePublishing || process.env.ALLOW_GITHUB_COMMENTS !== 'true') {
    throw new Error(
      'Publishing disabled: requires --publish, config enablePublishing, and ALLOW_GITHUB_COMMENTS=true',
    );
  }
  if (result.source === 'mock')
    throw new Error('Simulated findings cannot be published as real reviews');
  if (pr.headRepo !== pr.repo) throw new Error('Publishing to fork pull requests is disabled');
  if (result.truncated) throw new Error('Refusing publication from a partial/incomplete review');
  const { owner, repo } = parseRepo(pr.repo);
  const existing = await api.paginate(api.pulls.listReviewComments, {
    owner,
    repo,
    pull_number: pr.number,
    per_page: 100,
  });
  const reviewed = await api.paginate(api.pulls.listReviews, {
    owner,
    repo,
    pull_number: pr.number,
    per_page: 100,
  });
  const existingBodies = [
    ...existing.map((comment) => comment.body),
    ...reviewed.map((review) => review.body ?? ''),
  ].join('\n');
  const newFindings = result.findings.filter(
    (finding) => !existingBodies.includes(marker + fingerprint(finding) + ' -->'),
  );
  if (!newFindings.length) return 0;
  const comments = newFindings.slice(0, config.maxComments).map((finding) => ({
    path: finding.path,
    line: finding.line,
    side: 'RIGHT' as const,
    body: inlineBody(finding),
  }));
  // COMMENT does not approve / request changes / merge.
  await api.pulls.createReview({
    owner,
    repo,
    pull_number: pr.number,
    event: 'COMMENT',
    body:
      'AI Pull Request Reviewer: ' +
      comments.length +
      ' new observation(s). These are hypotheses for human review. No automatic approval or merge.',
    comments,
  });
  return comments.length;
}
