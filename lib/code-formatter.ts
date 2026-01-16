/**
 * Utilitário de formatação de código para múltiplas linguagens
 */

import { CodeLanguage } from './types-extended';
import { formatHTML } from './html-analyzer';
import { formatCSS } from './css-analyzer';

/**
 * Formata código Python com indentação correta
 */
export function formatPython(code: string, indentSize: number = 4): string {
  const lines = code.split('\n');
  const indentChar = ' '.repeat(indentSize);
  let indentLevel = 0;
  const formatted: string[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      formatted.push('');
      return;
    }

    // Reduzir indentação para linhas que começam com 'elif', 'else', 'except', 'finally'
    if (trimmed.match(/^(elif|else|except|finally|except\s)/)) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Adicionar linha com indentação
    formatted.push(indentChar.repeat(indentLevel) + trimmed);

    // Aumentar indentação para linhas que terminam com ':'
    if (trimmed.endsWith(':')) {
      indentLevel++;
    }

    // Reduzir indentação para 'return', 'break', 'continue' em certos contextos
    if (trimmed.match(/^(return|break|continue|pass)(\s|$)/)) {
      // Pode precisar de ajuste dependendo do contexto
    }
  });

  return formatted.join('\n');
}

/**
 * Remove espaços em branco desnecessários
 */
export function trimWhitespace(code: string): string {
  return code
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n\n\n+/g, '\n\n'); // Remover múltiplas linhas em branco
}

/**
 * Normaliza quebras de linha
 */
export function normalizeLineEndings(code: string): string {
  return code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Formata código baseado na linguagem
 */
export function formatCode(
  code: string,
  language: CodeLanguage,
  options: {
    indentSize?: number;
    trimWhitespace?: boolean;
    normalizeLineEndings?: boolean;
  } = {}
): string {
  const {
    indentSize = 2,
    trimWhitespace: shouldTrimWhitespace = true,
    normalizeLineEndings: shouldNormalizeLineEndings = true,
  } = options;

  let formatted = code;

  // Normalizar quebras de linha primeiro
  if (shouldNormalizeLineEndings) {
    formatted = normalizeLineEndings(formatted);
  }

  // Formatar baseado na linguagem
  switch (language) {
    case 'python':
      formatted = formatPython(formatted, indentSize);
      break;
    case 'html':
      formatted = formatHTML(formatted, indentSize);
      break;
    case 'css':
      formatted = formatCSS(formatted, indentSize);
      break;
  }

  // Remover espaços em branco desnecessários
  if (shouldTrimWhitespace) {
    formatted = trimWhitespace(formatted);
  }

  return formatted;
}

/**
 * Comprime código removendo espaços e comentários (para minificação)
 */
export function minifyCode(code: string, language: CodeLanguage): string {
  switch (language) {
    case 'python':
      return minifyPython(code);
    case 'html':
      return minifyHTML(code);
    case 'css':
      return minifyCSS(code);
    default:
      return code;
  }
}

/**
 * Minifica Python
 */
function minifyPython(code: string): string {
  return code
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .join('\n');
}

/**
 * Minifica HTML
 */
function minifyHTML(code: string): string {
  return code
    .replace(/<!--[\s\S]*?-->/g, '') // Remove comentários
    .replace(/\s+/g, ' ') // Colapsa espaços
    .replace(/>\s+</g, '><') // Remove espaços entre tags
    .trim();
}

/**
 * Minifica CSS
 */
function minifyCSS(code: string): string {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários
    .replace(/\s+/g, ' ') // Colapsa espaços
    .replace(/\s*([{}:;,])\s*/g, '$1') // Remove espaços ao redor de símbolos
    .trim();
}

/**
 * Valida se o código está bem formatado
 */
export function isWellFormatted(code: string, language: CodeLanguage): boolean {
  const formatted = formatCode(code, language);
  return code.trim() === formatted.trim();
}

/**
 * Obtém diferenças entre código original e formatado
 */
export function getFormatDiff(code: string, language: CodeLanguage): {
  original: string;
  formatted: string;
  hasChanges: boolean;
} {
  const formatted = formatCode(code, language);
  return {
    original: code,
    formatted,
    hasChanges: code !== formatted,
  };
}
