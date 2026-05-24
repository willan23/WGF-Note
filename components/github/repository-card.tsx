/**
 * Repository Card Component
 * 
 * Displays GitHub repository information in a card format.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';
import type { GitHubRepository } from '@/lib/github-integration';

interface RepositoryCardProps {
  repository: GitHubRepository;
  onPress?: (repo: GitHubRepository) => void;
  showOwner?: boolean;
  compact?: boolean;
}

export function RepositoryCard({
  repository,
  onPress,
  showOwner = false,
  compact = false,
}: RepositoryCardProps) {
  const { colors } = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress(repository);
    } else {
      Linking.openURL(repository.html_url);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getLanguageColor = (language: string): string => {
    const languageColors: Record<string, string> = {
      JavaScript: '#f1e05a',
      TypeScript: '#2b7489',
      Python: '#3572A5',
      Java: '#b07219',
      Ruby: '#701516',
      Go: '#00ADD8',
      Rust: '#dea584',
      PHP: '#4F5D95',
      C: '#555555',
      'C++': '#f34b7d',
      'C#': '#178600',
      Swift: '#ffac45',
      Kotlin: '#F18E33',
      HTML: '#e34c26',
      CSS: '#563d7c',
      Shell: '#89e051',
      Vue: '#41b883',
      Dart: '#00B4AB',
    };
    return languageColors[language] || '#cccccc';
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.repoInfo}>
          {showOwner && (
            <Text style={[styles.ownerName, { color: colors.textSecondary }]}>
              {repository.owner.login}/
            </Text>
          )}
          <Text style={[styles.repoName, { color: colors.text }]}>
            {repository.name}
          </Text>
          {repository.visibility && (
            <View style={[
              styles.visibilityBadge,
              { backgroundColor: repository.private ? colors.danger + '20' : colors.success + '20' }
            ]}>
              <Ionicons
                name={repository.private ? 'lock-closed' : 'globe-outline'}
                size={12}
                color={repository.private ? colors.danger : colors.success}
              />
              <Text style={[
                styles.visibilityText,
                { color: repository.private ? colors.danger : colors.success }
              ]}>
                {repository.private ? 'Private' : 'Public'}
              </Text>
            </View>
          )}
        </View>
        
        {repository.fork && (
          <View style={styles.forkBadge}>
            <Ionicons name="git-branch" size={14} color={colors.textSecondary} />
            <Text style={[styles.forkText, { color: colors.textSecondary }]}>Fork</Text>
          </View>
        )}
      </View>

      {!compact && repository.description && (
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
          {repository.description}
        </Text>
      )}

      {!compact && repository.homepage && (
        <TouchableOpacity
          style={styles.homepageLink}
          onPress={() => Linking.openURL(repository.homepage!)}
        >
          <Ionicons name="link-outline" size={14} color={colors.primary} />
          <Text style={[styles.homepageText, { color: colors.primary }]} numberOfLines={1}>
            {repository.homepage!.replace(/^https?:\/\//, '')}
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.cardFooter}>
        <View style={styles.statsRow}>
          {!compact && repository.language && (
            <View style={styles.statItem}>
              <View
                style={[
                  styles.languageDot,
                  { backgroundColor: getLanguageColor(repository.language) },
                ]}
              />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {repository.language}
              </Text>
            </View>
          )}

          <View style={styles.statItem}>
            <Ionicons name="star-outline" size={14} color={colors.warning} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {repository.stargazers_count.toLocaleString()}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Ionicons name="git-branch-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.statText, { color: colors.textSecondary }]}>
              {repository.forks_count.toLocaleString()}
            </Text>
          </View>

          {repository.open_issues_count > 0 && (
            <View style={styles.statItem}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.info} />
              <Text style={[styles.statText, { color: colors.textSecondary }]}>
                {repository.open_issues_count.toLocaleString()}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.updatedAt, { color: colors.textTertiary }]}>
          Atualizado em {formatDate(repository.updated_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  repoInfo: {
    flex: 1,
    gap: 4,
  },
  ownerName: {
    fontSize: 13,
  },
  repoName: {
    fontSize: 18,
    fontWeight: '600',
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
    gap: 4,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  forkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  forkText: {
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  homepageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  homepageText: {
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  cardFooter: {
    borderTopWidth: 1,
    paddingTop: 12,
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  languageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  updatedAt: {
    fontSize: 12,
    fontStyle: 'italic',
  },
});

export default RepositoryCard;
