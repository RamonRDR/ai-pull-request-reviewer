import { describe, expect, it, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { configSchema } from '../../src/config.js';
import { demoPr } from '../../src/demo.js';
import { publishReview } from '../../src/publish.js';
import { fingerprint } from '../../src/review.js';
import type { ReviewResult } from '../../src/models.js';

const result: ReviewResult = {
  source: 'openai',
  findings: [],
  excludedFindings: 0,
  skipped: [],
  truncated: false,
  fileCount: 1,
  usage: { inputTokens: 1, outputTokens: 1, estimatedCostUsd: 0.001 },
  report: 'report',
};

describe('protected review publishing', () => {
  it('refuses publishing without all independent authorizations', async () => {
    const client = {} as Octokit;
    await expect(
      publishReview(client, demoPr, result, configSchema.parse({}), false),
    ).rejects.toThrow(/Publishing disabled/);
    await expect(
      publishReview(client, demoPr, result, configSchema.parse({ enablePublishing: true }), true),
    ).rejects.toThrow(/Publishing disabled/);
  });
  it('refuses mock output even when toggles are enabled', async () => {
    const before = process.env.ALLOW_GITHUB_COMMENTS;
    process.env.ALLOW_GITHUB_COMMENTS = 'true';
    try {
      await expect(
        publishReview(
          {} as Octokit,
          demoPr,
          { ...result, source: 'mock' },
          configSchema.parse({ enablePublishing: true }),
          true,
        ),
      ).rejects.toThrow(/Simulated/);
    } finally {
      if (before === undefined) delete process.env.ALLOW_GITHUB_COMMENTS;
      else process.env.ALLOW_GITHUB_COMMENTS = before;
    }
  });
  it('does not post when there are no new findings', async () => {
    const before = process.env.ALLOW_GITHUB_COMMENTS;
    process.env.ALLOW_GITHUB_COMMENTS = 'true';
    const paginate = vi.fn().mockResolvedValue([]);
    const createReview = vi.fn();
    const api = {
      paginate,
      pulls: { listReviewComments: vi.fn(), listReviews: vi.fn(), createReview },
    } as unknown as Octokit;
    try {
      const count = await publishReview(
        api,
        demoPr,
        result,
        configSchema.parse({ enablePublishing: true }),
        true,
      );
      expect(count).toBe(0);
      expect(createReview).not.toHaveBeenCalled();
    } finally {
      if (before === undefined) delete process.env.ALLOW_GITHUB_COMMENTS;
      else process.env.ALLOW_GITHUB_COMMENTS = before;
    }
  });

  it('rejects publication when the PR head changes after analysis', async () => {
    const before = process.env.ALLOW_GITHUB_COMMENTS;
    process.env.ALLOW_GITHUB_COMMENTS = 'true';
    const paginate = vi.fn().mockResolvedValue([]);
    const createReview = vi.fn();
    const get = vi.fn().mockResolvedValue({
      data: { head: { sha: 'b'.repeat(40) } },
    });
    const client = {
      paginate,
      pulls: { get, listReviewComments: vi.fn(), listReviews: vi.fn(), createReview },
    } as unknown as Octokit;
    const finding = {
      path: 'src/average.ts',
      line: 3,
      category: 'bug' as const,
      severity: 'medium' as const,
      title: 'Incorrect denominator for the average',
      explanation: 'The denominator is increased unnecessarily, causing incorrect results.',
      suggestion: 'Use the actual number of elements for the divisor.',
    };
    try {
      await expect(
        publishReview(
          client,
          demoPr,
          { ...result, findings: [finding] },
          configSchema.parse({ enablePublishing: true }),
          true,
        ),
      ).rejects.toThrow(/head changed since analysis/);
      expect(get).toHaveBeenCalledOnce();
      expect(createReview).not.toHaveBeenCalled();
    } finally {
      if (before === undefined) delete process.env.ALLOW_GITHUB_COMMENTS;
      else process.env.ALLOW_GITHUB_COMMENTS = before;
    }
  });
  it('simulates creating RIGHT-side comments, then deduplicates on rerun', async () => {
    const before = process.env.ALLOW_GITHUB_COMMENTS;
    process.env.ALLOW_GITHUB_COMMENTS = 'true';
    const finding = {
      path: 'src/average.ts',
      line: 3,
      category: 'bug' as const,
      severity: 'medium' as const,
      title: 'Incorrect denominator for the average',
      explanation: 'The denominator is increased unnecessarily, causing incorrect results.',
      suggestion: 'Use the actual number of elements for the divisor.',
    };
    const reviewed: ReviewResult = { ...result, findings: [finding] };
    const paginate = vi.fn().mockResolvedValue([]);
    const createReview = vi.fn().mockResolvedValue({});
    const get = vi.fn().mockResolvedValue({
      data: { head: { sha: demoPr.headSha } },
    });
    const api = {
      paginate,
      pulls: { get, listReviewComments: vi.fn(), listReviews: vi.fn(), createReview },
    } as unknown as Octokit;
    try {
      const count = await publishReview(
        api,
        demoPr,
        reviewed,
        configSchema.parse({ enablePublishing: true }),
        true,
      );
      expect(count).toBe(1);
      expect(createReview).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'COMMENT',
          commit_id: demoPr.headSha,
          comments: [
            expect.objectContaining({
              path: 'src/average.ts',
              line: 3,
              side: 'RIGHT',
            }),
          ],
        }),
      );
      const tag = '<!-- ai-pr-reviewer:' + fingerprint(finding) + ' -->';
      const repeated = vi
        .fn()
        .mockResolvedValueOnce([{ body: tag }])
        .mockResolvedValueOnce([]);
      const repeatApi = {
        paginate: repeated,
        pulls: { get, listReviewComments: vi.fn(), listReviews: vi.fn(), createReview },
      } as unknown as Octokit;
      const paraphrased: ReviewResult = {
        ...reviewed,
        findings: [{ ...finding, title: 'The average denominator produces incorrect values' }],
      };
      expect(fingerprint(paraphrased.findings[0]!)).toBe(fingerprint(finding));
      expect(
        await publishReview(
          repeatApi,
          demoPr,
          paraphrased,
          configSchema.parse({ enablePublishing: true }),
          true,
        ),
      ).toBe(0);
      expect(createReview).toHaveBeenCalledOnce();
    } finally {
      if (before === undefined) delete process.env.ALLOW_GITHUB_COMMENTS;
      else process.env.ALLOW_GITHUB_COMMENTS = before;
    }
  });
});
