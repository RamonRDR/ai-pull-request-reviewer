import { describe, expect, it, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { fetchPullRequest, parseRepo } from '../../src/github.js';

describe('GitHub REST integration with mocks', () => {
  it('extracts metadata and paginated files', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        title: 'Fix calculation',
        base: { ref: 'main' },
        head: { ref: 'fix', repo: { full_name: 'owner/repo' } },
        changed_files: 1,
      },
    });
    const paginate = vi
      .fn()
      .mockResolvedValue([
        {
          filename: 'src/a.ts',
          status: 'modified',
          patch: '@@ -0,0 +1,1 @@\n+x',
          additions: 1,
          deletions: 0,
          changes: 1,
        },
      ]);
    const fake = { pulls: { get, listFiles: vi.fn() }, paginate } as unknown as Octokit;
    const result = await fetchPullRequest(fake, 'owner/repo', 3);
    expect(get).toHaveBeenCalledOnce();
    expect(paginate).toHaveBeenCalledOnce();
    expect(result.files[0]?.filename).toBe('src/a.ts');
    expect(result.changedFiles).toBe(1);
  });
  it('validates repository names', () => {
    expect(parseRepo('a/b')).toEqual({ owner: 'a', repo: 'b' });
    expect(() => parseRepo('https://example.com')).toThrow();
  });
});
