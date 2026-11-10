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
  return new Octokit({ auth: token, request: { timeout: 15000 } });
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
  const headSha = pr.head.sha;
  if (!/^[a-f0-9]{40}$/i.test(headSha)) throw new Error('Invalid pull request head SHA');
  // Octokit's pagination stops at GitHub's 3,000-file API ceiling.
  const files = await api.paginate(api.pulls.listFiles, {
    owner,
    repo,
    pull_number: number,
    per_page: 100,
  });
  // A PR may receive a new commit while GitHub is paginating its changed files.
  // Never mix patches from multiple revisions into a single analysis.
  const afterFiles = await api.pulls.get({ owner, repo, pull_number: number });
  if (afterFiles.data.head.sha !== headSha) {
    throw new Error('Pull request head changed while fetching files; retry the review');
  }
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
    headSha,
    headRepo: pr.head.repo?.full_name ?? null,
    changedFiles: pr.changed_files,
    files: mapped,
  };
}
