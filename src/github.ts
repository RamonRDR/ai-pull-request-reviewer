import { Octokit } from '@octokit/rest';
import type { ChangedFile, PullRequestData } from './models.js';

const namePattern = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/;
export function parseRepo(repo: string): { owner: string; repo: string } {
  if (!namePattern.test(repo)) throw new Error('Repository must be owner/name');
  const [owner, name] = repo.split('/');
  if (!owner || !name || owner === '.' || name === '..') throw new Error('Invalid repository');
  return { owner, repo: name };
}

export function githubClient(token: string): Octokit {
  if (!token) throw new Error('GITHUB_TOKEN is required for live pull requests');
  return new Octokit({ auth: token, request: { timeout: 15000 }, throttle: undefined });
}

export async function fetchPullRequest(
  api: Octokit,
  repository: string,
  number: number,
): Promise<PullRequestData> {
  if (!Number.isSafeInteger(number) || number < 1) throw new Error('Invalid PR number');
  const { owner, repo } = parseRepo(repository);
  const response = await api.pulls.get({ owner, repo, pull_number: number });
  const pr = response.data;
  // Octokit's pagination stops at GitHub's 3,000-file API ceiling.
  const files = await api.paginate(api.pulls.listFiles, {
    owner,
    repo,
    pull_number: number,
    per_page: 100,
  });
  const mapped: ChangedFile[] = files.map((file) => ({
    filename: file.filename,
    status: file.status,
    patch: file.patch,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
  }));
  return {
    repo: repository,
    number,
    title: pr.title,
    base: pr.base.ref,
    head: pr.head.ref,
    headRepo: pr.head.repo?.full_name ?? null,
    changedFiles: pr.changed_files,
    files: mapped,
  };
}
