import { View } from "react-native";
import { useState, useCallback } from "react";
import { ScreenContainer } from "@/components/screen-container";
import { CodeEditor } from "@/components/code-editor";
import { EditorToolbar } from "@/components/editor-toolbar";
import { EditorStatusBar } from "@/components/editor-status-bar";
import { SyntaxErrorsPanel } from "@/components/syntax-errors-panel";
import { SearchReplaceModal } from "@/components/search-replace-modal";
import { CodeExecutionPanel } from "@/components/code-execution-panel";
import { CodeSuggestions } from "@/components/code-suggestions";
import { CodeTemplates } from "@/components/code-templates";
import { LanguageSelector } from "@/components/language-selector";
import { EditorPreviewSplit } from "@/components/split-view";
import { WebViewPreview } from "@/components/webview-preview";
import { EditorProvider, useEditor } from "@/lib/editor-context";
import { detectSyntaxErrors } from "@/lib/python-analyzer";
import { detectHTMLErrors } from "@/lib/html-analyzer";
import { detectCSSErrors } from "@/lib/css-analyzer";
import * as FileSystemManager from "@/lib/file-system-manager";

function EditorScreenContent() {
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

  const handleNew = useCallback(() => {
    const newFile = createNewFile(`script_${Date.now()}.py`);
    openFile(newFile);
  }, [createNewFile, openFile]);

  const handleOpen = useCallback(async () => {
    try {
      // Listar ficheiros disponíveis
      const files = await FileSystemManager.listFiles();
      // TODO: Mostrar diálogo de seleção (por agora, abrir o primeiro ficheiro)
      if (files.length > 0) {
        await openFileFromSystem(files[0].uri);
      }
    } catch (error) {
      console.error('Erro ao abrir ficheiro:', error);
    }
  }, [openFileFromSystem]);

  const handleSave = useCallback(async () => {
    try {
      await saveCurrentFile();
      console.log('Ficheiro guardado com sucesso');
    } catch (error) {
      console.error('Erro ao guardar ficheiro:', error);
    }
  }, [saveCurrentFile]);

  const handleUndo = useCallback(() => {
    if (canUndo) {
      undo();
    }
  }, [undo, canUndo]);

  const handleRedo = useCallback(() => {
    if (canRedo) {
      redo();
    }
  }, [redo, canRedo]);

  const handleSearch = useCallback(() => {
    setShowSearchModal(true);
  }, []);

  const handleSettings = useCallback(() => {
    // Navegar para tab de definições (já implementado via tabs)
    console.log('Definições');
  }, []);

  const handleExecute = useCallback(() => {
    setShowExecutionPanel(!showExecutionPanel);
  }, [showExecutionPanel]);

  const handleTemplates = useCallback(() => {
    setShowTemplates(true);
  }, []);

  const handleSuggestions = useCallback(() => {
    setShowSuggestions(true);
  }, []);

  const handleSelectTemplate = useCallback((template: any) => {
    if (state.currentFile && template.code) {
      // Inserir template no cursor atual
      const { selectionStart } = state;
      const newContent =
        state.currentFile.content.substring(0, selectionStart) +
        template.code +
        state.currentFile.content.substring(selectionStart);

      updateFileContent(state.currentFile.id, newContent);
      setShowTemplates(false);
    }
  }, [state, updateFileContent]);

  const handleContentChange = useCallback((content: string) => {
    let errors: any[] = [];

    if (currentLanguage === 'python') {
      errors = detectSyntaxErrors(content);
    } else if (currentLanguage === 'html') {
      errors = detectHTMLErrors(content);
    } else if (currentLanguage === 'css') {
      errors = detectCSSErrors(content);
    }

    setSyntaxErrors(errors);
  }, [currentLanguage]);

  return (
    <ScreenContainer edges={["top", "left", "right"]} className="flex-1 p-0">
      <View className="flex-1 flex-col">
        <EditorToolbar
          onNew={handleNew}
          onOpen={handleOpen}
          onSave={handleSave}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onSearch={handleSearch}
          onSettings={handleSettings}
          onExecute={handleExecute}
          onTemplates={handleTemplates}
          onSuggestions={handleSuggestions}
          onLanguageSelect={() => setShowLanguageSelector(true)}
        />
        <EditorPreviewSplit
          language={currentLanguage}
          editor={<CodeEditor onContentChange={handleContentChange} />}
          preview={
            <WebViewPreview
              html={state.currentFile?.content || ''}
              language={currentLanguage}
            />
          }
        />
        {showExecutionPanel && (
          <CodeExecutionPanel />
        )}
        {syntaxErrors.length > 0 && (
          <SyntaxErrorsPanel errors={syntaxErrors} />
        )}
        <EditorStatusBar />
        <SearchReplaceModal
          visible={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          onSearch={(query) => console.log('Pesquisar:', query)}
          onReplace={(query, replacement) => console.log('Substituir:', query, replacement)}
          onReplaceAll={(query, replacement) => console.log('Substituir tudo:', query, replacement)}
        />
        <CodeSuggestions
          visible={showSuggestions}
          code={state.currentFile?.content || ''}
          line={state.cursorLine}
          onSelectSuggestion={(suggestion) => console.log('Sugestão:', suggestion)}
          onClose={() => setShowSuggestions(false)}
        />
        <CodeTemplates
          visible={showTemplates}
          onSelectTemplate={handleSelectTemplate}
          onClose={() => setShowTemplates(false)}
        />
        <LanguageSelector
          visible={showLanguageSelector}
          currentLanguage={currentLanguage}
          onSelectLanguage={(language) => {
            setCurrentLanguage(language);
            setShowLanguageSelector(false);
          }}
          onClose={() => setShowLanguageSelector(false)}
        />
      </View>
    </ScreenContainer>
  );
}

export default function HomeScreen() {
  return <EditorScreenContent />;
}
