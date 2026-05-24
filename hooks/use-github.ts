/**
 * GitHub Integration React Hook
 * 
 * Provides React hooks for GitHub authentication and data operations.
 */

import { useState, useEffect, useCallback } from 'react';
import * as GitHub from './github-integration';

export interface UseGitHubReturn {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // User data
  user: GitHub.GitHubUser | null;
  
  // Actions
  login: (clientId: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  
  // Repository operations
  fetchRepositories: (options?: any) => Promise<GitHub.GitHubRepository[]>;
  searchRepositories: (query: string, options?: any) => Promise<any>;
  fetchRepository: (owner: string, repo: string) => Promise<GitHub.GitHubRepository>;
  
  // File operations
  getFileContents: (owner: string, repo: string, path: string, ref?: string) => Promise<any>;
  downloadFile: (owner: string, repo: string, path: string, ref?: string) => Promise<{ content: string; metadata: GitHub.GitHubFileContent }>;
  createOrUpdateFile: (owner: string, repo: string, path: string, content: string, message: string, branch: string, sha?: string) => Promise<any>;
  deleteFile: (owner: string, repo: string, path: string, message: string, sha: string, branch: string) => Promise<any>;
  
  // Commit operations
  listCommits: (owner: string, repo: string, options?: any) => Promise<GitHub.GitHubCommit[]>;
  getCommit: (owner: string, repo: string, ref: string) => Promise<any>;
  
  // Issue operations
  listIssues: (owner: string, repo: string, options?: any) => Promise<GitHub.GitHubIssue[]>;
  createIssue: (owner: string, repo: string, title: string, body?: string, labels?: string[], assignees?: string[]) => Promise<GitHub.GitHubIssue>;
  
  // Pull Request operations
  listPullRequests: (owner: string, repo: string, options?: any) => Promise<GitHub.GitHubPullRequest[]>;
  createPullRequest: (owner: string, repo: string, title: string, head: string, base: string, body?: string) => Promise<GitHub.GitHubPullRequest>;
  
  // Advanced extraction
  extractRepositoryStats: (owner: string, repo: string) => Promise<any>;
  getLanguages: (owner: string, repo: string) => Promise<Record<string, number>>;
  getContributors: (owner: string, repo: string, options?: any) => Promise<any[]>;
  getReadme: (owner: string, repo: string, ref?: string) => Promise<{ content: string; metadata: GitHub.GitHubFileContent }>;
  searchCode: (query: string, options?: any) => Promise<any>;
  getActivityTimeline: (owner: string, repo: string, days?: number) => Promise<any>;
}

/**
 * Main hook for GitHub integration
 */
export function useGitHub(): UseGitHubReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<GitHub.GitHubUser | null>(null);

  // Initialize and check auth status on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        await GitHub.initializeGitHub();
        const authenticated = GitHub.isAuthenticated();
        setIsAuthenticated(authenticated);
        
