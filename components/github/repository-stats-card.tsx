/**
 * Repository Stats Card Component
 * 
 * Displays comprehensive statistics for a GitHub repository.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';

interface RepositoryStats {
  name: string;
  fullName: string;
  description?: string | null;
  stars: number;
  forks: number;
  issues: number;
  watchers: number;
  size: number;
  language?: string | null;
  languages?: Record<string, number>;
  contributors?: number;
  lastCommit?: string;
  createdAt: string;
  updatedAt: string;
  isPrivate: boolean;
  hasWiki: boolean;
  hasPages: boolean;
  license?: string | null;
  topics?: string[];
}

interface RepositoryStatsCardProps {
  stats: RepositoryStats;
  compact?: boolean;
  onTopicPress?: (topic: string) => void;
}

export function RepositoryStatsCard({
  stats,
  compact = false,
  onTopicPress,
}: RepositoryStatsCardProps) {
  const { colors } = useTheme();

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatSize = (kb: number): string => {
    if (kb >= 1024 * 1024) {
      return (kb / (1024 * 1024)).toFixed(2) + ' GB';
    }
    if (kb >= 1024) {
      return (kb / 1024).toFixed(2) + ' MB';
    }
    return kb + ' KB';
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

  const StatItem = ({ icon, label, value, color }: any) => (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={20} color={color || colors.textSecondary} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
    </View>
  );

  if (compact) {
    return (
      <View style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.compactHeader}>
          <View style={styles.compactTitle}>
            <Text style={[styles.compactName, { color: colors.text }]} numberOfLines={1}>
              {stats.fullName}
            </Text>
            {stats.isPrivate && (
              <Ionicons name="lock-closed" size={14} color={colors.danger} />
            )}
          </View>
          <View style={styles.compactStats}>
            <View style={styles.compactStat}>
              <Ionicons name="star-outline" size={14} color={colors.warning} />
              <Text style={[styles.compactStatText, { color: colors.textSecondary }]}>
                {formatNumber(stats.stars)}
              </Text>
            </View>
            <View style={styles.compactStat}>
              <Ionicons name="git-branch-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.compactStatText, { color: colors.textSecondary }]}>
                {formatNumber(stats.forks)}
              </Text>
            </View>
            <View style={styles.compactStat}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.info} />
              <Text style={[styles.compactStatText, { color: colors.textSecondary }]}>
                {formatNumber(stats.issues)}
              </Text>
            </View>
          </View>
        </View>
        
        {stats.language && (
          <View style={styles.compactLanguage}>
            <View
              style={[
                styles.languageDot,
                { backgroundColor: getLanguageColor(stats.language) },
              ]}
            />
            <Text style={[styles.compactLanguageText, { color: colors.textSecondary }]}>
              {stats.language}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.header}>
        <View>
          <Text style={[styles.fullName, { color: colors.text }]} numberOfLines={2}>
            {stats.fullName}
          </Text>
          {stats.description && (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={3}>
              {stats.description}
            </Text>
          )}
        </View>
        
        <View style={styles.badgeContainer}>
          {stats.isPrivate && (
            <View style={[styles.badge, { backgroundColor: colors.danger + '20' }]}>
              <Ionicons name="lock-closed" size={12} color={colors.danger} />
              <Text style={[styles.badgeText, { color: colors.danger }]}>Private</Text>
            </View>
          )}
          {stats.hasPages && (
            <View style={[styles.badge, { backgroundColor: colors.success + '20' }]}>
              <Ionicons name="globe-outline" size={12} color={colors.success} />
              <Text style={[styles.badgeText, { color: colors.success }]}>Pages</Text>
            </View>
          )}
          {stats.hasWiki && (
            <View style={[styles.badge, { backgroundColor: colors.info + '20' }]}>
              <Ionicons name="book-outline" size={12} color={colors.info} />
              <Text style={[styles.badgeText, { color: colors.info }]}>Wiki</Text>
            </View>
          )}
        </View>
      </View>

      {stats.topics && stats.topics.length > 0 && (
        <View style={styles.topicsContainer}>
          {stats.topics.slice(0, 8).map((topic, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.topic, { backgroundColor: colors.primary + '15' }]}
              onPress={() => onTopicPress?.(topic)}
            >
              <Text style={[styles.topicText, { color: colors.primary }]}>
                #{topic}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.statsGrid}>
        <StatItem
          icon="star-outline"
          label="Stars"
          value={formatNumber(stats.stars)}
          color={colors.warning}
        />
        <StatItem
          icon="git-branch-outline"
          label="Forks"
          value={formatNumber(stats.forks)}
          color={colors.textSecondary}
        />
        <StatItem
          icon="chatbubble-ellipses-outline"
          label="Issues"
          value={formatNumber(stats.issues)}
          color={colors.info}
        />
        <StatItem
          icon="eye-outline"
          label="Watchers"
          value={formatNumber(stats.watchers)}
          color={colors.textSecondary}
        />
        {stats.contributors && (
          <StatItem
            icon="people-outline"
            label="Contributors"
            value={formatNumber(stats.contributors)}
            color={colors.success}
          />
        )}
        <StatItem
          icon="code-slash-outline"
          label="Size"
          value={formatSize(stats.size)}
          color={colors.textSecondary}
        />
      </View>

      {(stats.language || stats.languages) && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Linguagens
          </Text>
          
          {stats.language && !stats.languages && (
            <View style={styles.primaryLanguage}>
              <View
                style={[
                  styles.languageDotLarge,
                  { backgroundColor: getLanguageColor(stats.language) },
                ]}
              />
              <Text style={[styles.languageText, { color: colors.text }]}>
                {stats.language}
              </Text>
            </View>
          )}

          {stats.languages && (
            <View style={styles.languagesList}>
              {Object.entries(stats.languages)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([lang, bytes], index) => {
                  const total = Object.values(stats.languages!).reduce((a, b) => a + b, 0);
                  const percentage = ((bytes / total) * 100).toFixed(1);
                  
                  return (
                    <View key={lang} style={styles.languageItem}>
                      <View style={styles.languageInfo}>
                        <View
                          style={[
                            styles.languageDot,
                            { backgroundColor: getLanguageColor(lang) },
                          ]}
                        />
                        <Text style={[styles.languageName, { color: colors.text }]}>
                          {lang}
                        </Text>
                      </View>
                      <View style={styles.languageBar}>
                        <View
                          style={[
                            styles.languageBarFill,
                            {
                              width: `${percentage}%`,
                              backgroundColor: getLanguageColor(lang),
                            },
                          ]}
                        />
                      </View>
                      <Text style={[styles.languagePercent, { color: colors.textSecondary }]}>
                        {percentage}%
                      </Text>
                    </View>
                  );
                })}
            </View>
          )}
        </View>
      )}

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Informações
        </Text>
        
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            Criado em:
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {formatDate(stats.createdAt)}
          </Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            Atualizado em:
          </Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>
            {formatDate(stats.updatedAt)}
          </Text>
        </View>
        
        {stats.lastCommit && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Último commit:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {formatDate(stats.lastCommit)}
            </Text>
          </View>
        )}
        
        {stats.license && (
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
              Licença:
            </Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>
              {stats.license}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  fullName: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 8,
    borderBottomWidth: 1,
  },
  topic: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  topicText: {
    fontSize: 13,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
  },
  statItem: {
    width: '30%',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  primaryLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  languageDotLarge: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  languageText: {
    fontSize: 15,
    fontWeight: '500',
  },
  languagesList: {
    gap: 12,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
    gap: 8,
  },
  languageName: {
    fontSize: 13,
  },
  languageBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  languageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  languagePercent: {
    fontSize: 12,
    width: 45,
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  compactCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  compactTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactName: {
    fontSize: 15,
    fontWeight: '600',
  },
  compactStats: {
    flexDirection: 'row',
    gap: 12,
  },
  compactStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  compactStatText: {
    fontSize: 12,
    fontWeight: '500',
  },
  compactLanguage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  compactLanguageText: {
    fontSize: 12,
  },
});

export default RepositoryStatsCard;
