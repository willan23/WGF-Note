/**
 * GitHub Integration Module
 * 
 * Provides OAuth authentication, repository management, and data extraction from GitHub.
 * Supports both personal access tokens and OAuth 2.0 flow.
 */

import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getApiBaseUrl } from '../constants/oauth';

// Constants
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_SCOPE = 'repo,user,read:org,workflow';
const GITHUB_TOKEN_KEY = 'github_access_token';
const GITHUB_USER_KEY = 'github_user_info';

// Types
export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name?: string;
  company?: string;
  blog?: string;
  location?: string;
  email?: string;
  hireable?: boolean;
  bio?: string;
  twitter_username?: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubUser;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  forks_url: string;
  keys_url: string;
  collaborators_url: string;
  teams_url: string;
  hooks_url: string;
  issue_events_url: string;
  events_url: string;
  assignees_url: string;
  branches_url: string;
  tags_url: string;
  blobs_url: string;
  git_tags_url: string;
  git_refs_url: string;
  trees_url: string;
  statuses_url: string;
  languages_url: string;
  stargazers_url: string;
  contributors_url: string;
  subscribers_url: string;
  subscription_url: string;
  commits_url: string;
  git_commits_url: string;
  comments_url: string;
  issue_comment_url: string;
  contents_url: string;
  compare_url: string;
  merges_url: string;
  archive_url: string;
  downloads_url: string;
  issues_url: string;
  pulls_url: string;
  milestones_url: string;
  notifications_url: string;
  labels_url: string;
  releases_url: string;
  deployments_url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  git_url: string;
  ssh_url: string;
  clone_url: string;
  svn_url: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  has_issues: boolean;
  has_projects: boolean;
  has_downloads: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_discussions: boolean;
  forks_count: number;
  mirror_url: string | null;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
    node_id: string;
  } | null;
  allow_forking: boolean;
  is_template: boolean;
  web_commit_signoff_required: boolean;
  topics: string[];
  visibility: string;
  forks: number;
  open_issues: number;
  watchers: number;
  default_branch: string;
  temp_clone_token: string;
  organization?: GitHubUser;
  network_count: number;
  subscribers_count: number;
}

export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string; // Base64 encoded for files
  encoding?: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

export interface GitHubCommit {
  sha: string;
  node_id: string;
  commit: {
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    message: string;
    tree: {
      sha: string;
      url: string;
    };
    url: string;
    comment_count: number;
  };
  url: string;
  html_url: string;
  comments_url: string;
  author: GitHubUser | null;
  committer: GitHubUser | null;
  parents: Array<{
    sha: string;
    url: string;
    html_url: string;
  }>;
}

export interface GitHubIssue {
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  id: number;
  node_id: string;
  number: number;
  title: string;
  user: GitHubUser;
  labels: Array<{
    id: number;
    node_id: string;
    url: string;
    name: string;
    color: string;
    default: boolean;
    description?: string;
  }>;
  state: 'open' | 'closed';
  locked: boolean;
  assignee?: GitHubUser | null;
  assignees?: GitHubUser[];
  milestone?: any;
  comments: number;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  body?: string | null;
}

