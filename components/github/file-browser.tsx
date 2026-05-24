/**
 * GitHub File Browser Component
 * 
 * Displays and navigates through repository files and directories.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/lib/theme-provider';
import { useGitHub } from '@/hooks/use-github';
import type { GitHubFileContent } from '@/lib/github-integration';

interface FileBrowserProps {
  owner: string;
  repo: string;
  branch?: string;
  initialPath?: string;
  onFileSelect?: (file: GitHubFileContent, content?: string) => void;
}

interface FileItem extends GitHubFileContent {
  isParent?: boolean;
}

export function GitHubFileBrowser({
  owner,
  repo,
  branch = 'main',
  initialPath = '',
  onFileSelect,
}: FileBrowserProps) {
  const { getFileContents, downloadFile } = useGitHub();
  const { colors } = useTheme();
  
  const [currentPath, setCurrentPath] = useState(initialPath);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const loadDirectory = async (path: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getFileContents(owner, repo, path || '.', branch);
      
      if (Array.isArray(response)) {
        const sortedFiles = [...response].sort((a, b) => {
          // Directories first, then files
          if (a.type === 'dir' && b.type !== 'dir') return -1;
          if (a.type !== 'dir' && b.type === 'dir') return 1;
          // Alphabetical order
          return a.name.localeCompare(b.name);
        });
        
        // Add parent directory option if not at root
        if (path) {
          const parentItem: FileItem = {
            name: '..',
            path: path.split('/').slice(0, -1).join('/'),
            type: 'dir',
            isParent: true,
          } as any;
          setFiles([parentItem, ...sortedFiles]);
        } else {
          setFiles(sortedFiles);
        }
      } else {
        setError('Expected a directory but got a file');
      }
    } catch (err) {
      console.error('Error loading directory:', err);
      setError(err instanceof Error ? err.message : 'Failed to load directory');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadDirectory(currentPath);
  };

  const handleItemClick = async (item: FileItem) => {
    if (item.isParent) {
      setCurrentPath(item.path || '');
      return;
    }

    if (item.type === 'dir') {
      const newPath = currentPath ? `${currentPath}/${item.name}` : item.name;
      setCurrentPath(newPath);
    } else if (item.type === 'file') {
      try {
        const result = await downloadFile(owner, repo, item.path, branch);
        onFileSelect?.(item, result.content);
      } catch (err) {
        console.error('Error downloading file:', err);
      }
    }
  };

  const getFileIcon = (item: FileItem) => {
    if (item.type === 'dir') {
      return item.isParent ? 'arrow-undo-outline' : 'folder';
    }

    const ext = item.name.split('.').pop()?.toLowerCase() || '';
    
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'logo-javascript';
      case 'ts':
      case 'tsx':
        return 'code-slash';
      case 'py':
        return 'logo-python';
      case 'java':
        return 'coffee';
      case 'rb':
        return 'diamond';
      case 'go':
        return 'caret-forward';
      case 'rs':
        return 'cog';
      case 'php':
        return 'logo-php';
      case 'c':
      case 'cpp':
      case 'h':
        return 'hardware-chip';
      case 'cs':
        return 'logo-windows';
      case 'swift':
        return 'phone-portrait';
      case 'kt':
        return 'android';
      case 'html':
        return 'code';
      case 'css':
      case 'scss':
      case 'sass':
        return 'color-palette';
      case 'json':
        return 'document-text';
      case 'md':
        return 'document';
      case 'yaml':
      case 'yml':
        return 'document';
      case 'sh':
      case 'bash':
        return 'terminal';
      case 'sql':
        return 'database';
      case 'xml':
        return 'code-slash';
      default:
        return 'document-outline';
    }
  };

  const renderFileItem = ({ item }: { item: FileItem }) => (
    <TouchableOpacity
      style={[styles.fileItem, { borderBottomColor: colors.border }]}
      onPress={() => handleItemClick(item)}
      activeOpacity={0.7}
    >
      <View style={styles.fileIconContainer}>
        <Ionicons
          name={getFileIcon(item)}
          size={24}
          color={
            item.type === 'dir'
              ? colors.primary
              : colors.textSecondary
          }
        />
      </View>
      <View style={styles.fileInfo}>
        <Text
          style={[
            styles.fileName,
            { color: colors.text },
            item.type === 'dir' && { fontWeight: '600' },
          ]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {item.size !== undefined && item.type === 'file' && (
          <Text style={[styles.fileSize, { color: colors.textTertiary }]}>
            {formatFileSize(item.size)}
          </Text>
        )}
      </View>
      <Ionicons
        name={item.type === 'dir' ? 'chevron-forward' : 'download-outline'}
        size={20}
        color={colors.textTertiary}
      />
    </TouchableOpacity>
  );

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.pathContainer}>
        <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
        <Text style={[styles.pathText, { color: colors.text }]} numberOfLines={1}>
          {currentPath || '/'}
        </Text>
      </View>
      <Text style={[styles.branchBadge, { backgroundColor: colors.primary + '20', color: colors.primary }]}>
        <Ionicons name="git-branch-outline" size={14} />
        {' '}{branch}
      </Text>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Carregando arquivos...
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
          onPress={() => loadDirectory(currentPath)}
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
        data={files}
        renderItem={renderFileItem}
        keyExtractor={(item) => item.path || item.name}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  pathContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  pathText: {
    fontSize: 16,
    fontWeight: '500',
  },
  branchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  fileIconContainer: {
    width: 32,
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
  },
  fileSize: {
    fontSize: 12,
    marginTop: 2,
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
});

export default GitHubFileBrowser;
