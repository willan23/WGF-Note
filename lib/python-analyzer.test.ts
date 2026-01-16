import { describe, it, expect } from 'vitest';
import {
  extractPythonSymbols,
  detectSyntaxErrors,
  getCodeStatistics,
  formatPythonCode,
  isValidPythonSyntax,
} from './python-analyzer';

describe('Python Analyzer', () => {
  describe('extractPythonSymbols', () => {
    it('deve extrair funções', () => {
      const code = `
def hello():
    pass

def world(x, y):
    return x + y
      `;
      const symbols = extractPythonSymbols(code);
      const functions = symbols.filter(s => s.type === 'function');
      expect(functions).toHaveLength(2);
      expect(functions[0].name).toBe('hello');
      expect(functions[1].name).toBe('world');
    });

    it('deve extrair classes', () => {
      const code = `
class MyClass:
    pass

class AnotherClass(BaseClass):
    pass
      `;
      const symbols = extractPythonSymbols(code);
      const classes = symbols.filter(s => s.type === 'class');
      expect(classes).toHaveLength(2);
      expect(classes[0].name).toBe('MyClass');
      expect(classes[1].name).toBe('AnotherClass');
    });

    it('deve extrair imports', () => {
      const code = `
import os
from sys import argv
import numpy as np
      `;
      const symbols = extractPythonSymbols(code);
      const imports = symbols.filter(s => s.type === 'import');
      expect(imports.length).toBeGreaterThan(0);
    });

    it('deve retornar número de linha correto', () => {
      const code = `
def first():
    pass

def second():
    pass
      `;
      const symbols = extractPythonSymbols(code);
      const functions = symbols.filter(s => s.type === 'function');
      expect(functions[0].line).toBe(2);
      expect(functions[1].line).toBe(5);
    });
  });

  describe('detectSyntaxErrors', () => {
    it('deve detectar parênteses não balanceados', () => {
      const code = 'print("hello"';
      const errors = detectSyntaxErrors(code);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('Parênteses'))).toBe(true);
    });

    it('deve detectar colchetes não balanceados', () => {
      const code = 'arr = [1, 2, 3';
      const errors = detectSyntaxErrors(code);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('Colchetes'))).toBe(true);
    });

    it('deve detectar chaves não balanceadas', () => {
      const code = 'dict = {"key": "value"';
      const errors = detectSyntaxErrors(code);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('Chaves'))).toBe(true);
    });

    it('deve detectar falta de dois pontos em estruturas de controle', () => {
      const code = 'if x > 5\n    print("yes")';
      const errors = detectSyntaxErrors(code);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.message.includes('":"'))).toBe(true);
    });

    it('não deve reportar erros para código válido', () => {
      const code = `
def hello():
    print("hello")
    return True
      `;
      const errors = detectSyntaxErrors(code);
      const errorCount = errors.filter(e => e.severity === 'error').length;
      expect(errorCount).toBe(0);
    });
  });

  describe('getCodeStatistics', () => {
    it('deve contar linhas corretamente', () => {
      const code = `
def hello():
    print("hello")
    return True
      `;
      const stats = getCodeStatistics(code);
      expect(stats.totalLines).toBeGreaterThan(0);
      expect(stats.nonEmptyLines).toBeGreaterThan(0);
    });

    it('deve contar comentários', () => {
      const code = `
# This is a comment
def hello():
    # Another comment
    print("hello")
      `;
      const stats = getCodeStatistics(code);
      expect(stats.commentLines).toBe(2);
    });

    it('deve contar caracteres', () => {
      const code = 'print("hello")';
      const stats = getCodeStatistics(code);
      expect(stats.characters).toBe(code.length);
    });
  });

  describe('formatPythonCode', () => {
    it('deve formatar código com indentação correta', () => {
      const code = `
def hello():
print("hello")
return True
      `;
      const formatted = formatPythonCode(code, 4);
      expect(formatted).toContain('def hello():');
      expect(formatted).toContain('    print("hello")');
    });

    it('deve respeitar tamanho de indentação customizado', () => {
      const code = `
def hello():
print("hello")
      `;
      const formatted = formatPythonCode(code, 2);
      const lines = formatted.split('\n');
      const indentedLine = lines.find(l => l.includes('print'));
      expect(indentedLine?.startsWith('  ')).toBe(true);
    });
  });

  describe('isValidPythonSyntax', () => {
    it('deve retornar true para código válido', () => {
      const code = `
def hello():
    print("hello")
    return True
      `;
      expect(isValidPythonSyntax(code)).toBe(true);
    });

    it('deve retornar false para código com erros', () => {
      const code = 'print("hello"';
      expect(isValidPythonSyntax(code)).toBe(false);
    });
  });
});
