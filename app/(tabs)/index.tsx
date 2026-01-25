import { View, StyleSheet, Platform } from "react-native";
import { useState, useCallback } from "react";
import { CodeEditor } from "@/components/code-editor";
import { EditorToolbar } from "@/components/editor-toolbar";
import { EditorStatusBar } from "@/components/editor-status-bar";
import { SyntaxErrorsPanel } from "@/components/syntax-errors-panel";
import { SearchReplaceModal } from "@/components/search-replace-modal";
import { CodeExecutionPanel } from "@/components/code-execution-panel";
import { CodeSuggestions } from "@/components/code-suggestions";
import { CodeTemplates } from "@/components/code-templates";
import { LanguageSelector } from "@/components/language-selector";
import { EditorPreviewSplit, useSplitView } from "@/components/split-view";
import { WebViewPreview } from "@/components/webview-preview";
import { FileManager } from "@/components/file-manager";
import { EditorProvider, useEditor } from "@/lib/editor-context";
import { formatCode } from "@/lib/code-formatter";
import { detectSyntaxErrors } from "@/lib/python-analyzer";
import { detectHTMLErrors } from "@/lib/html-analyzer";
import { detectCSSErrors } from "@/lib/css-analyzer";
import { useColors } from "@/hooks/use-colors";

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
    undo,
    redo,
    canUndo,
    canRedo,
    updateFileContent,
  } = useEditor();

  const [syntaxErrors, setSyntaxErrors] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showLanguageSelector, setShowLanguageSelector] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const { isPreviewVisible, togglePreview } = useSplitView();

  const handleNew = useCallback(() => {
    const ext = currentLanguage === 'python' ? 'py' : currentLanguage;
    const newFile = createNewFile(`script_${Date.now()}.${ext}`);
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
      const formatted = formatCode(state.currentFile.content, currentLanguage);
      updateFileContent(state.currentFile.id, formatted);
    }
  }, [state.currentFile, currentLanguage, updateFileContent]);

  const handleContentChange = useCallback((content: string) => {
    let errors: any[] = [];
    if (currentLanguage === 'python') errors = detectSyntaxErrors(content);
    else if (currentLanguage === 'html') errors = detectHTMLErrors(content);
    else if (currentLanguage === 'css') errors = detectCSSErrors(content);
    setSyntaxErrors(errors);
  }, [currentLanguage]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      flexDirection: 'column',
    }
  });

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
        onSettings={() => { }}
        onExecute={() => setShowExecutionPanel(!showExecutionPanel)}
        onTemplates={() => setShowTemplates(true)}
        onSuggestions={() => setShowSuggestions(true)}
        onLanguageSelect={() => setShowLanguageSelector(true)}
        onFormat={handleFormat}
        onPreview={togglePreview}
        onFileManager={() => setShowFileManager(true)}
      />

      {/* Main content area */}
      <View style={{ flex: 1, width: '100%' }}>
        <EditorPreviewSplit
          language={currentLanguage}
          isPreviewVisible={isPreviewVisible}
          onTogglePreview={togglePreview}
          editor={<CodeEditor onContentChange={handleContentChange} />}
          preview={
            <WebViewPreview
              code={state.currentFile?.content || ''}
              language={currentLanguage === 'python' ? 'html' : currentLanguage as any}
            />
          }
        />
      </View>

      {/* Conditional Panels */}
      {showExecutionPanel && <CodeExecutionPanel />}
      {syntaxErrors.length > 0 && <SyntaxErrorsPanel errors={syntaxErrors} />}

      {/* Status Bar at the bottom */}
      <EditorStatusBar />

      {/* Modals */}
      <SearchReplaceModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSearch={(query) => console.log('Searching:', query)}
        onReplace={(q, r) => state.currentFile && updateFileContent(state.currentFile.id, state.currentFile.content.replace(q, r))}
        onReplaceAll={(q, r) => state.currentFile && updateFileContent(state.currentFile.id, state.currentFile.content.split(q).join(r))}
      />
      <CodeSuggestions
        visible={showSuggestions}
        code={state.currentFile?.content || ''}
        line={state.cursorLine}
        onSelectSuggestion={(s) => state.currentFile && updateFileContent(state.currentFile.id, state.currentFile.content + s.text)}
        onClose={() => setShowSuggestions(false)}
      />
      <CodeTemplates
        visible={showTemplates}
        onSelectTemplate={(t) => {
          if (state.currentFile && t.code) {
            const newContent = state.currentFile.content.substring(0, state.selectionStart) + t.code + state.currentFile.content.substring(state.selectionStart);
            updateFileContent(state.currentFile.id, newContent);
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
        onSelectFile={(f) => openFileFromSystem((f as any).uri || (f as any).path)}
        onCreateNew={(n) => { const f = createNewFile(n); openFile(f); }}
        onClose={() => setShowFileManager(false)}
      />
    </View>
  );
}

export default function HomeScreen() {
  return <EditorScreenContent />;
}
