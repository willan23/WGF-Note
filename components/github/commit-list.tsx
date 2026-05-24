/**
 * GitHub Commit List Component
 * 
 * Displays a list of commits with filtering and search capabilities.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';
import { useGitHub } from '@/hooks/use-github';
import type { GitHubCommit } from '@/lib/github-integration';

interface CommitListProps {
  owner: string;
  repo: string;
  branch?: string;
  onCommitSelect?: (commit: GitHubCommit) => void;
  maxCommits?: number;
}

export function GitHubCommitList({
  owner,
  repo,
  branch = 'main',
  onCommitSelect,
  maxCommits = 100,
}: CommitListProps) {
  const { listCommits } = useGitHub();
  const { colors } = useTheme();
  
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [filteredCommits, setFilteredCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState<string | null>(null);

  useEffect(() => {
    loadCommits();
  }, [branch]);

  useEffect(() => {
    filterCommits();
  }, [commits, searchQuery, authorFilter]);

  const loadCommits = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await listCommits(owner, repo, {
        sha: branch,
        per_page: maxCommits,
      });
      
      setCommits(response);
    } catch (err) {
      console.error('Error loading commits:', err);
      setError(err instanceof Error ? err.message : 'Failed to load commits');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCommits();
  };

  const filterCommits = () => {
    let filtered = [...commits];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(commit =>
        commit.commit.message.toLowerCase().includes(query) ||
        commit.commit.author?.name?.toLowerCase().includes(query) ||
        commit.sha.toLowerCase().includes(query)
      );
    }

    // Filter by author
    if (authorFilter) {
      filtered = filtered.filter(commit =>
        commit.commit.author?.login === authorFilter ||
        commit.commit.author?.name === authorFilter
      );
    }

    setFilteredCommits(filtered);
  };

  const getAuthors = () => {
    const authors = new Set<string>();
    commits.forEach(commit => {
      const author = commit.commit.author?.login || commit.commit.author?.name;
      if (author) authors.add(author);
    });
    return Array.from(authors);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ontem';
    } else if (diffDays < 7) {
      return `${diffDays} dias atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
      });
    }
  };

  const truncateMessage = (message: string, maxLength: number = 60): string => {
    const firstLine = message.split('\n')[0];
    if (firstLine.length <= maxLength) return firstLine;
    return firstLine.substring(0, maxLength - 3) + '...';
  };

  const renderCommitItem = ({ item }: { item: GitHubCommit }) => (
    <TouchableOpacity
      style={[styles.commitItem, { borderBottomColor: colors.border }]}
      onPress={() => onCommitSelect?.(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        {item.commit.author?.avatar_url ? (
          <View style={[styles.avatar, { backgroundColor: colors.background }]}>
            {/* In a real app, you'd use an Image component here */}
            <Ionicons name="person-circle" size={36} color={colors.primary} />
          </View>
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="git-commit-outline" size={20} color={colors.primary} />
          </View>
        )}
      </View>
      
      <View style={styles.commitContent}>
        <Text
          style={[styles.commitMessage, { color: colors.text }]}
          numberOfLines={2}
        >
          {truncateMessage(item.commit.message)}
        </Text>
        
        <View style={styles.commitMeta}>
          <View style={styles.commitMetaRow}>
            <Ionicons name="person-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.authorName, { color: colors.textTertiary }]}>
              {item.commit.author?.name || 'Unknown'}
            </Text>
          </View>
          
          <View style={styles.commitMetaRow}>
            <Ionicons name="time-outline" size={12} color={colors.textTertiary} />
            <Text style={[styles.commitDate, { color: colors.textTertiary }]}>
              {formatDate(item.commit.author?.date || item.commit.committer?.date || '')}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.shaContainer}>
        <Text style={[styles.shaShort, { color: colors.textTertiary }]}>
          {item.sha.substring(0, 7)}
        </Text>
        {item.commit.verification?.verified && (
          <Ionicons name="shield-checkmark" size={16} color={colors.success} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text, backgroundColor: colors.card }]}
          placeholder="Buscar commits..."
          placeholderTextColor={colors.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      {getAuthors().length > 0 && (
        <View style={styles.authorsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.authorChip,
                !authorFilter && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setAuthorFilter(null)}
            >
              <Text
                style={[
                  styles.authorChipText,
                  !authorFilter && { color: '#ffffff' },
                ]}
              >
                Todos
              </Text>
            </TouchableOpacity>
            
            {getAuthors().map(author => (
              <TouchableOpacity
                key={author}
                style={[
                  styles.authorChip,
                  authorFilter === author && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setAuthorFilter(authorFilter === author ? null : author)}
              >
                <Text
                  style={[
                    styles.authorChipText,
                    authorFilter === author && { color: '#ffffff' },
                  ]}
                >
                  {author}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      
      <View style={styles.statsRow}>
        <Text style={[styles.statsText, { color: colors.textSecondary }]}>
          {filteredCommits.length} de {commits.length} commits
        </Text>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Carregando commits...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="warning-outline" size={48} color={colors.danger} />
        <Text style={[styles.errorText, { color: colors.text }]}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: colors.primary }]}
          onPress={loadCommits}
        >
          <Text style={styles.retryButtonText}>Tentar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      <FlatList
        data={filteredCommits}
        renderItem={renderCommitItem}
        keyExtractor={(item) => item.sha}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="git-branch-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {searchQuery || authorFilter
                ? 'Nenhum commit encontrado com os filtros atuais'
                : 'Nenhum commit encontrado'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  authorsContainer: {
    maxHeight: 40,
  },
  authorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
  },
  authorChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statsText: {
    fontSize: 12,
  },
  commitItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    alignItems: 'flex-start',
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commitContent: {
    flex: 1,
  },
  commitMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  commitMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  commitMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  authorName: {
    fontSize: 12,
  },
  commitDate: {
    fontSize: 12,
  },
  shaContainer: {
    alignItems: 'flex-end',
    gap: 4,
  },
  shaShort: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  separator: {
    height: 0,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default GitHubCommitList;
