import { Alert, View, StyleSheet, useWindowDimensions } from "react-native";
import { useState, useCallback, useEffect, useMemo } from "react";
import { CodeEditor } from "@/components/code-editor";
import { EditorToolbar } from "@/components/editor-toolbar";
import { EditorTabs } from "@/components/editor-tabs";
import { EditorStatusBar } from "@/components/editor-status-bar";
import { SyntaxErrorsPanel } from "@/components/syntax-errors-panel";
import { SearchReplaceModal } from "@/components/search-replace-modal";
import { ProjectSearchModal } from "@/components/project-search-modal";
import { LocalAIModal } from "@/components/local-ai-modal";
import { CodeSuggestions } from "@/components/code-suggestions";
import { CodeTemplates } from "@/components/code-templates";
import { LanguageSelector } from "@/components/language-selector";
import { EditorPreviewSplit, useSplitView } from "@/components/split-view";
import { WebViewPreview } from "@/components/webview-preview";
import { FileManager } from "@/components/file-manager";
import { ProjectTree } from "@/components/project-tree";
import { WorkspaceExplorer } from "@/components/workspace-explorer";
import { WorkspaceSearchPanel } from "@/components/workspace-search-panel";
import { EditorBreadcrumbs } from "@/components/editor-breadcrumbs";
import {
  CommandPalette,
  type CommandPaletteItem,
} from "@/components/command-palette";
import { QuickOpenModal } from "@/components/quick-open-modal";
import {
  WorkbenchBottomPanel,
  type WorkbenchBottomPanelTab,
} from "@/components/workbench-bottom-panel";
import { useEditor } from "@/lib/editor-context";
import { formatCode } from "@/lib/code-formatter";
import {
  isDesktopRuntime,
  openFile as openFileContent,
  pickFilesFromSystem,
} from "@/lib/file-system-manager";
import { detectSyntaxErrors } from "@/lib/python-analyzer";
import { detectHTMLErrors } from "@/lib/html-analyzer";
import { detectCSSErrors } from "@/lib/css-analyzer";
import { useColors } from "@/hooks/use-colors";
import type { SyntaxError } from "@/lib/types";
import { router } from "expo-router";
import { getOffsetFromLineAndColumn, replaceSelection } from "@/lib/editor-state";
import { getLanguageConfig, getLanguageFeatures } from "@/lib/types-extended";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import {
  formatShortcutDisplay,
  getShortcutByAction,
  type ShortcutAction,
} from "@/lib/keyboard-shortcuts";
import { getDesktopBridge } from "@/lib/desktop-bridge";
import type { LocalAIEditProposal } from "@/lib/local-ai";

type SidebarMode = 'explorer' | 'search';
type ProjectSearchSeed = {
  query: string;
  replacement: string;
  caseSensitive: boolean;
  wholeWord: boolean;
};

function getShortcutLabel(action: ShortcutAction): string | undefined {
  const shortcut = getShortcutByAction(action);
  return shortcut ? formatShortcutDisplay(shortcut.keys) : undefined;
}

