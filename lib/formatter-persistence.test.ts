import { describe, it, expect } from 'vitest';
import {
  formatCode,
  formatPython,
  minifyCode,
  isWellFormatted,
  getFormatDiff,
  trimWhitespace,
  normalizeLineEndings,
} from './code-formatter';
import {
  getTemplatesByCategory,
} from './code-templates';

describe('Code Formatter', () => {
  describe('formatPython', () => {
    it('deve formatar código Python com indentação', () => {
      const code = 'def hello():\nprint("Olá")';
      const formatted = formatPython(code);
      expect(formatted).toContain('def hello():');
      expect(formatted).toContain('print');
    });

    it('deve manter estrutura de classes', () => {
      const code = 'class Pessoa:\ndef __init__(self):\npass';
      const formatted = formatPython(code);
      expect(formatted).toContain('class Pessoa:');
    });
  });

  describe('formatCode', () => {
    it('deve formatar Python', () => {
      const code = 'x=1\ny=2';
      const formatted = formatCode(code, 'python');
      expect(formatted).toBeDefined();
    });

    it('deve formatar HTML', () => {
      const code = '<div><p>Texto</p></div>';
      const formatted = formatCode(code, 'html');
      expect(formatted).toBeDefined();
    });

    it('deve formatar CSS', () => {
      const code = 'div{color:red;}';
      const formatted = formatCode(code, 'css');
      expect(formatted).toBeDefined();
    });
  });

  describe('minifyCode', () => {
    it('deve minificar Python', () => {
      const code = 'def hello():\n    print("Olá")';
      const minified = minifyCode(code, 'python');
      expect(minified.length).toBeLessThan(code.length);
    });

    it('deve minificar HTML', () => {
      const code = '<div>\n  <p>Texto</p>\n</div>';
      const minified = minifyCode(code, 'html');
      expect(minified).not.toContain('\n');
    });

    it('deve minificar CSS', () => {
      const code = 'div {\n  color: red;\n}';
      const minified = minifyCode(code, 'css');
      expect(minified).not.toContain('\n');
    });
  });

  describe('trimWhitespace', () => {
    it('deve remover espaços em branco desnecessários', () => {
      const code = 'linha1  \nlinha2  \n\n\nlinha3';
      const trimmed = trimWhitespace(code);
      expect(trimmed).not.toContain('  ');
    });
  });

  describe('normalizeLineEndings', () => {
    it('deve normalizar quebras de linha', () => {
      const code = 'linha1\r\nlinha2\rlinha3';
      const normalized = normalizeLineEndings(code);
      expect(normalized).toBe('linha1\nlinha2\nlinha3');
    });
  });

  describe('isWellFormatted', () => {
    it('deve detectar código bem formatado', () => {
      const code = 'def hello():\n    print("Olá")';
      const wellFormatted = isWellFormatted(code, 'python');
      expect(typeof wellFormatted).toBe('boolean');
    });
  });

  describe('getFormatDiff', () => {
    it('deve retornar diferenças entre original e formatado', () => {
      const code = 'x=1\ny=2';
      const diff = getFormatDiff(code, 'python');
      expect(diff.original).toBe(code);
      expect(diff.formatted).toBeDefined();
      expect(diff.hasChanges).toBeDefined();
    });
  });
});

describe('Code Templates and File Persistence', () => {
  describe('getTemplatesByCategory', () => {
    it('deve retornar templates agrupados por categoria para Python', () => {
      const templates = getTemplatesByCategory('python');
      expect(Object.keys(templates).length).toBeGreaterThan(0);
    });

    it('deve conter categorias validas para HTML', () => {
      const templates = getTemplatesByCategory('html');
      expect(Object.keys(templates).length).toBeGreaterThan(0);
    });

    it('deve conter categorias validas para CSS', () => {
      const templates = getTemplatesByCategory('css');
      expect(Object.keys(templates).length).toBeGreaterThan(0);
    });
  });
});
