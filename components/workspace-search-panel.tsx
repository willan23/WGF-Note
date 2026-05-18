import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/use-colors';
import { useEditor } from '@/lib/editor-context';
import { listFiles, openFile } from '@/lib/file-system-manager';
import {
  searchWorkspace,
  type WorkspaceSearchResult,
} from '@/lib/workspace-search';

type WorkspaceSearchPanelProps = {
  onAdvancedSearch?: () => void;
};

type SearchGroup = {
  path: string;
  relativePath: string;
  results: WorkspaceSearchResult[];
};

const ResultRow = memo(function ResultRow({
  result,
  onOpen,
  styles,
  colors,
}: {
  result: WorkspaceSearchResult;
  onOpen: (result: WorkspaceSearchResult) => void;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Abrir resultado em ${result.relativePath}, linha ${result.line + 1}`}
      onPress={() => onOpen(result)}
      style={({ pressed }) => [styles.resultRow, pressed && styles.resultRowPressed]}
    >
      <Text style={styles.resultMeta}>{result.line + 1}:{result.column + 1}</Text>
      <Text style={styles.resultPreview} numberOfLines={2}>
        {result.preview || 'Linha vazia'}
      </Text>
    </Pressable>
  );
});

function createStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.border,
    },
    header: {
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    eyebrow: {
      color: colors.muted,
      fontSize: 10,
      textTransform: 'uppercase',
      fontWeight: '800',
      letterSpacing: 0.8,
    },
    title: {
      color: colors.foreground,
      fontSize: 16,
      fontWeight: '700',
      marginTop: 2,
    },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: 8,
      paddingHorizontal: 10,
    },
    input: {
      flex: 1,
      color: colors.foreground,
      fontSize: 12,
      paddingVertical: 9,
    },
    toolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    filters: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    filterButton: {
      minWidth: 26,
      minHeight: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    filterButtonActive: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}16`,
    },
    filterLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
    },
    filterLabelActive: {
      color: colors.primary,
    },
    resultCount: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    advancedButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    advancedText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    list: {
      paddingVertical: 6,
    },
    group: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    groupHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      backgroundColor: colors.background,
    },
    groupTitle: {
      flex: 1,
      color: colors.foreground,
      fontSize: 12,
      fontWeight: '700',
    },
    groupCount: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
    },
    resultRow: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 4,
    },
    resultRowPressed: {
      backgroundColor: `${colors.primary}10`,
    },
    resultMeta: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    resultPreview: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 17,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 22,
    },
    emptyText: {
      color: colors.muted,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      marginTop: 10,
    },
    loadingText: {
      color: colors.muted,
      fontSize: 12,
      marginTop: 10,
    },
  });
}

export function WorkspaceSearchPanel({
  onAdvancedSearch,
}: WorkspaceSearchPanelProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    state,
    openFileFromSystemAtRange,
    workspaceRootUri: rootDirectoryUri,
  } = useEditor();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WorkspaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);

  const openFileContentByPath = useMemo(
    () =>
      new Map(
        state.openFiles.flatMap((file) =>
          file.path ? [[file.path, file.content] as const] : [],
        ),
      ),
    [state.openFiles],
  );

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    let cancelled = false;
    setIsSearching(true);

    const timeoutId = setTimeout(() => {
      void searchWorkspace(
        rootDirectoryUri,
        trimmedQuery,
        { caseSensitive, wholeWord, maxResults: 120 },
        {
          listFiles,
          readFile: async (path) => openFileContentByPath.get(path) ?? openFile(path),
        },
      )
        .then((nextResults) => {
          if (!cancelled) {
            setResults(nextResults);
          }
        })
        .catch((error) => {
          console.error('Erro ao pesquisar no workspace:', error);
          if (!cancelled) {
            setResults([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsSearching(false);
          }
        });
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [caseSensitive, openFileContentByPath, query, rootDirectoryUri, wholeWord]);

  const groupedResults = useMemo<SearchGroup[]>(() => {
    const groups = new Map<string, SearchGroup>();

    results.forEach((result) => {
      const existing = groups.get(result.path);
      if (existing) {
        existing.results.push(result);
        return;
      }

      groups.set(result.path, {
        path: result.path,
        relativePath: result.relativePath,
        results: [result],
      });
    });

    return Array.from(groups.values());
  }, [results]);

  const handleOpenResult = useCallback(
    async (result: WorkspaceSearchResult) => {
      try {
        await openFileFromSystemAtRange(result.path, result.start, result.end);
      } catch (error) {
        console.error('Erro ao abrir resultado da pesquisa lateral:', error);
      }
    },
    [openFileFromSystemAtRange],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Workspace</Text>
          <Text style={styles.title}>Pesquisar</Text>
        </View>

        <View style={styles.inputWrap}>
          <Ionicons name="search-outline" size={15} color={colors.muted} />
          <TextInput
            accessibilityLabel="Pesquisar no projeto"
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Pesquisar em todo o projeto…"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={styles.input}
          />
        </View>

        <View style={styles.toolbar}>
          <Text style={styles.resultCount}>
            {results.length} resultado{results.length !== 1 ? 's' : ''}
          </Text>
          <View style={styles.filters}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Alternar maiúsculas e minúsculas"
              accessibilityState={{ selected: caseSensitive }}
              onPress={() => setCaseSensitive((value) => !value)}
              style={[
                styles.filterButton,
                caseSensitive && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  caseSensitive && styles.filterLabelActive,
                ]}
              >
                Aa
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Alternar palavra inteira"
              accessibilityState={{ selected: wholeWord }}
              onPress={() => setWholeWord((value) => !value)}
              style={[
                styles.filterButton,
                wholeWord && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterLabel,
                  wholeWord && styles.filterLabelActive,
                ]}
              >
                .w
              </Text>
            </Pressable>
            {onAdvancedSearch ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Abrir pesquisa avançada"
                style={styles.advancedButton}
                onPress={onAdvancedSearch}
              >
                <Ionicons name="options-outline" size={14} color={colors.primary} />
                <Text style={styles.advancedText}>Substituir</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </View>

      {isSearching ? (
        <View style={styles.empty}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>A pesquisar o workspace…</Text>
        </View>
      ) : groupedResults.length > 0 ? (
        <FlatList
          data={groupedResults}
          keyExtractor={(item) => item.path}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.group}>
              <View style={styles.groupHeader}>
                <Ionicons name="document-text-outline" size={14} color={colors.primary} />
                <Text style={styles.groupTitle} numberOfLines={1}>
                  {item.relativePath}
                </Text>
                <Text style={styles.groupCount}>{item.results.length}</Text>
              </View>
              {item.results.map((result) => (
                <ResultRow
                  key={`${result.path}:${result.start}`}
                  result={result}
                  onOpen={handleOpenResult}
                  styles={styles}
                  colors={colors}
                />
              ))}
            </View>
          )}
        />
      ) : (
        <View style={styles.empty}>
          <Ionicons
            name={query.trim() ? 'search-outline' : 'folder-open-outline'}
            size={42}
            color={colors.border}
          />
          <Text style={styles.emptyText}>
            {query.trim()
              ? 'Nenhuma correspondência encontrada nos ficheiros suportados.'
              : 'Pesquisa rápida lateral. Para substituir em massa, usa a ação Substituir.'}
          </Text>
        </View>
      )}
    </View>
  );
}
