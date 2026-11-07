import type { PullRequestData, ReviewResult } from './models.js';
import { redact } from './context.js';

function safe(text: string): string {
  return redact(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/([\\*_[\]#|])/g, '\\$1')
    .replace(/\r?\n/g, ' ');
}

export function markdownReport(pr: PullRequestData, review: ReviewResult): string {
  const lines = [
    '# AI Pull Request Reviewer',
    '',
    '> ' +
      (review.source === 'mock'
        ? '**SIMULATED DEMO ONLY. No actual AI analysis was performed.**'
        : '**OpenAI-assisted analysis. Findings require human verification.**'),
    '',
    '- Repository: ' + safe(pr.repo),
    '- Pull request: #' + pr.number + ' (' + safe(pr.base) + ' ← ' + safe(pr.head) + ')',
    '- Reviewed files: ' + review.fileCount + '/' + pr.changedFiles,
    '- Findings: ' + review.findings.length + ' (excluded: ' + review.excludedFindings + ')',
    '- Partial review: ' + (review.truncated ? 'yes' : 'no'),
    '- Provider: ' + review.source,
    '- Input tokens: ' + review.usage.inputTokens,
    '- Output tokens: ' + review.usage.outputTokens,
    '- Estimated USD cost: ' + review.usage.estimatedCostUsd.toFixed(6),
    '',
    '## Findings',
    '',
  ];
  if (!review.findings.length)
    lines.push(
      'No actionable findings were produced by this run. **This does not guarantee correctness or security.**',
      '',
    );
  for (const item of review.findings) {
    lines.push('### ' + item.severity.toUpperCase() + ': ' + safe(item.title));
    lines.push('- Location: ' + safe(item.path) + ':' + item.line);
    lines.push('- Category: ' + item.category);
    lines.push('- Evidence: ' + safe(item.evidence ?? 'Based on the supplied diff'));
    lines.push('- Why it matters: ' + safe(item.explanation));
    lines.push('- Suggested fix: ' + safe(item.suggestion));
    if (item.confidence !== undefined)
      lines.push('- Confidence (model supplied, not calibrated): ' + item.confidence.toFixed(2));
    lines.push('');
  }
  lines.push('## Skipped files and limitations', '');
  if (review.skipped.length) {
    for (const path of review.skipped) lines.push('- ' + safe(path));
  } else {
    lines.push('No skipped files reported.');
  }
  lines.push(
    '',
    '## Decision',
    '',
    'Review only. No automatic approval, rejection, merge, or code modification.',
    '',
  );
  return lines.join('\n');
}
