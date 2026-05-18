/**
 * Tipos estendidos para suporte multi-linguagem
 */

import {
  CODE_LANGUAGE_EXTENSIONS,
  SUPPORTED_FILE_EXTENSIONS,
  type CodeLanguage,
} from '../shared/languages';

export type { CodeLanguage } from '../shared/languages';

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
  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    displayName: 'JavaScript',
    extension: 'js',
    icon: '🟨',
    color: '#f7df1e',
    description: 'Linguagem dinâmica para web e automação',
  },
  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    displayName: 'TypeScript',
    extension: 'ts',
    icon: '🔷',
    color: '#3178c6',
    description: 'JavaScript com tipos estáticos',
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
  json: {
    id: 'json',
    name: 'JSON',
    displayName: 'JSON',
    extension: 'json',
    icon: '🧩',
    color: '#6b7280',
    description: 'Formato leve para dados estruturados',
  },
  markdown: {
    id: 'markdown',
    name: 'Markdown',
    displayName: 'Markdown',
    extension: 'md',
    icon: '📝',
    color: '#2563eb',
    description: 'Texto formatado para documentação',
  },
  sql: {
    id: 'sql',
    name: 'SQL',
    displayName: 'SQL',
    extension: 'sql',
    icon: '🗄️',
    color: '#0f766e',
    description: 'Consultas e definição de bases de dados',
  },
  java: {
    id: 'java',
    name: 'Java',
    displayName: 'Java',
    extension: 'java',
    icon: '☕',
    color: '#b07219',
    description: 'Linguagem orientada a objetos para aplicações robustas',
  },
  c: {
    id: 'c',
    name: 'C',
    displayName: 'C',
    extension: 'c',
    icon: '©️',
    color: '#555555',
    description: 'Linguagem de baixo nível e sistemas',
  },
  cpp: {
    id: 'cpp',
    name: 'C++',
    displayName: 'C++',
    extension: 'cpp',
    icon: '➕',
    color: '#00599c',
    description: 'Linguagem de sistemas com abstrações modernas',
  },
  csharp: {
    id: 'csharp',
    name: 'C#',
    displayName: 'C#',
    extension: 'cs',
    icon: '#️⃣',
    color: '#68217a',
    description: 'Linguagem moderna da plataforma .NET',
  },
  plaintext: {
    id: 'plaintext',
    name: 'Texto',
    displayName: 'Texto simples',
    extension: 'txt',
    icon: '📄',
    color: '#64748b',
    description: 'Texto simples sem análise específica',
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
  javascript: {
    supportsExecution: false,
    supportsPreview: false,
    supportsLinting: false,
    supportsFormatting: false,
    supportsDebug: false,
  },
  typescript: {
    supportsExecution: false,
    supportsPreview: false,
    supportsLinting: false,
    supportsFormatting: false,
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
  json: {
    supportsExecution: false,
    supportsPreview: false,
    supportsLinting: false,
    supportsFormatting: false,
    supportsDebug: false,
  },
  markdown: {
    supportsExecution: false,
    supportsPreview: false,
    supportsLinting: false,
    supportsFormatting: false,
    supportsDebug: false,
  },
  sql: {
    supportsExecution: false,
    supportsPreview: false,
    supportsLinting: false,
    supportsFormatting: false,
    supportsDebug: false,
  },
  java: {
    supportsExecution: false,
    supportsPreview: false,
    supportsLinting: false,
    supportsFormatting: false,
    supportsDebug: false,
  },
  c: {
    supportsExecution: false,
    supportsPreview: false,
    supportsLinting: false,
    supportsFormatting: false,
    supportsDebug: false,
  },
  cpp: {
    supportsExecution: false,
    supportsPreview: false,
    supportsLinting: false,
    supportsFormatting: false,
    supportsDebug: false,
  },
  csharp: {
    supportsExecution: false,
    supportsPreview: false,
    supportsLinting: false,
    supportsFormatting: false,
    supportsDebug: false,
  },
  plaintext: {
    supportsExecution: false,
    supportsPreview: false,
    supportsLinting: false,
    supportsFormatting: false,
    supportsDebug: false,
  },
};

/**
 * Detecta a linguagem baseada na extensão do ficheiro
 */
export function detectLanguageFromExtension(filename: string): CodeLanguage {
  const extension = filename.split('.').pop()?.toLowerCase() || '';

  for (const [language, extensions] of Object.entries(CODE_LANGUAGE_EXTENSIONS) as Array<
    [CodeLanguage, readonly string[]]
  >) {
    if (extensions.includes(extension)) {
      return language;
    }
  }

  return 'plaintext';
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

export function isSupportedFileExtension(extension: string): boolean {
  return SUPPORTED_FILE_EXTENSIONS.has(extension.toLowerCase());
}
