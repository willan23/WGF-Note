/**
 * Analisador de código Python para extração de símbolos e detecção de erros
 */

import { PythonSymbol, SyntaxError } from './types';

/**
 * Extrai símbolos (funções, classes, variáveis) do código Python
 */
export function extractPythonSymbols(code: string): PythonSymbol[] {
  const symbols: PythonSymbol[] = [];
  const lines = code.split('\n');

  // Regex para detectar diferentes tipos de símbolos
  const functionRegex = /^\s*def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/;
  const classRegex = /^\s*class\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*[\(:]?/;
  const variableRegex = /^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/;
  const importRegex = /^\s*(?:from|import)\s+([a-zA-Z_][a-zA-Z0-9_.]*)/;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Detectar funções
    const funcMatch = line.match(functionRegex);
    if (funcMatch) {
      symbols.push({
        name: funcMatch[1],
        type: 'function',
        line: lineNumber,
        column: line.indexOf('def'),
      });
    }

    // Detectar classes
    const classMatch = line.match(classRegex);
    if (classMatch) {
      symbols.push({
        name: classMatch[1],
        type: 'class',
        line: lineNumber,
        column: line.indexOf('class'),
      });
    }

    // Detectar variáveis globais (apenas no nível superior)
    if (!line.trim().startsWith('#') && line.match(variableRegex)) {
      const varMatch = line.match(variableRegex);
      if (varMatch && !line.trim().startsWith('def ') && !line.trim().startsWith('class ')) {
        symbols.push({
          name: varMatch[1],
          type: 'variable',
          line: lineNumber,
          column: line.indexOf(varMatch[1]),
        });
      }
    }

    // Detectar imports
    const importMatch = line.match(importRegex);
    if (importMatch) {
      symbols.push({
        name: importMatch[1],
        type: 'import',
        line: lineNumber,
        column: line.indexOf('import'),
      });
    }
  });

  return symbols;
}

/**
 * Detecta erros de sintaxe básicos em código Python
 */
export function detectSyntaxErrors(code: string): SyntaxError[] {
  const errors: SyntaxError[] = [];
  const lines = code.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    const trimmed = line.trim();

    // Ignorar linhas vazias e comentários
    if (!trimmed || trimmed.startsWith('#')) {
      return;
    }

    // Verificar parênteses, colchetes e chaves não balanceados
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    const openBrackets = (line.match(/\[/g) || []).length;
    const closeBrackets = (line.match(/\]/g) || []).length;
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;

    if (openParens !== closeParens) {
      errors.push({
        line: lineNumber,
        column: line.lastIndexOf('('),
        message: 'Parênteses não balanceados',
        severity: 'error',
      });
    }

    if (openBrackets !== closeBrackets) {
      errors.push({
        line: lineNumber,
        column: line.lastIndexOf('['),
        message: 'Colchetes não balanceados',
        severity: 'error',
      });
    }

    if (openBraces !== closeBraces) {
      errors.push({
        line: lineNumber,
        column: line.lastIndexOf('{'),
        message: 'Chaves não balanceadas',
        severity: 'error',
      });
    }

    // Verificar strings não fechadas
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;

    if (singleQuotes % 2 !== 0) {
      errors.push({
        line: lineNumber,
        column: line.lastIndexOf("'"),
        message: 'String com aspas simples não fechada',
        severity: 'warning',
      });
    }

    if (doubleQuotes % 2 !== 0) {
      errors.push({
        line: lineNumber,
        column: line.lastIndexOf('"'),
        message: 'String com aspas duplas não fechada',
        severity: 'warning',
      });
    }

    // Verificar dois pontos obrigatórios após estruturas de controle
    const controlStructures = ['if', 'elif', 'else', 'for', 'while', 'def', 'class', 'try', 'except', 'finally', 'with'];
    const startsWithControl = controlStructures.some(keyword =>
      trimmed.startsWith(keyword + ' ') || trimmed.startsWith(keyword + ':')
    );

    if (startsWithControl && !trimmed.endsWith(':')) {
      errors.push({
        line: lineNumber,
        column: line.length,
        message: 'Esperado ":" no final da linha',
        severity: 'error',
      });
    }
  });

  return errors;
}

/**
 * Calcula estatísticas do código
 */
export function getCodeStatistics(code: string) {
  const lines = code.split('\n');
  const nonEmptyLines = lines.filter(line => line.trim().length > 0).length;
  const commentLines = lines.filter(line => line.trim().startsWith('#')).length;
  const codeLines = nonEmptyLines - commentLines;
  const characters = code.length;
  const words = code.split(/\s+/).filter(word => word.length > 0).length;

  return {
    totalLines: lines.length,
    nonEmptyLines,
    commentLines,
    codeLines,
    characters,
    words,
  };
}

/**
 * Formata código Python com indentação correta
 */
export function formatPythonCode(code: string, indentSize: number = 4): string {
  const lines = code.split('\n');
  const indentChar = ' '.repeat(indentSize);
  let indentLevel = 0;
  const formattedLines: string[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();

    // Reduzir indentação para linhas que fecham blocos
    if (['elif', 'else', 'except', 'finally'].some(keyword => trimmed.startsWith(keyword))) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Adicionar linha formatada
    if (trimmed.length > 0) {
      formattedLines.push(indentChar.repeat(indentLevel) + trimmed);
    } else {
      formattedLines.push('');
    }

    // Aumentar indentação para linhas que abrem blocos
    if (trimmed.endsWith(':')) {
      indentLevel++;
    }
  });

  return formattedLines.join('\n');
}

/**
 * Valida se o código é Python válido (verificação básica)
 */
export function isValidPythonSyntax(code: string): boolean {
  const errors = detectSyntaxErrors(code);
  return errors.filter(e => e.severity === 'error').length === 0;
}