export interface GitHubPullRequest {
  url: string;
  id: number;
  node_id: string;
  html_url: string;
  diff_url: string;
  patch_url: string;
  issue_url: string;
  number: number;
  state: 'open' | 'closed';
  locked: boolean;
  title: string;
  user: GitHubUser;
  body?: string | null;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  merged_at?: string | null;
  merge_commit_sha?: string | null;
  assignee?: GitHubUser | null;
  assignees?: GitHubUser[];
  requested_reviewers?: GitHubUser[];
  labels: any[];
  head: {
    label: string;
    ref: string;
    sha: string;
    user: GitHubUser;
    repo: GitHubRepository;
  };
  base: {
    label: string;
    ref: string;
    sha: string;
    user: GitHubUser;
    repo: GitHubRepository;
  };
  mergeable?: boolean;
  mergeable_state: string;
  merged: boolean;
  merged_by?: GitHubUser | null;
  comments: number;
  review_comments: number;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

// State
let cachedToken: string | null = null;
let cachedUser: GitHubUser | null = null;

/**
 * Initialize GitHub module - load token from secure storage
 */
export async function initializeGitHub(): Promise<void> {
  try {
    cachedToken = await SecureStore.getItemAsync(GITHUB_TOKEN_KEY);
    const userStr = await SecureStore.getItemAsync(GITHUB_USER_KEY);
    if (userStr) {
      cachedUser = JSON.parse(userStr);
    }
  } catch (error) {
    console.error('Failed to initialize GitHub:', error);
  }
}

/**
 * Check if user is authenticated with GitHub
 */
export function isAuthenticated(): boolean {
  return cachedToken !== null && cachedToken !== undefined;
}

/**
 * Get current GitHub user
 */
export function getCurrentUser(): GitHubUser | null {
  return cachedUser;
}

/**
 * Get access token
 */
export async function getToken(): Promise<string | null> {
  if (!cachedToken) {
    cachedToken = await SecureStore.getItemAsync(GITHUB_TOKEN_KEY);
  }
  return cachedToken;
}

/**
 * Start OAuth flow for GitHub authentication
 */
export async function authenticateWithOAuth(clientId: string, redirectUri?: string): Promise<boolean> {
  try {
    const state = Math.random().toString(36).substring(7);
    
    // Determine redirect URI based on platform
    const finalRedirectUri = redirectUri || (
      Platform.OS === 'web' 
        ? `${getApiBaseUrl()}/api/github/callback`
        : Linking.createURL('/github/callback')
    );

    const authUrl = `${GITHUB_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(finalRedirectUri)}&scope=${encodeURIComponent(GITHUB_SCOPE)}&state=${state}`;

    // Open browser for authentication
    const result = await WebBrowser.openBrowserAsync(authUrl, {
      dismissButtonStyle: 'cancel',
      preferredBarTintColor: '#24292e',
      preferredControlTintColor: 'white',
      readerMode: false,
      showTitle: true,
      toolbarColor: '#24292e',
      enableBarCollapsing: false,
    });

    if (result.type === 'cancel') {
      throw new Error('Authentication cancelled');
    }

    if (result.type === 'url' && result.url) {
      // Parse the callback URL
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      const returnedState = url.searchParams.get('state');

      if (!code) {
        throw new Error('No authorization code received');
      }

      if (returnedState !== state) {
        throw new Error('State mismatch - possible CSRF attack');
      }

      // Exchange code for token (this should be done server-side in production)
      const tokenData = await exchangeCodeForToken(clientId, code, finalRedirectUri);
      
      if (tokenData.access_token) {
        await setToken(tokenData.access_token);
        await fetchAndCacheUser();
        return true;
      } else {
        throw new Error('Failed to get access token');
      }
    }

    return false;
  } catch (error) {
    console.error('GitHub OAuth error:', error);
    throw error;
  }
}

/**
 * Exchange authorization code for access token
 * Note: In production, this should be done server-side
 */
async function exchangeCodeForToken(
  clientId: string, 
  code: string, 
  redirectUri: string
): Promise<{ access_token: string; token_type: string; scope: string }> {
  // For mobile apps, consider using PKCE or a backend proxy
  const response = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: process.env.EXPO_PUBLIC_GITHUB_CLIENT_SECRET || '',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  return await response.json();
}

/**
 * Set and store access token
 */
export async function setToken(token: string): Promise<void> {
  cachedToken = token;
  await SecureStore.setItemAsync(GITHUB_TOKEN_KEY, token);
}

/**
 * Clear stored token and user data
 */
export async function logout(): Promise<void> {
  cachedToken = null;
  cachedUser = null;
  await SecureStore.deleteItemAsync(GITHUB_TOKEN_KEY);
  await SecureStore.deleteItemAsync(GITHUB_USER_KEY);
}

/**
 * Fetch and cache current user info
 */
export async function fetchAndCacheUser(): Promise<GitHubUser> {
  const user = await fetchCurrentUser();
  cachedUser = user;
  await SecureStore.setItemAsync(GITHUB_USER_KEY, JSON.stringify(user));
  return user;
}

/**
 * Make authenticated API request to GitHub
 */
async function githubRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getToken();
  
  if (!token) {
    throw new Error('Not authenticated with GitHub');
  }

  const headers: HeadersInit = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    ...options.headers,
  };

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new Error(`GitHub API error (${response.status}): ${error}`);
  }

  return response;
}

// ==================== User Operations ====================

/**
 * Fetch current authenticated user
 */
export async function fetchCurrentUser(): Promise<GitHubUser> {
  const response = await githubRequest('/user');
  return await response.json();
}

/**
 * Fetch user profile by username
 */
export async function fetchUserByUsername(username: string): Promise<GitHubUser> {
  const response = await githubRequest(`/users/${username}`);
  return await response.json();
}

// ==================== Repository Operations ====================

/**
 * Fetch repositories for authenticated user
 */
