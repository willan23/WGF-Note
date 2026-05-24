/**
 * GitHub Integration Screen
 * 
 * Main screen for exploring GitHub repositories, files, commits, and more.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';
import { useGitHub } from '@/hooks/use-github';
import { GitHubLoginButton } from '@/components/github/github-login-button';
import { RepositoryCard } from '@/components/github/repository-card';
import { RepositoryStatsCard } from '@/components/github/repository-stats-card';
import { GitHubFileBrowser } from '@/components/github/file-browser';
import { GitHubCommitList } from '@/components/github/commit-list';
import type { GitHubRepository } from '@/lib/github-integration';

type TabType = 'repositories' | 'files' | 'commits' | 'stats';

export default function GitHubScreen() {
  const { colors } = useTheme();
  const { isAuthenticated, user, fetchRepositories, searchRepositories } = useGitHub();
  
  const [activeTab, setActiveTab] = useState<TabType>('repositories');
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);

  const loadRepositories = async () => {
    try {
      setLoading(true);
      const repos = await fetchRepositories({ per_page: 50 });
      setRepositories(repos);
    } catch (error) {
      console.error('Error loading repositories:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setShowSearchModal(false);
      return;
    }

    try {
      setLoading(true);
      const results = await searchRepositories(searchQuery, { per_page: 50 });
      if (results?.items) {
        setRepositories(results.items);
      }
      setShowSearchModal(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Error searching repositories:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <View style={[styles.authContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="logo-github" size={80} color={colors.textSecondary} />
          <Text style={[styles.authTitle, { color: colors.text }]}>
            Conecte-se ao GitHub
          </Text>
          <Text style={[styles.authSubtitle, { color: colors.textSecondary }]}>
            Acesse seus repositórios, explore código, visualize commits e muito mais.
          </Text>
          <GitHubLoginButton size="large" />
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="folder-outline" size={24} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Navegue pelos arquivos dos repositórios
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="git-branch-outline" size={24} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Visualize o histórico de commits
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="stats-chart-outline" size={24} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Veja estatísticas detalhadas
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="search-outline" size={24} color={colors.primary} />
              <Text style={[styles.featureText, { color: colors.text }]}>
                Busque repositórios no GitHub
              </Text>
            </View>
          </View>
        </View>
      );
    }

    if (!selectedRepo && activeTab !== 'repositories') {
      return (
        <View style={[styles.selectRepoContainer, { backgroundColor: colors.card }]}>
          <Ionicons name="code-slash-outline" size={64} color={colors.textSecondary} />
          <Text style={[styles.selectRepoTitle, { color: colors.text }]}>
            Selecione um repositório
          </Text>
          <Text style={[styles.selectRepoSubtitle, { color: colors.textSecondary }]}>
            Escolha um repositório da lista para visualizar detalhes
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => setActiveTab('repositories')}
          >
            <Text style={styles.backButtonText}>Ver Repositórios</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (activeTab) {
      case 'repositories':
        return (
          <ScrollView
            style={styles.scrollView}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  loadRepositories();
                }}
                tintColor={colors.primary}
              />
            }
          >
            <View style={styles.repoListHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Seus Repositórios
              </Text>
              <TouchableOpacity
                style={[styles.searchButton, { backgroundColor: colors.primary }]}
                onPress={() => setShowSearchModal(true)}
              >
                <Ionicons name="search-outline" size={20} color="#ffffff" />
                <Text style={styles.searchButtonText}>Buscar</Text>
              </TouchableOpacity>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <Ionicons name="hourglass-outline" size={32} color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Carregando repositórios...
                </Text>
              </View>
            ) : repositories.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="folder-open-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhum repositório encontrado
                </Text>
              </View>
            ) : (
              repositories.map(repo => (
                <RepositoryCard
                  key={repo.id}
                  repository={repo}
                  showOwner
                  onPress={(r) => {
                    setSelectedRepo(r);
                    setActiveTab('stats');
                  }}
                />
              ))
            )}
          </ScrollView>
        );

      case 'files':
        return selectedRepo ? (
          <GitHubFileBrowser
            owner={selectedRepo.owner.login}
            repo={selectedRepo.name}
            onFileSelect={(file, content) => {
              console.log('File selected:', file.path, content?.substring(0, 100));
            }}
          />
        ) : null;

      case 'commits':
        return selectedRepo ? (
          <GitHubCommitList
            owner={selectedRepo.owner.login}
            repo={selectedRepo.name}
            onCommitSelect={(commit) => {
              console.log('Commit selected:', commit.sha);
            }}
          />
        ) : null;

      case 'stats':
        return selectedRepo ? (
          <ScrollView style={styles.scrollView}>
            <View style={styles.statsHeader}>
              <TouchableOpacity
                style={styles.backToRepos}
                onPress={() => setSelectedRepo(null)}
              >
                <Ionicons name="arrow-back" size={20} color={colors.primary} />
                <Text style={[styles.backToReposText, { color: colors.primary }]}>
                  Voltar aos repositórios
                </Text>
              </TouchableOpacity>
            </View>
            <RepositoryStatsCard
              stats={{
                name: selectedRepo.name,
                fullName: selectedRepo.full_name,
                description: selectedRepo.description,
                stars: selectedRepo.stargazers_count,
                forks: selectedRepo.forks_count,
                issues: selectedRepo.open_issues_count,
                watchers: selectedRepo.watchers_count,
                size: selectedRepo.size,
                language: selectedRepo.language,
                createdAt: selectedRepo.created_at,
                updatedAt: selectedRepo.updated_at,
                isPrivate: selectedRepo.private,
                hasWiki: selectedRepo.has_wiki ?? false,
                hasPages: selectedRepo.has_pages ?? false,
                license: selectedRepo.license?.name || null,
                topics: selectedRepo.topics || [],
              }}
              onTopicPress={(topic) => {
                console.log('Topic pressed:', topic);
                setShowSearchModal(true);
                setSearchQuery(topic);
              }}
            />
            
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setActiveTab('files')}
              >
                <Ionicons name="folder-open-outline" size={24} color={colors.primary} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Arquivos</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => setActiveTab('commits')}
              >
                <Ionicons name="git-branch-outline" size={24} color={colors.primary} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>Commits</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.quickAction, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  // Open in browser
                  if (selectedRepo) {
                    require('expo-linking').openURL(selectedRepo.html_url);
                  }
                }}
              >
                <Ionicons name="open-outline" size={24} color={colors.primary} />
                <Text style={[styles.quickActionText, { color: colors.text }]}>GitHub</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : null;

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isAuthenticated && (
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.userInfo}>
            {user?.avatar_url ? (
              <View style={[styles.avatar, { backgroundColor: colors.background }]}>
                <Ionicons name="person-circle" size={40} color={colors.primary} />
              </View>
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="person" size={24} color={colors.primary} />
              </View>
            )}
            <View style={styles.userInfoText}>
              <Text style={[styles.userName, { color: colors.text }]}>
                {user?.name || user?.login}
              </Text>
              <Text style={[styles.userLogin, { color: colors.textTertiary }]}>
                @{user?.login}
              </Text>
            </View>
          </View>
          
          <GitHubLoginButton size="small" variant="outline" />
        </View>
      )}

      {isAuthenticated && (
        <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'repositories' && { borderBottomColor: colors.primary },
              ]}
              onPress={() => {
                setActiveTab('repositories');
                setSelectedRepo(null);
              }}
            >
              <Ionicons
                name="folder-outline"
                size={20}
                color={activeTab === 'repositories' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'repositories' ? colors.primary : colors.textSecondary },
                ]}
              >
                Repositórios
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'files' && { borderBottomColor: colors.primary },
                !selectedRepo && styles.tabDisabled,
              ]}
              onPress={() => selectedRepo && setActiveTab('files')}
              disabled={!selectedRepo}
            >
              <Ionicons
                name="document-outline"
                size={20}
                color={activeTab === 'files' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'files' ? colors.primary : colors.textSecondary },
                ]}
              >
                Arquivos
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'commits' && { borderBottomColor: colors.primary },
                !selectedRepo && styles.tabDisabled,
              ]}
              onPress={() => selectedRepo && setActiveTab('commits')}
              disabled={!selectedRepo}
            >
              <Ionicons
                name="git-branch-outline"
                size={20}
                color={activeTab === 'commits' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'commits' ? colors.primary : colors.textSecondary },
                ]}
              >
                Commits
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'stats' && { borderBottomColor: colors.primary },
                !selectedRepo && styles.tabDisabled,
              ]}
              onPress={() => selectedRepo && setActiveTab('stats')}
              disabled={!selectedRepo}
            >
              <Ionicons
                name="stats-chart-outline"
                size={20}
                color={activeTab === 'stats' ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'stats' ? colors.primary : colors.textSecondary },
                ]}
              >
                Stats
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {renderContent()}

      {/* Search Modal */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Buscar Repositórios
              </Text>
              <TouchableOpacity onPress={() => setShowSearchModal(false)}>
                <Ionicons name="close-outline" size={28} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={[styles.searchInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Digite sua busca..."
                placeholderTextColor={colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                autoFocus
              />
            </View>
            
            <TouchableOpacity
              style={[styles.searchActionButton, { backgroundColor: colors.primary }]}
              onPress={handleSearch}
            >
              <Text style={styles.searchActionText}>Buscar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfoText: {
    gap: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userLogin: {
    fontSize: 13,
  },
  tabBar: {
    borderBottomWidth: 1,
    paddingHorizontal: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabDisabled: {
    opacity: 0.5,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  featuresList: {
    marginTop: 32,
    width: '100%',
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
  },
  selectRepoContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectRepoTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  selectRepoSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  repoListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    padding: 48,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
  },
  statsHeader: {
    padding: 16,
  },
  backToRepos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  backToReposText: {
    fontSize: 15,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  searchActionButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchActionText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
