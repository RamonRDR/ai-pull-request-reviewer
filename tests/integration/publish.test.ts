import { describe, expect, it, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { configSchema } from '../../src/config.js';
import { demoPr } from '../../src/demo.js';
import { publishReview } from '../../src/publish.js';
import type { ReviewResult } from '../../src/models.js';

const result: ReviewResult = {
  source:'openai',findings:[],excludedFindings:0,skipped:[],
  truncated:false,fileCount:1,usage:{inputTokens:1,outputTokens:1,estimatedCostUsd:0.001},report:'report',
};

describe('protected review publishing', () => {
  it('refuses publishing without all independent authorizations', async () => {
    const client = {} as Octokit;
    await expect(publishReview(client,demoPr,result,configSchema.parse({}),false)).rejects.toThrow(/Publishing disabled/);
    await expect(publishReview(client,demoPr,result,configSchema.parse({enablePublishing:true}),true)).rejects.toThrow(/Publishing disabled/);
  });
  it('refuses mock output even when toggles are enabled', async () => {
    const before = process.env.ALLOW_GITHUB_COMMENTS;
    process.env.ALLOW_GITHUB_COMMENTS = 'true';
    try {
      await expect(publishReview({} as Octokit,demoPr,{...result,source:'mock'},configSchema.parse({enablePublishing:true}),true)).rejects.toThrow(/Simulated/);
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
    const api = {paginate,pulls:{listReviewComments:vi.fn(),listReviews:vi.fn(),createReview}} as unknown as Octokit;
    try {
      const count = await publishReview(api,demoPr,result,configSchema.parse({enablePublishing:true}),true);
      expect(count).toBe(0);
      expect(createReview).not.toHaveBeenCalled();
    } finally {
      if (before === undefined) delete process.env.ALLOW_GITHUB_COMMENTS;
      else process.env.ALLOW_GITHUB_COMMENTS = before;
    }
  });
});