export async function fetchUserRepositories(options?: {
  visibility?: 'all' | 'public' | 'private';
  affiliation?: 'owner' | 'collaborator' | 'organization_member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}): Promise<GitHubRepository[]> {
  const params = new URLSearchParams();
  
  if (options?.visibility) params.set('visibility', options.visibility);
  if (options?.affiliation) params.set('affiliation', options.affiliation);
  if (options?.sort) params.set('sort', options.sort);
  if (options?.direction) params.set('direction', options.direction);
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const queryString = params.toString();
  const endpoint = `/user/repos${queryString ? `?${queryString}` : ''}`;
  
  const response = await githubRequest(endpoint);
  return await response.json();
}

/**
 * Fetch a specific repository
 */
export async function fetchRepository(owner: string, repo: string): Promise<GitHubRepository> {
  const response = await githubRequest(`/repos/${owner}/${repo}`);
  return await response.json();
}

/**
 * Search repositories
 */
export async function searchRepositories(
  query: string,
  options?: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }
): Promise<{ total_count: number; incomplete_results: boolean; items: GitHubRepository[] }> {
  const params = new URLSearchParams();
  params.set('q', query);
  
  if (options?.sort) params.set('sort', options.sort);
  if (options?.order) params.set('order', options.order);
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const queryString = params.toString();
  const response = await githubRequest(`/search/repositories?${queryString}`);
  return await response.json();
}

// ==================== File Operations ====================

/**
 * Get file or directory contents
 */
