import { describe, expect, it, vi } from 'vitest';
import type { Octokit } from '@octokit/rest';
import { fetchPullRequest, parseRepo } from '../../src/github.js';

describe('GitHub REST integration with mocks', () => {
  it('extracts metadata and paginated files', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        title: 'Fix calculation',
        base: { ref: 'main' },
        head: { ref: 'fix', sha: 'a'.repeat(40), repo: { full_name: 'owner/repo' } },
        changed_files: 1,
      },
    });
    const changedFile = {
      filename: 'src/a.ts',
      status: 'modified',
      patch: '@@ -0,0 +1,1 @@\n+x',
      additions: 1,
      deletions: 0,
      changes: 1,
    };
    const paginate = vi.fn().mockResolvedValue([changedFile]);
    const fake = { pulls: { get, listFiles: vi.fn() }, paginate } as unknown as Octokit;
    const result = await fetchPullRequest(fake, 'owner/repo', 3);
    expect(get).toHaveBeenCalledTimes(2);
    expect(paginate).toHaveBeenCalledOnce();
    expect(result.files[0]?.filename).toBe('src/a.ts');
    expect(result.changedFiles).toBe(1);
    expect(result.headSha).toBe('a'.repeat(40));
  });
  it('rejects a PR whose head changes during paginated file retrieval', async () => {
    const initial = {
      title: 'A reviewable change',
      base: { ref: 'main' },
      head: { ref: 'fix', sha: 'a'.repeat(40), repo: { full_name: 'owner/repo' } },
      changed_files: 1,
    };
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: initial })
      .mockResolvedValueOnce({
        data: { ...initial, head: { ...initial.head, sha: 'b'.repeat(40) } },
      });
    const paginate = vi.fn().mockResolvedValue([
      {
        filename: 'src/a.ts',
        status: 'modified',
        patch: '@@ -0,0 +1,1 @@\n+x',
        additions: 1,
        deletions: 0,
        changes: 1,
      },
    ]);
    const client = { pulls: { get, listFiles: vi.fn() }, paginate } as unknown as Octokit;
    await expect(fetchPullRequest(client, 'owner/repo', 3)).rejects.toThrow(
      /head changed while fetching files/,
    );
    expect(get).toHaveBeenCalledTimes(2);
  });
  it('validates repository names', () => {
    expect(parseRepo('a/b')).toEqual({ owner: 'a', repo: 'b' });
    expect(() => parseRepo('https://example.com')).toThrow();
  });
});
