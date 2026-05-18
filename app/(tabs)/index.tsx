import { Alert, View, StyleSheet } from "react-native";
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
import { useEditor } from "@/lib/editor-context";
import { formatCode } from "@/lib/code-formatter";
import { openFile as openFileContent } from "@/lib/file-system-manager";
import { detectSyntaxErrors } from "@/lib/python-analyzer";
import { detectHTMLErrors } from "@/lib/html-analyzer";
import { detectCSSErrors } from "@/lib/css-analyzer";
import { useColors } from "@/hooks/use-colors";
import type { SyntaxError } from "@/lib/types";
import { router } from "expo-router";
import { getOffsetFromLineAndColumn, replaceSelection } from "@/lib/editor-state";
import { getLanguageConfig, getLanguageFeatures } from "@/lib/types-extended";

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
  const [showLocalAIModal, setShowLocalAIModal] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const [showProjectTree, setShowProjectTree] = useState(false);
  const { isPreviewVisible, togglePreview } = useSplitView();

  const handleNew = useCallback(() => {
    const ext = getLanguageConfig(currentLanguage).extension;
    const newFile = createNewFile(`ficheiro_${Date.now()}.${ext}`);
    openFile(newFile);
  }, [createNewFile, openFile, currentLanguage]);

  const handleOpen = useCallback(async () => {
    setShowFileManager(true);
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

  const handleApplyAIProposal = useCallback(
    (
      proposal: { replacement: string },
      source: { start: number; end: number; text: string },
    ) => {
      if (!state.currentFile) return;

      const currentSelectedText = state.currentFile.content.slice(
        state.selectionStart,
        state.selectionEnd,
      );

      if (
        source.start !== state.selectionStart ||
        source.end !== state.selectionEnd ||
        source.text !== currentSelectedText
      ) {
        Alert.alert(
          'IA local',
          'A seleção mudou desde que a proposta foi gerada. Gere novamente antes de aplicar.',
        );
        return;
      }

      const result = replaceSelection(
        state.currentFile.content,
        state.selectionStart,
        state.selectionEnd,
        proposal.replacement,
      );
      updateFileContent(state.currentFile.id, result.content);
      selectRange(result.caret, result.caret);
      setShowLocalAIModal(false);
    },
    [
      selectRange,
      state.currentFile,
      state.selectionEnd,
      state.selectionStart,
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: colors.background,
          flexDirection: 'column',
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
        onOpen={handleOpen}
        onSave={handleSave}
        onUndo={canUndo ? undo : undefined}
        onRedo={canRedo ? redo : undefined}
        onSearch={() => setShowSearchModal(true)}
        onProjectSearch={() => setShowProjectSearchModal(true)}
        onLocalAI={() => setShowLocalAIModal(true)}
        onSettings={() => router.push('/(tabs)/settings')}
        onTemplates={() => setShowTemplates(true)}
        onSuggestions={() => setShowSuggestions(true)}
        onLanguageSelect={() => setShowLanguageSelector(true)}
        onFormat={handleFormat}
        onPreview={currentLanguageFeatures.supportsPreview ? togglePreview : undefined}
        onProjectTree={() => setShowProjectTree(true)}
        onFileManager={() => setShowFileManager(true)}
      />
      <EditorTabs />

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
      {syntaxErrors.length > 0 && (
        <SyntaxErrorsPanel errors={syntaxErrors} onErrorPress={handleSyntaxErrorPress} />
      )}

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
        onClose={() => setShowProjectSearchModal(false)}
      />
      <LocalAIModal
        visible={showLocalAIModal}
        enabled={settings.localAiEnabled}
        baseUrl={settings.localAiBaseUrl}
        model={settings.localAiModel}
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
