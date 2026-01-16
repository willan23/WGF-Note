/**
 * Analisador de código CSS3
 */

import { SyntaxError } from './types';
import { CSSRule, CSSProperty, CSSSelector } from './types-extended';

// Propriedades CSS válidas (principais)
const CSS_PROPERTIES = [
  'color', 'background', 'background-color', 'font-size', 'font-weight',
  'padding', 'margin', 'border', 'width', 'height', 'display', 'flex',
  'justify-content', 'align-items', 'position', 'top', 'left', 'right',
  'bottom', 'z-index', 'opacity', 'transform', 'transition', 'animation',
  'box-shadow', 'text-align', 'line-height', 'font-family', 'cursor',
  'overflow', 'white-space', 'text-decoration', 'border-radius', 'gap',
  'grid-template-columns', 'grid-template-rows', 'flex-direction', 'flex-wrap',
];

// Pseudo-classes CSS
const PSEUDO_CLASSES = [
  'hover', 'active', 'focus', 'visited', 'link', 'first-child',
  'last-child', 'nth-child', 'nth-of-type', 'before', 'after',
];

/**
 * Extrai regras CSS do código
 */
export function extractCSSRules(code: string): CSSRule[] {
  const rules: CSSRule[] = [];
  const lines = code.split('\n');

  let currentRule: CSSRule | null = null;
  let inRule = false;

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const trimmed = line.trim();

    // Ignorar comentários e linhas vazias
    if (!trimmed || trimmed.startsWith('/*')) {
      return;
    }

    // Detectar seletor
    if (trimmed.includes('{') && !trimmed.startsWith('}')) {
      const selectorMatch = trimmed.match(/^([^{]+)\{/);
      if (selectorMatch) {
        currentRule = {
          selector: selectorMatch[1].trim(),
          line: lineNumber,
          column: 0,
          properties: [],
        };
        inRule = true;
        rules.push(currentRule);
      }
    }

    // Detectar propriedades
    if (inRule && currentRule && trimmed.includes(':') && !trimmed.startsWith('}')) {
      const propMatch = trimmed.match(/^([a-z-]+)\s*:\s*([^;]+);?/i);
      if (propMatch) {
        currentRule.properties.push({
          name: propMatch[1],
          value: propMatch[2].trim(),
          line: lineNumber,
          column: line.indexOf(propMatch[1]),
        });
      }
    }

    // Detectar fim da regra
    if (trimmed.includes('}')) {
      inRule = false;
      currentRule = null;
    }
  });

  return rules;
}

/**
 * Extrai seletores CSS do código
 */
export function extractCSSSelectors(code: string): CSSSelector[] {
  const selectors: CSSSelector[] = [];
  const lines = code.split('\n');

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;

    // Detectar seletores de classe
    const classMatches = line.matchAll(/\.([a-zA-Z_][a-zA-Z0-9_-]*)/g);
    for (const match of classMatches) {
      selectors.push({
        name: match[1],
        line: lineNumber,
        column: match.index || 0,
        type: 'class',
      });
    }

    // Detectar seletores de ID
    const idMatches = line.matchAll(/#([a-zA-Z_][a-zA-Z0-9_-]*)/g);
    for (const match of idMatches) {
      selectors.push({
        name: match[1],
        line: lineNumber,
        column: match.index || 0,
        type: 'id',
      });
    }

    // Detectar seletores de tag
    const tagMatches = line.matchAll(/\b([a-z][a-z0-9]*)\s*[,{]/gi);
    for (const match of tagMatches) {
      selectors.push({
        name: match[1],
        line: lineNumber,
        column: match.index || 0,
        type: 'tag',
      });
    }

    // Detectar pseudo-classes
    const pseudoMatches = line.matchAll(/:([a-z-]+)/gi);
    for (const match of pseudoMatches) {
      selectors.push({
        name: match[1],
        line: lineNumber,
        column: match.index || 0,
        type: 'pseudo',
      });
    }
  });

  return selectors;
}

/**
 * Detecta erros de sintaxe em CSS
 */
export function detectCSSErrors(code: string): SyntaxError[] {
  const errors: SyntaxError[] = [];
  const lines = code.split('\n');

  let braceCount = 0;
  let inComment = false;

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;
    const trimmed = line.trim();

    // Verificar comentários
    if (trimmed.includes('/*')) {
      inComment = true;
    }
    if (trimmed.includes('*/')) {
      inComment = false;
      return;
    }

    if (inComment) {
      return;
    }

    // Contar chaves
    braceCount += (line.match(/\{/g) || []).length;
    braceCount -= (line.match(/\}/g) || []).length;

    // Verificar chaves não balanceadas
    if (braceCount < 0) {
      errors.push({
        line: lineNumber,
        column: line.lastIndexOf('}'),
        message: 'Chave de fechamento sem correspondência',
        severity: 'error',
      });
      braceCount = 0;
    }

    // Verificar propriedades sem ponto-e-vírgula
    if (trimmed.includes(':') && !trimmed.endsWith(';') && !trimmed.endsWith('{') && !trimmed.startsWith('/*')) {
      const propMatch = trimmed.match(/^([a-z-]+)\s*:\s*([^;]+)$/i);
      if (propMatch && !trimmed.includes('}')) {
        errors.push({
          line: lineNumber,
          column: line.length,
          message: 'Propriedade CSS sem ponto-e-vírgula',
          severity: 'warning',
        });
      }
    }

    // Verificar propriedades inválidas
    const propMatch = trimmed.match(/^([a-z-]+)\s*:/i);
    if (propMatch) {
      const propName = propMatch[1].toLowerCase();
      if (!CSS_PROPERTIES.includes(propName)) {
        errors.push({
          line: lineNumber,
          column: line.indexOf(propName),
          message: `Propriedade desconhecida: "${propName}"`,
          severity: 'warning',
        });
      }
    }
  });

  // Verificar chaves não fechadas
  if (braceCount > 0) {
    errors.push({
      line: lines.length,
      column: 0,
      message: 'Chaves não balanceadas no final do ficheiro',
      severity: 'error',
    });
  }

  return errors;
}

/**
 * Formata código CSS com indentação correta
 */
export function formatCSS(code: string, indentSize: number = 2): string {
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

    // Reduzir indentação para chaves de fechamento
    if (trimmed.startsWith('}')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Adicionar linha com indentação
    formatted.push(indentChar.repeat(indentLevel) + trimmed);

    // Aumentar indentação para chaves de abertura
    if (trimmed.endsWith('{')) {
      indentLevel++;
    }
  });

  return formatted.join('\n');
}

/**
 * Valida CSS básico
 */
export function isValidCSS(code: string): boolean {
  const errors = detectCSSErrors(code);
  return errors.filter(e => e.severity === 'error').length === 0;
}

/**
 * Obtém sugestões de propriedades CSS
 */
export function getCSSPropertySuggestions(partial: string): string[] {
  return CSS_PROPERTIES
    .filter(prop => prop.startsWith(partial.toLowerCase()))
    .slice(0, 10);
}

/**
 * Obtém sugestões de valores para uma propriedade CSS
 */
export function getCSSValueSuggestions(property: string): string[] {
  const valueMap: Record<string, string[]> = {
    'display': ['block', 'inline', 'inline-block', 'flex', 'grid', 'none'],
    'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
    'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'],
    'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around'],
    'align-items': ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
    'overflow': ['visible', 'hidden', 'scroll', 'auto'],
    'text-align': ['left', 'right', 'center', 'justify'],
    'cursor': ['pointer', 'default', 'text', 'move', 'wait'],
  };

  return valueMap[property.toLowerCase()] || [];
}
