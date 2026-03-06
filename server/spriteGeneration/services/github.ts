import { Octokit } from '@octokit/rest'

/**
 * Grudge Studio GitHub Integration
 * Uses GITHUB_TOKEN env var for authentication.
 */
function getGitHubToken(): string {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN env var not set');
  }
  return token;
}

export async function getUncachableGitHubClient() {
  return new Octokit({ auth: getGitHubToken() });
}

export async function getGitHubUser() {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

export async function listRepositories() {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100
  });
  return data;
}

export async function createRepository(name: string, description: string, isPrivate: boolean = false) {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.repos.createForAuthenticatedUser({
    name,
    description,
    private: isPrivate,
    auto_init: false
  });
  return data;
}

export async function getRepository(owner: string, repo: string) {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.repos.get({ owner, repo });
  return data;
}