export async function getFileContents(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<GitHubFileContent | GitHubFileContent[]> {
  const endpoint = `/repos/${owner}/${repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`;
  const response = await githubRequest(endpoint);
  return await response.json();
}

/**
 * Download file content (decoded from base64)
 */
export async function downloadFile(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<{ content: string; metadata: GitHubFileContent }> {
  const result = await getFileContents(owner, repo, path, ref);
  
  if (Array.isArray(result)) {
    throw new Error('Path is a directory, not a file');
  }

  if (result.type !== 'file' || !result.content) {
    throw new Error('Not a file or no content available');
  }

  // Decode base64 content
  const decodedContent = atob(result.content);
  
  return {
    content: decodedContent,
    metadata: result,
  };
}

/**
 * Create or update a file
 */
export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  sha?: string
): Promise<{ content: GitHubFileContent; commit: GitHubCommit }> {
  const encodedContent = btoa(content);
  
  const body: any = {
    message,
    content: encodedContent,
    branch,
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await githubRequest(`/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });

  return await response.json();
}

/**
 * Delete a file
 */
export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  message: string,
  sha: string,
  branch: string
): Promise<{ commit: GitHubCommit }> {
  const response = await githubRequest(`/repos/${owner}/${repo}/contents/${path}`, {
    method: 'DELETE',
    body: JSON.stringify({
      message,
      sha,
      branch,
    }),
  });

  return await response.json();
}

// ==================== Commit Operations ====================

/**
 * List commits for a repository
 */
export async function listCommits(
  owner: string,
  repo: string,
  options?: {
    sha?: string;
    path?: string;
    since?: string;
    until?: string;
    per_page?: number;
    page?: number;
  }
): Promise<GitHubCommit[]> {
  const params = new URLSearchParams();
  
  if (options?.sha) params.set('sha', options.sha);
  if (options?.path) params.set('path', options.path);
  if (options?.since) params.set('since', options.since);
  if (options?.until) params.set('until', options.until);
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const queryString = params.toString();
  const endpoint = `/repos/${owner}/${repo}/commits${queryString ? `?${queryString}` : ''}`;
  
  const response = await githubRequest(endpoint);
  return await response.json();
}

/**
 * Get a specific commit
 */
export async function getCommit(
  owner: string,
  repo: string,
  ref: string
): Promise<GitHubCommit & { files?: any[] }> {
  const response = await githubRequest(`/repos/${owner}/${repo}/commits/${ref}`);
  return await response.json();
}

// ==================== Issue Operations ====================

/**
 * List issues for a repository
 */
export async function listIssues(
  owner: string,
  repo: string,
  options?: {
    state?: 'open' | 'closed' | 'all';
    labels?: string;
    sort?: 'created' | 'updated' | 'comments';
    direction?: 'asc' | 'desc';
    since?: string;
    per_page?: number;
    page?: number;
  }
): Promise<GitHubIssue[]> {
  const params = new URLSearchParams();
  
  if (options?.state) params.set('state', options.state);
  if (options?.labels) params.set('labels', options.labels);
  if (options?.sort) params.set('sort', options.sort);
  if (options?.direction) params.set('direction', options.direction);
  if (options?.since) params.set('since', options.since);
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const queryString = params.toString();
  const endpoint = `/repos/${owner}/${repo}/issues${queryString ? `?${queryString}` : ''}`;
  
  const response = await githubRequest(endpoint);
  return await response.json();
}

/**
 * Create an issue
 */
export async function createIssue(
  owner: string,
  repo: string,
  title: string,
  body?: string,
  labels?: string[],
  assignees?: string[]
): Promise<GitHubIssue> {
  const response = await githubRequest(`/repos/${owner}/${repo}/issues`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      body,
      labels,
      assignees,
    }),
  });

  return await response.json();
}

// ==================== Pull Request Operations ====================

/**
 * List pull requests
 */
export async function listPullRequests(
  owner: string,
  repo: string,
  options?: {
    state?: 'open' | 'closed' | 'all';
    head?: string;
    base?: string;
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }
): Promise<GitHubPullRequest[]> {
  const params = new URLSearchParams();
  
  if (options?.state) params.set('state', options.state);
  if (options?.head) params.set('head', options.head);
  if (options?.base) params.set('base', options.base);
  if (options?.sort) params.set('sort', options.sort);
  if (options?.direction) params.set('direction', options.direction);
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const queryString = params.toString();
  const endpoint = `/repos/${owner}/${repo}/pulls${queryString ? `?${queryString}` : ''}`;
  
  const response = await githubRequest(endpoint);
  return await response.json();
}

/**
 * Create a pull request
 */
export async function createPullRequest(
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string
): Promise<GitHubPullRequest> {
  const response = await githubRequest(`/repos/${owner}/${repo}/pulls`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      head,
      base,
      body,
    }),
  });

  return await response.json();
}

// ==================== Advanced Data Extraction ====================

/**
 * Extract repository statistics
 */
export async function extractRepositoryStats(owner: string, repo: string): Promise<{
  repository: GitHubRepository;
  languages: Record<string, number>;
  recentCommits: GitHubCommit[];
  openIssues: GitHubIssue[];
  openPullRequests: GitHubPullRequest[];
  contributors: any[];
}> {
  const [repository, languages, recentCommits, openIssues, openPullRequests, contributors] = await Promise.all([
    fetchRepository(owner, repo),
    getLanguages(owner, repo),
    listCommits(owner, repo, { per_page: 10 }),
    listIssues(owner, repo, { state: 'open', per_page: 10 }),
    listPullRequests(owner, repo, { state: 'open', per_page: 10 }),
    getContributors(owner, repo),
  ]);

  return {
    repository,
    languages,
    recentCommits,
    openIssues,
    openPullRequests,
    contributors,
  };
}

/**
 * Get repository languages
 */
export async function getLanguages(owner: string, repo: string): Promise<Record<string, number>> {
  const response = await githubRequest(`/repos/${owner}/${repo}/languages`);
  return await response.json();
}

/**
 * Get repository contributors
 */
export async function getContributors(
  owner: string,
  repo: string,
  options?: { per_page?: number; page?: number }
): Promise<any[]> {
  const params = new URLSearchParams();
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const queryString = params.toString();
  const endpoint = `/repos/${owner}/${repo}/contributors${queryString ? `?${queryString}` : ''}`;
  
  const response = await githubRequest(endpoint);
  return await response.json();
}

/**
 * Get repository README
 */
export async function getReadme(owner: string, repo: string, ref?: string): Promise<{
  content: string;
  metadata: GitHubFileContent;
}> {
  return await downloadFile(owner, repo, 'README.md', ref);
}

/**
 * Search code across repositories
 */
export async function searchCode(
  query: string,
  options?: {
    sort?: 'indexed';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }
): Promise<{ total_count: number; incomplete_results: boolean; items: any[] }> {
  const params = new URLSearchParams();
  params.set('q', query);
  
  if (options?.sort) params.set('sort', options.sort);
  if (options?.order) params.set('order', options.order);
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const queryString = params.toString();
  const response = await githubRequest(`/search/code?${queryString}`);
  return await response.json();
}

/**
 * Get repository activity timeline
 */
export async function getActivityTimeline(
  owner: string,
  repo: string,
  days: number = 30
): Promise<{
  commits: { date: string; count: number }[];
  issues: { date: string; count: number }[];
  prs: { date: string; count: number }[];
}> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString();

  const [commits, issues, prs] = await Promise.all([
    listCommits(owner, repo, { since: sinceStr, per_page: 100 }),
    listIssues(owner, repo, { since: sinceStr, per_page: 100 }),
    listPullRequests(owner, repo, { since: sinceStr, per_page: 100 }),
  ]);

  // Group by date
  const groupByDate = (items: any[], dateField: string = 'commit.author.date') => {
    const groups: Record<string, number> = {};
    items.forEach(item => {
      let date: string;
      if (dateField.includes('.')) {
        const parts = dateField.split('.');
        let obj: any = item;
        for (const part of parts) {
          obj = obj[part];
        }
        date = obj.split('T')[0];
      } else {
        date = item[dateField].split('T')[0];
      }
      groups[date] = (groups[date] || 0) + 1;
    });
    return Object.entries(groups).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));
  };

  return {
    commits: groupByDate(commits),
    issues: groupByDate(issues),
    prs: groupByDate(prs),
  };
}

// Initialize on import
initializeGitHub();
