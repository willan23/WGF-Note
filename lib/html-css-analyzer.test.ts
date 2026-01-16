import { describe, it, expect } from 'vitest';
import {
  extractHTMLElements,
  detectHTMLErrors,
  formatHTML,
  isValidHTML,
  getHTMLTagSuggestions,
  getHTMLAttributeSuggestions,
} from './html-analyzer';
import {
  extractCSSRules,
  extractCSSSelectors,
  detectCSSErrors,
  formatCSS,
  isValidCSS,
  getCSSPropertySuggestions,
  getCSSValueSuggestions,
} from './css-analyzer';

describe('HTML Analyzer', () => {
  describe('extractHTMLElements', () => {
    it('deve extrair tags HTML', () => {
      const code = '<div><p>Olá</p></div>';
      const elements = extractHTMLElements(code);
      const tags = elements.filter(e => e.type === 'tag');
      expect(tags.length).toBeGreaterThan(0);
      expect(tags.some(t => t.name === 'div')).toBe(true);
      expect(tags.some(t => t.name === 'p')).toBe(true);
    });

    it('deve extrair classes', () => {
      const code = '<div class="container main"></div>';
      const elements = extractHTMLElements(code);
      const classes = elements.filter(e => e.type === 'class');
      expect(classes.length).toBeGreaterThan(0);
    });

    it('deve extrair IDs', () => {
      const code = '<div id="header"></div>';
      const elements = extractHTMLElements(code);
      const ids = elements.filter(e => e.type === 'id');
      expect(ids.length).toBeGreaterThan(0);
      expect(ids[0].name).toBe('header');
    });
  });

  describe('detectHTMLErrors', () => {
    it('deve detectar tags não fechadas', () => {
      const code = '<div><p>Texto</div>';
      const errors = detectHTMLErrors(code);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('deve detectar tags de fechamento sem abertura', () => {
      const code = '</div>';
      const errors = detectHTMLErrors(code);
      expect(errors.some(e => e.message.includes('sem correspondência'))).toBe(true);
    });

    it('não deve reportar erros para HTML válido', () => {
      const code = '<div><p>Olá</p></div>';
      const errors = detectHTMLErrors(code);
      const errorCount = errors.filter(e => e.severity === 'error').length;
      expect(errorCount).toBe(0);
    });
  });

  describe('formatHTML', () => {
    it('deve formatar HTML com indentação', () => {
      const code = '<div>\n<p>Texto</p>\n</div>';
      const formatted = formatHTML(code, 2);
      expect(formatted).toContain('<div>');
      expect(formatted).toContain('<p>');
    });
  });

  describe('getHTMLTagSuggestions', () => {
    it('deve sugerir tags HTML válidas', () => {
      const suggestions = getHTMLTagSuggestions('div');
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toBe('div');
    });
  });

  describe('getHTMLAttributeSuggestions', () => {
    it('deve sugerir atributos para tag img', () => {
      const suggestions = getHTMLAttributeSuggestions('img');
      expect(suggestions).toContain('src');
      expect(suggestions).toContain('alt');
    });

    it('deve sugerir atributos para tag a', () => {
      const suggestions = getHTMLAttributeSuggestions('a');
      expect(suggestions).toContain('href');
    });
  });
});

describe('CSS Analyzer', () => {
  describe('extractCSSRules', () => {
    it('deve extrair regras CSS', () => {
      const code = 'div { color: red; }';
      const rules = extractCSSRules(code);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules[0].selector).toBe('div');
    });

    it('deve extrair propriedades CSS', () => {
      const code = 'div {\n  color: red;\n  font-size: 16px;\n}';
      const rules = extractCSSRules(code);
      expect(rules[0].properties.length).toBeGreaterThanOrEqual(1);
      if (rules[0].properties.length > 0) {
        expect(rules[0].properties[0].name).toBe('color');
      }
    });
  });

  describe('extractCSSSelectors', () => {
    it('deve extrair seletores de classe', () => {
      const code = '.container { } .main { }';
      const selectors = extractCSSSelectors(code);
      const classes = selectors.filter(s => s.type === 'class');
      expect(classes.length).toBeGreaterThan(0);
    });

    it('deve extrair seletores de ID', () => {
      const code = '#header { }';
      const selectors = extractCSSSelectors(code);
      const ids = selectors.filter(s => s.type === 'id');
      expect(ids.length).toBeGreaterThan(0);
    });
  });

  describe('detectCSSErrors', () => {
    it('deve detectar chaves não balanceadas', () => {
      const code = 'div { color: red;';
      const errors = detectCSSErrors(code);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('não deve reportar erros para CSS válido', () => {
      const code = 'div { color: red; }';
      const errors = detectCSSErrors(code);
      const errorCount = errors.filter(e => e.severity === 'error').length;
      expect(errorCount).toBe(0);
    });
  });

  describe('formatCSS', () => {
    it('deve formatar CSS com indentação', () => {
      const code = 'div {\ncolor: red;\n}';
      const formatted = formatCSS(code, 2);
      expect(formatted).toContain('div {');
      expect(formatted).toContain('color: red;');
    });
  });

  describe('getCSSPropertySuggestions', () => {
    it('deve sugerir propriedades CSS válidas', () => {
      const suggestions = getCSSPropertySuggestions('color');
      expect(suggestions).toContain('color');
    });
  });

  describe('getCSSValueSuggestions', () => {
    it('deve sugerir valores para propriedade display', () => {
      const suggestions = getCSSValueSuggestions('display');
      expect(suggestions).toContain('flex');
      expect(suggestions).toContain('grid');
    });
  });
});
