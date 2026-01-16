/**
 * Analisador de código HTML5
 */

import { SyntaxError } from './types';
import { HTMLElement } from './types-extended';

// Tags HTML5 válidas
const HTML5_TAGS = [
  'html', 'head', 'body', 'title', 'meta', 'link', 'style', 'script',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'div', 'span', 'a', 'img',
  'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'form', 'input', 'button',
  'textarea', 'label', 'select', 'option', 'header', 'footer', 'nav',
  'section', 'article', 'aside', 'main', 'figure', 'figcaption', 'video',
  'audio', 'canvas', 'svg', 'iframe', 'br', 'hr', 'strong', 'em', 'code',
];

// Tags auto-fecháveis
const SELF_CLOSING_TAGS = ['br', 'hr', 'img', 'input', 'meta', 'link'];

/**
 * Extrai elementos HTML do código
 */
export function extractHTMLElements(code: string): HTMLElement[] {
  const elements: HTMLElement[] = [];
  const lines = code.split('\n');

  // Regex para detectar tags
  const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;
  const classRegex = /class="([^"]*)"/g;
  const idRegex = /id="([^"]*)"/g;

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;
    let match: RegExpExecArray | null;

    // Detectar tags
    while ((match = tagRegex.exec(line)) !== null) {
      const tagName = match[1].toLowerCase();
      elements.push({
        name: tagName,
        line: lineNumber,
        column: match.index,
        type: 'tag',
        selfClosing: SELF_CLOSING_TAGS.includes(tagName),
      });
    }

    // Detectar classes
    let classMatch: RegExpExecArray | null = null;
    while ((classMatch = classRegex.exec(line)) !== null) {
      const classes = classMatch[1].split(' ');
      const classIndex = classMatch.index;
      classes.forEach(cls => {
        if (cls.trim()) {
          elements.push({
            name: cls.trim(),
            line: lineNumber,
            column: classIndex,
            type: 'class',
          });
        }
      });
    }

    // Detectar IDs
    let idMatch: RegExpExecArray | null = null;
    while ((idMatch = idRegex.exec(line)) !== null) {
      elements.push({
        name: idMatch[1],
        line: lineNumber,
        column: idMatch.index,
        type: 'id',
      });
    }
  });

  return elements;
}

/**
 * Detecta erros de sintaxe em HTML5
 */
export function detectHTMLErrors(code: string): SyntaxError[] {
  const errors: SyntaxError[] = [];
  const lines = code.split('\n');
  const openTags: Array<{ tag: string; line: number }> = [];

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const trimmed = line.trim();

    // Ignorar comentários e linhas vazias
    if (!trimmed || trimmed.startsWith('<!--')) {
      return;
    }

    // Detectar tags abertas e fechadas
    const tagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;
    let match;

    while ((match = tagRegex.exec(line)) !== null) {
      const tagName = match[0];
      const tag = match[1].toLowerCase();

      if (tagName.startsWith('</')) {
        // Tag de fechamento
        if (openTags.length === 0 || openTags[openTags.length - 1].tag !== tag) {
          errors.push({
            line: lineNumber,
            column: match.index,
            message: `Tag de fechamento "${tag}" sem correspondência de abertura`,
            severity: 'error',
          });
        } else {
          openTags.pop();
        }
      } else if (!SELF_CLOSING_TAGS.includes(tag)) {
        // Tag de abertura (não auto-fechável)
        openTags.push({ tag, line: lineNumber });
      }
    }

    // Verificar atributos não fechados
    if ((line.match(/"/g) || []).length % 2 !== 0) {
      errors.push({
        line: lineNumber,
        column: line.length,
        message: 'Aspas não balanceadas em atributo',
        severity: 'warning',
      });
    }

    // Verificar tags inválidas
    const invalidTagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b/g;
    while ((match = invalidTagRegex.exec(line)) !== null) {
      const tag = match[1].toLowerCase();
      if (!HTML5_TAGS.includes(tag)) {
        errors.push({
          line: lineNumber,
          column: match.index,
          message: `Tag desconhecida: "${tag}"`,
          severity: 'warning',
        });
      }
    }
  });

  // Verificar tags abertas não fechadas
  openTags.forEach(({ tag, line }) => {
    errors.push({
      line,
      column: 0,
      message: `Tag "${tag}" não foi fechada`,
      severity: 'error',
    });
  });

  return errors;
}

/**
 * Formata código HTML com indentação correta
 */
export function formatHTML(code: string, indentSize: number = 2): string {
  const indentChar = ' '.repeat(indentSize);
  let indentLevel = 0;
  const lines = code.split('\n');
  const formatted: string[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();

    if (!trimmed) {
      formatted.push('');
      return;
    }

    // Reduzir indentação para tags de fechamento
    if (trimmed.startsWith('</')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Adicionar linha com indentação
    formatted.push(indentChar.repeat(indentLevel) + trimmed);

    // Aumentar indentação para tags de abertura (não auto-fecháveis)
    if (trimmed.startsWith('<') && !trimmed.startsWith('</')) {
      const tagMatch = trimmed.match(/<([a-zA-Z][a-zA-Z0-9-]*)/);
      if (tagMatch) {
        const tag = tagMatch[1].toLowerCase();
        if (!SELF_CLOSING_TAGS.includes(tag) && !trimmed.endsWith('/>')) {
          indentLevel++;
        }
      }
    }
  });

  return formatted.join('\n');
}

/**
 * Valida estrutura básica de HTML5
 */
export function isValidHTML(code: string): boolean {
  const errors = detectHTMLErrors(code);
  return errors.filter(e => e.severity === 'error').length === 0;
}

/**
 * Obtém sugestões de tags HTML5
 */
export function getHTMLTagSuggestions(partial: string): string[] {
  return HTML5_TAGS
    .filter(tag => tag.startsWith(partial.toLowerCase()))
    .slice(0, 10);
}

/**
 * Obtém sugestões de atributos para uma tag específica
 */
export function getHTMLAttributeSuggestions(tag: string): string[] {
  const attributeMap: Record<string, string[]> = {
    'a': ['href', 'target', 'title', 'rel'],
    'img': ['src', 'alt', 'width', 'height', 'loading'],
    'input': ['type', 'name', 'value', 'placeholder', 'required'],
    'button': ['type', 'name', 'value', 'disabled'],
    'form': ['action', 'method', 'enctype', 'target'],
    'script': ['src', 'type', 'async', 'defer'],
    'link': ['rel', 'href', 'type'],
    'meta': ['name', 'content', 'charset', 'viewport'],
  };

  return attributeMap[tag.toLowerCase()] || ['class', 'id', 'style', 'title', 'data-*'];
}