function EditorScreenContent() {
  const colors = useColors();
  const {
    createNewFile,
    openFile,
    state,
    currentLanguage,
    setCurrentLanguage,
    saveCurrentFile,
    openFileFromSystem,
    openFileFromSystemAtRange,
    undo,
    redo,
    canUndo,
    canRedo,
    updateFileContent,
    replaceCurrentSelection,
    selectRange,
    settings,
  } = useEditor();

  const [syntaxErrors, setSyntaxErrors] = useState<SyntaxError[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showProjectSearchModal, setShowProjectSearchModal] = useState(false);
  const [projectSearchSeed, setProjectSearchSeed] = useState<ProjectSearchSeed | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showQuickOpen, setShowQuickOpen] = useState(false);
  const [showLocalAIModal, setShowLocalAIModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [showProjectTree, setShowProjectTree] = useState(false);
  const [showWorkspaceSidebar, setShowWorkspaceSidebar] = useState(true);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>('explorer');
  const [activeBottomPanel, setActiveBottomPanel] =
    useState<WorkbenchBottomPanelTab | null>(null);
  const { isPreviewVisible, togglePreview } = useSplitView();
  const { width } = useWindowDimensions();
  const shouldShowEmbeddedSidebar = width >= 980 && showWorkspaceSidebar;

  const handleNew = useCallback(() => {
    const ext = getLanguageConfig(currentLanguage).extension;
    const newFile = createNewFile(`ficheiro_${Date.now()}.${ext}`);
    openFile(newFile);
  }, [createNewFile, openFile, currentLanguage]);

  const handleOpenFromSystem = useCallback(async () => {
    if (isDesktopRuntime()) {
      const files = await pickFilesFromSystem();
      await Promise.all(files.filter((file) => !file.isDirectory).map((file) => openFileFromSystem(file.uri)));
      return;
    }

    setShowFileManager(true);
  }, [openFileFromSystem]);

  const handleQuickOpen = useCallback(() => {
    setShowQuickOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    try {
      await saveCurrentFile();
    } catch (error) {
      console.error('Erro ao guardar ficheiro:', error);
    }
  }, [saveCurrentFile]);

  const handleFormat = useCallback(() => {
    if (state.currentFile) {
      const formatted = formatCode(state.currentFile.content, currentLanguage, {
        indentSize: settings.indentSize,
      });
      updateFileContent(state.currentFile.id, formatted);
    }
  }, [currentLanguage, settings.indentSize, state.currentFile, updateFileContent]);

  const handleProjectSearch = useCallback(() => {
    if (width >= 980) {
      setSidebarMode('search');
      setShowWorkspaceSidebar(true);
      return;
    }

    setProjectSearchSeed(null);
    setShowProjectSearchModal(true);
  }, [width]);

  const handleReviewWorkspaceSearch = useCallback((seed: ProjectSearchSeed) => {
    setProjectSearchSeed(seed);
    setShowProjectSearchModal(true);
  }, []);

  const handleOpenProjectSearchFromAI = useCallback(
    (query: string) => {
      const seed: ProjectSearchSeed = {
        query,
        replacement: '',
        caseSensitive: false,
        wholeWord: false,
      };
      setProjectSearchSeed(seed);

      if (width >= 980) {
        setSidebarMode('search');
        setShowWorkspaceSidebar(true);
        return;
      }

      setShowProjectSearchModal(true);
    },
    [width],
  );

  const handleShowTerminalFromAI = useCallback(() => {
    setActiveBottomPanel('terminal');
    setShowLocalAIModal(false);
  }, []);

  const handleToggleWorkspace = useCallback(() => {
    if (width >= 980) {
      setSidebarMode('explorer');
      setShowWorkspaceSidebar((visible) =>
        sidebarMode === 'explorer' ? !visible : true,
      );
      return;
    }

    setShowProjectTree(true);
  }, [sidebarMode, width]);

  const handleToggleTerminal = useCallback(() => {
    setActiveBottomPanel((current) => (current === 'terminal' ? null : 'terminal'));
  }, []);

  const handleToggleProblems = useCallback(() => {
    setActiveBottomPanel((current) => (current === 'problems' ? null : 'problems'));
  }, []);

  const handleOpenNewWindow = useCallback(() => {
    void getDesktopBridge()?.openNewWindow();
  }, []);

  useEffect(() => {
    const content = state.currentFile?.content ?? '';
    const timeoutId = setTimeout(() => {
      let errors: SyntaxError[] = [];
      if (currentLanguage === 'python') errors = detectSyntaxErrors(content);
      else if (currentLanguage === 'html') errors = detectHTMLErrors(content);
      else if (currentLanguage === 'css') errors = detectCSSErrors(content);
      setSyntaxErrors(errors);
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [currentLanguage, state.currentFile?.content]);

  const handleApplySearchContent = useCallback(
    (content: string, selectionStart: number, selectionEnd: number) => {
      if (!state.currentFile) return;
      updateFileContent(state.currentFile.id, content);
      selectRange(selectionStart, selectionEnd);
    },
    [selectRange, state.currentFile, updateFileContent],
  );

  const handleSyntaxErrorPress = useCallback(
    (error: SyntaxError) => {
      const content = state.currentFile?.content ?? '';
      const offset = getOffsetFromLineAndColumn(
        content,
        Math.max(0, error.line - 1),
        Math.max(0, error.column - 1),
      );
      selectRange(offset, offset);
    },
    [selectRange, state.currentFile?.content],
  );

  const selectedText =
    state.currentFile?.content.slice(state.selectionStart, state.selectionEnd) ?? '';
  const currentLanguageFeatures = getLanguageFeatures(currentLanguage);
  const localAIOpenFiles = useMemo(
    () =>
      state.openFiles.map((file) => ({
        name: file.name,
        path: file.path,
        language: file.language,
        isModified: file.isModified,
        content: file.content,
      })),
    [state.openFiles],
  );

  const commandPaletteItems = useMemo<CommandPaletteItem[]>(() => {
    const items: CommandPaletteItem[] = [
      {
        id: 'new',
        label: 'Novo ficheiro',
        description: 'Cria um rascunho no editor',
        shortcut: getShortcutLabel('new'),
        icon: 'add-outline',
        onSelect: handleNew,
      },
      {
        id: 'open',
        label: 'Ir para ficheiro',
        description: 'Procura no workspace atual',
        shortcut: getShortcutLabel('open'),
        icon: 'document-text-outline',
        onSelect: handleQuickOpen,
      },
      {
        id: 'open-system',
        label: 'Abrir do computador',
        description: 'Escolhe um ficheiro fora do workspace',
        icon: 'folder-open-outline',
        onSelect: () => void handleOpenFromSystem(),
      },
      {
        id: 'save',
        label: 'Guardar ficheiro',
        description: 'Persiste o ficheiro atual',
        shortcut: getShortcutLabel('save'),
        icon: 'save-outline',
        onSelect: () => void handleSave(),
      },
      {
        id: 'search-file',
        label: 'Pesquisar neste ficheiro',
        shortcut: getShortcutLabel('search'),
        icon: 'search-outline',
        onSelect: () => setShowSearchModal(true),
      },
      {
        id: 'search-project',
        label: 'Pesquisar no projeto',
        description: 'Abre a pesquisa lateral do workspace',
        shortcut: getShortcutLabel('projectSearch'),
        icon: 'search-circle-outline',
        onSelect: handleProjectSearch,
      },
      {
        id: 'replace',
        label: 'Pesquisar e substituir',
        shortcut: getShortcutLabel('replace'),
        icon: 'swap-horizontal-outline',
        onSelect: () => setShowSearchModal(true),
      },
      {
        id: 'format',
        label: 'Formatar documento',
        shortcut: getShortcutLabel('format'),
        icon: 'brush-outline',
        onSelect: handleFormat,
      },
      {
        id: 'local-ai',
        label: 'Abrir IA local',
        description: 'Conversa com o assistente open source configurado',
        icon: 'sparkles-outline',
        onSelect: () => setShowLocalAIModal(true),
      },
      {
        id: 'explorer',
        label: 'Alternar explorador',
        description: 'Mostra ou recolhe a árvore do projeto',
        icon: 'git-branch-outline',
        onSelect: handleToggleWorkspace,
      },
      {
        id: 'terminal',
        label: 'Alternar terminal',
        shortcut: getShortcutLabel('terminal'),
        icon: 'terminal-outline',
        onSelect: handleToggleTerminal,
      },
      {
        id: 'settings',
        label: 'Abrir definições',
        shortcut: getShortcutLabel('settings'),
        icon: 'settings-outline',
        onSelect: () => router.push('/(tabs)/settings'),
      },
    ];

    if (currentLanguageFeatures.supportsPreview) {
      items.splice(items.length - 1, 0, {
        id: 'preview',
        label: 'Alternar preview',
        shortcut: getShortcutLabel('preview'),
        icon: 'eye-outline',
        onSelect: togglePreview,
      });
    }

    if (isDesktopRuntime()) {
      items.splice(items.length - 1, 0, {
        id: 'new-window',
        label: 'Nova janela',
        description: 'Abre outra bancada WGF Note',
        shortcut: getShortcutLabel('newWindow'),
        icon: 'copy-outline',
        onSelect: handleOpenNewWindow,
      });
    }

    return items;
  }, [
    currentLanguageFeatures.supportsPreview,
    handleFormat,
    handleNew,
    handleOpenFromSystem,
    handleOpenNewWindow,
    handleProjectSearch,
    handleQuickOpen,
    handleSave,
    handleToggleTerminal,
    handleToggleWorkspace,
    togglePreview,
  ]);

  const handleApplyAIProposal = useCallback(
    (
      proposal: LocalAIEditProposal,
      source: { start: number; end: number; text: string },
    ) => {
      if (!state.currentFile) return;

      const currentTargetText = state.currentFile.content.slice(source.start, source.end);

      if (source.text !== currentTargetText) {
        Alert.alert(
          'IA local',
          'O conteúdo alvo mudou desde que a proposta foi gerada. Gere novamente antes de aplicar.',
        );
        return;
      }

      const result = replaceSelection(
        state.currentFile.content,
        source.start,
        source.end,
        proposal.replacement,
      );
      updateFileContent(state.currentFile.id, result.content);
      selectRange(result.caret, result.caret);
      setShowLocalAIModal(false);
    },
    [
      selectRange,
      state.currentFile,
      updateFileContent,
    ],
  );

  const handleOpenAIReference = useCallback(
    async (path: string, line = 1, column = 1) => {
      try {
        const openFileEntry = state.openFiles.find((file) => file.path === path);
        const content = openFileEntry?.content ?? (await openFileContent(path));
        const offset = getOffsetFromLineAndColumn(
          content,
          Math.max(0, line - 1),
          Math.max(0, column - 1),
        );

        await openFileFromSystemAtRange(path, offset, offset);
        setShowLocalAIModal(false);
      } catch (error) {
        console.error('Erro ao abrir referência da IA local:', error);
        Alert.alert('IA local', 'Não foi possível abrir a referência indicada.');
      }
    },
    [openFileFromSystemAtRange, state.openFiles],
  );

  useKeyboardShortcuts({
    onSave: () => void handleSave(),
    onFormat: handleFormat,
    onOpen: handleQuickOpen,
    onNew: handleNew,
    onUndo: canUndo ? undo : undefined,
    onRedo: canRedo ? redo : undefined,
    onSearch: () => setShowSearchModal(true),
    onReplace: () => setShowSearchModal(true),
    onPreview: currentLanguageFeatures.supportsPreview ? togglePreview : undefined,
    onProjectSearch: handleProjectSearch,
    onCommandPalette: () => setShowCommandPalette(true),
    onTerminal: handleToggleTerminal,
    onNewWindow: isDesktopRuntime() ? handleOpenNewWindow : undefined,
    onSettings: () => router.push('/(tabs)/settings'),
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          flexDirection: 'column',
        },
        workbenchBody: {
          flex: 1,
          flexDirection: 'row',
          minHeight: 0,
        },
        sidebar: {
          width: 286,
          flexShrink: 0,
        },
        editorColumn: {
          flex: 1,
          minWidth: 0,
          backgroundColor: colors.background,
        },
        mainContent: {
          flex: 1,
          width: '100%',
        },
      }),
    [colors.background],
  );

  return (
    <View style={styles.container}>
      {/* Editor Toolbar at the top */}
      <EditorToolbar
        onNew={handleNew}
        onOpen={handleOpenFromSystem}
        onSave={handleSave}
        onUndo={canUndo ? undo : undefined}
        onRedo={canRedo ? redo : undefined}
        onSearch={() => setShowSearchModal(true)}
        onProjectSearch={handleProjectSearch}
        onCommandPalette={() => setShowCommandPalette(true)}
        onLocalAI={() => setShowLocalAIModal(true)}
        onSettings={() => router.push('/(tabs)/settings')}
        onTemplates={() => setShowTemplates(true)}
        onSuggestions={() => setShowSuggestions(true)}
        onLanguageSelect={() => setShowLanguageSelector(true)}
        onFormat={handleFormat}
        onPreview={currentLanguageFeatures.supportsPreview ? togglePreview : undefined}
        onProjectTree={handleToggleWorkspace}
        onFileManager={() => setShowFileManager(true)}
        onProblems={handleToggleProblems}
        onTerminal={handleToggleTerminal}
        problemsActive={activeBottomPanel === 'problems'}
        terminalActive={activeBottomPanel === 'terminal'}
      />

      <View style={styles.workbenchBody}>
        {shouldShowEmbeddedSidebar ? (
          <View style={styles.sidebar}>
            {sidebarMode === 'explorer' ? (
              <WorkspaceExplorer />
            ) : (
              <WorkspaceSearchPanel
                initialQuery={projectSearchSeed?.query}
                initialReplacement={projectSearchSeed?.replacement}
                initialCaseSensitive={projectSearchSeed?.caseSensitive}
                initialWholeWord={projectSearchSeed?.wholeWord}
                onAdvancedSearch={handleReviewWorkspaceSearch}
              />
            )}
          </View>
        ) : null}

        <View style={styles.editorColumn}>
          <EditorTabs />
          <EditorBreadcrumbs
            onOpenSearch={handleProjectSearch}
            onOpenPalette={() => setShowCommandPalette(true)}
          />

          {/* Main content area */}
          <View style={styles.mainContent}>
            <EditorPreviewSplit
              language={currentLanguage}
              isPreviewVisible={isPreviewVisible}
              onTogglePreview={togglePreview}
              editor={<CodeEditor />}
              preview={
                <WebViewPreview
                  code={state.currentFile?.content || ''}
                  language={currentLanguage === 'css' ? 'css' : 'html'}
                />
              }
            />
          </View>

          {/* Conditional Panels */}
          {activeBottomPanel ? (
            <WorkbenchBottomPanel
              activeTab={activeBottomPanel}
              errors={syntaxErrors}
              onSelectTab={setActiveBottomPanel}
              onClose={() => setActiveBottomPanel(null)}
              onErrorPress={handleSyntaxErrorPress}
            />
          ) : syntaxErrors.length > 0 ? (
            <SyntaxErrorsPanel errors={syntaxErrors} onErrorPress={handleSyntaxErrorPress} />
          ) : null}
        </View>
      </View>

      {/* Status Bar at the bottom */}
      <EditorStatusBar />

      {/* Modals */}
      <SearchReplaceModal
        visible={showSearchModal}
        content={state.currentFile?.content ?? ''}
        selectionStart={state.selectionStart}
        selectionEnd={state.selectionEnd}
        onClose={() => setShowSearchModal(false)}
        onSelectRange={selectRange}
        onApplyContent={handleApplySearchContent}
      />
      <ProjectSearchModal
        visible={showProjectSearchModal}
        onClose={() => {
          setShowProjectSearchModal(false);
          setProjectSearchSeed(null);
        }}
        initialQuery={projectSearchSeed?.query}
        initialReplacement={projectSearchSeed?.replacement}
        initialCaseSensitive={projectSearchSeed?.caseSensitive}
        initialWholeWord={projectSearchSeed?.wholeWord}
      />
      <CommandPalette
        visible={showCommandPalette}
        commands={commandPaletteItems}
        onClose={() => setShowCommandPalette(false)}
      />
      <QuickOpenModal
        visible={showQuickOpen}
        onClose={() => setShowQuickOpen(false)}
      />
      <LocalAIModal
        visible={showLocalAIModal}
        enabled={settings.localAiEnabled}
        provider={settings.localAiProvider}
        baseUrl={settings.localAiBaseUrl}
        model={settings.localAiModel}
        apiKey={settings.localAiApiKey}
        fileName={state.currentFile?.name ?? 'sem-ficheiro'}
        filePath={state.currentFile?.path ?? null}
        language={currentLanguage}
        content={state.currentFile?.content ?? ''}
        selectedText={selectedText}
        selectionStart={state.selectionStart}
        selectionEnd={state.selectionEnd}
        openFiles={localAIOpenFiles}
        onClose={() => setShowLocalAIModal(false)}
        onApplyProposal={handleApplyAIProposal}
        onOpenReference={handleOpenAIReference}
        onOpenProjectSearch={handleOpenProjectSearchFromAI}
        onShowTerminal={handleShowTerminalFromAI}
      />
      <CodeSuggestions
        visible={showSuggestions}
        code={state.currentFile?.content || ''}
        line={state.cursorLine}
        column={state.cursorColumn}
        onSelectSuggestion={(suggestion) => replaceCurrentSelection(suggestion.insertText ?? suggestion.text)}
        onClose={() => setShowSuggestions(false)}
      />
      <CodeTemplates
        visible={showTemplates}
        onSelectTemplate={(t) => {
          if (state.currentFile && t.code) {
            replaceCurrentSelection(t.code);
            setShowTemplates(false);
          }
        }}
        onClose={() => setShowTemplates(false)}
      />
      <LanguageSelector
        visible={showLanguageSelector}
        currentLanguage={currentLanguage}
        onSelectLanguage={(l) => { setCurrentLanguage(l); setShowLanguageSelector(false); }}
        onClose={() => setShowLanguageSelector(false)}
      />
      <FileManager
        visible={showFileManager}
        onSelectFile={(file) => {
          const path = 'uri' in file ? file.uri : file.path;
          if (path) {
            openFileFromSystem(path);
          }
        }}
        onClose={() => setShowFileManager(false)}
      />
      <ProjectTree
        visible={showProjectTree}
        onClose={() => setShowProjectTree(false)}
      />
    </View>
  );
}

export default function HomeScreen() {
  return <EditorScreenContent />;
}
