/**
 * Tipos estendidos para suporte multi-linguagem
 */

export type CodeLanguage = 'python' | 'html' | 'css';

export interface LanguageConfig {
  id: CodeLanguage;
  name: string;
  displayName: string;
  extension: string;
  icon: string;
  color: string;
  description: string;
}

export interface HTMLElement {
  name: string;
  line: number;
  column: number;
  type: 'tag' | 'attribute' | 'class' | 'id';
  selfClosing?: boolean;
}

export interface CSSRule {
  selector: string;
  line: number;
  column: number;
  properties: CSSProperty[];
}

export interface CSSProperty {
  name: string;
  value: string;
  line: number;
  column: number;
}

export interface CSSSelector {
  name: string;
  line: number;
  column: number;
  type: 'class' | 'id' | 'tag' | 'pseudo' | 'attribute';
}

export interface LanguageFeatures {
  supportsExecution: boolean;
  supportsPreview: boolean;
  supportsLinting: boolean;
  supportsFormatting: boolean;
  supportsDebug: boolean;
}

export const LANGUAGE_CONFIGS: Record<CodeLanguage, LanguageConfig> = {
  python: {
    id: 'python',
    name: 'Python',
    displayName: 'Python 3',
    extension: 'py',
    icon: '🐍',
    color: '#3776ab',
    description: 'Linguagem de programação versátil e poderosa',
  },
  html: {
    id: 'html',
    name: 'HTML',
    displayName: 'HTML5',
    extension: 'html',
    icon: '🌐',
    color: '#e34c26',
    description: 'Linguagem de marcação para web',
  },
  css: {
    id: 'css',
    name: 'CSS',
    displayName: 'CSS3',
    extension: 'css',
    icon: '🎨',
    color: '#563d7c',
    description: 'Linguagem de estilos para web',
  },
};

export const LANGUAGE_FEATURES: Record<CodeLanguage, LanguageFeatures> = {
  python: {
    supportsExecution: true,
    supportsPreview: false,
    supportsLinting: true,
    supportsFormatting: true,
    supportsDebug: false,
  },
  html: {
    supportsExecution: false,
    supportsPreview: true,
    supportsLinting: true,
    supportsFormatting: true,
    supportsDebug: false,
  },
  css: {
    supportsExecution: false,
    supportsPreview: true,
    supportsLinting: true,
    supportsFormatting: true,
    supportsDebug: false,
  },
};

/**
 * Detecta a linguagem baseada na extensão do ficheiro
 */
export function detectLanguageFromExtension(filename: string): CodeLanguage {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  switch (extension) {
    case 'py':
      return 'python';
    case 'html':
    case 'htm':
      return 'html';
    case 'css':
      return 'css';
    default:
      return 'python'; // Padrão
  }
}

/**
 * Obtém a configuração de uma linguagem
 */
export function getLanguageConfig(language: CodeLanguage): LanguageConfig {
  return LANGUAGE_CONFIGS[language];
}

/**
 * Obtém as funcionalidades de uma linguagem
 */
export function getLanguageFeatures(language: CodeLanguage): LanguageFeatures {
  return LANGUAGE_FEATURES[language];
}

/**
 * Lista todas as linguagens disponíveis
 */
export function getAvailableLanguages(): LanguageConfig[] {
  return Object.values(LANGUAGE_CONFIGS);
}