        if (authenticated) {
          const currentUser = GitHub.getCurrentUser();
          setUser(currentUser);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize GitHub');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // Login function
  const login = useCallback(async (clientId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await GitHub.authenticateWithOAuth(clientId);
      
      if (success) {
        setIsAuthenticated(true);
        const currentUser = GitHub.getCurrentUser();
        setUser(currentUser);
      } else {
        throw new Error('Authentication failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Logout function
  const logout = useCallback(async () => {
    try {
      setIsLoading(true);
      await GitHub.logout();
      setIsAuthenticated(false);
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      setIsLoading(true);
      await GitHub.fetchAndCacheUser();
      const currentUser = GitHub.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Token refresh failed');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Repository operations
  const fetchRepositories = useCallback(async (options?: any) => {
    return await GitHub.fetchUserRepositories(options);
  }, []);

  const searchRepositories = useCallback(async (query: string, options?: any) => {
    return await GitHub.searchRepositories(query, options);
  }, []);

  const fetchRepository = useCallback(async (owner: string, repo: string) => {
    return await GitHub.fetchRepository(owner, repo);
  }, []);

  // File operations
  const getFileContents = useCallback(async (owner: string, repo: string, path: string, ref?: string) => {
    return await GitHub.getFileContents(owner, repo, path, ref);
  }, []);

  const downloadFile = useCallback(async (owner: string, repo: string, path: string, ref?: string) => {
    return await GitHub.downloadFile(owner, repo, path, ref);
  }, []);

  const createOrUpdateFile = useCallback(async (
    owner: string, repo: string, path: string, content: string, message: string, branch: string, sha?: string
  ) => {
    return await GitHub.createOrUpdateFile(owner, repo, path, content, message, branch, sha);
  }, []);

  const deleteFile = useCallback(async (
    owner: string, repo: string, path: string, message: string, sha: string, branch: string
  ) => {
    return await GitHub.deleteFile(owner, repo, path, message, sha, branch);
  }, []);

  // Commit operations
  const listCommits = useCallback(async (owner: string, repo: string, options?: any) => {
    return await GitHub.listCommits(owner, repo, options);
  }, []);

  const getCommit = useCallback(async (owner: string, repo: string, ref: string) => {
    return await GitHub.getCommit(owner, repo, ref);
  }, []);

  // Issue operations
  const listIssues = useCallback(async (owner: string, repo: string, options?: any) => {
    return await GitHub.listIssues(owner, repo, options);
  }, []);

  const createIssue = useCallback(async (
    owner: string, repo: string, title: string, body?: string, labels?: string[], assignees?: string[]
  ) => {
    return await GitHub.createIssue(owner, repo, title, body, labels, assignees);
  }, []);

  // Pull Request operations
  const listPullRequests = useCallback(async (owner: string, repo: string, options?: any) => {
    return await GitHub.listPullRequests(owner, repo, options);
  }, []);

  const createPullRequest = useCallback(async (
    owner: string, repo: string, title: string, head: string, base: string, body?: string
  ) => {
    return await GitHub.createPullRequest(owner, repo, title, head, base, body);
  }, []);

  // Advanced extraction
  const extractRepositoryStats = useCallback(async (owner: string, repo: string) => {
    return await GitHub.extractRepositoryStats(owner, repo);
  }, []);

  const getLanguages = useCallback(async (owner: string, repo: string) => {
    return await GitHub.getLanguages(owner, repo);
  }, []);

  const getContributors = useCallback(async (owner: string, repo: string, options?: any) => {
    return await GitHub.getContributors(owner, repo, options);
  }, []);

  const getReadme = useCallback(async (owner: string, repo: string, ref?: string) => {
    return await GitHub.getReadme(owner, repo, ref);
  }, []);

  const searchCode = useCallback(async (query: string, options?: any) => {
    return await GitHub.searchCode(query, options);
  }, []);

  const getActivityTimeline = useCallback(async (owner: string, repo: string, days?: number) => {
    return await GitHub.getActivityTimeline(owner, repo, days);
  }, []);

  return {
    // State
    isAuthenticated,
    isLoading,
    error,
    user,
    
    // Actions
    login,
    logout,
    refreshToken,
    
    // Repository operations
    fetchRepositories,
    searchRepositories,
    fetchRepository,
    
    // File operations
    getFileContents,
    downloadFile,
    createOrUpdateFile,
    deleteFile,
    
    // Commit operations
    listCommits,
    getCommit,
    
    // Issue operations
    listIssues,
    createIssue,
    
    // Pull Request operations
    listPullRequests,
    createPullRequest,
    
    // Advanced extraction
    extractRepositoryStats,
    getLanguages,
    getContributors,
    getReadme,
    searchCode,
    getActivityTimeline,
  };
}

/**
 * Hook for fetching repository data with automatic caching and refetching
 */
export function useRepository(owner: string, repo: string, enabled: boolean = true) {
  const [data, setData] = useState<GitHub.GitHubRepository | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchRepo = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await GitHub.fetchRepository(owner, repo);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch repository');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepo();
  }, [owner, repo, enabled]);

  return { data, isLoading, error };
}

/**
 * Hook for fetching repository files
 */
export function useRepositoryFiles(
  owner: string,
  repo: string,
  path: string = '',
  ref?: string,
  enabled: boolean = true
) {
  const [data, setData] = useState<GitHub.GitHubFileContent | GitHub.GitHubFileContent[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await GitHub.getFileContents(owner, repo, path, ref);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch files');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [owner, repo, path, ref, enabled]);

  return { data, isLoading, error };
}

/**
 * Hook for fetching commits
 */
export function useCommits(
  owner: string,
  repo: string,
  options?: { sha?: string; path?: string; per_page?: number },
  enabled: boolean = true
) {
  const [data, setData] = useState<GitHub.GitHubCommit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchCommits = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const result = await GitHub.listCommits(owner, repo, options);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch commits');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommits();
  }, [owner, repo, JSON.stringify(options || {}), enabled]);

  return { data, isLoading, error };
}
