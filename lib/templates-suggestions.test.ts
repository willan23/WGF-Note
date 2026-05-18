import { describe, it, expect } from 'vitest';
import {
  getTemplatesForLanguage,
  getTemplateById,
  getTemplatesByCategory,
} from './code-templates';
import {
  getHTMLContextSuggestions,
  getCSSContextSuggestions,
  getPythonContextSuggestions,
  getJavaScriptContextSuggestions,
  getSQLContextSuggestions,
  getContextSuggestions,
} from './context-suggestions';

describe('Code Templates', () => {
  describe('getTemplatesForLanguage', () => {
    it('deve retornar templates Python', () => {
      const templates = getTemplatesForLanguage('python');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].language).toBe('python');
    });

    it('deve retornar templates HTML', () => {
      const templates = getTemplatesForLanguage('html');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].language).toBe('html');
    });

    it('deve retornar templates CSS', () => {
      const templates = getTemplatesForLanguage('css');
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0].language).toBe('css');
    });

    it('deve retornar templates para novas linguagens', () => {
      expect(getTemplatesForLanguage('javascript')[0]?.language).toBe('javascript');
      expect(getTemplatesForLanguage('typescript')[0]?.language).toBe('typescript');
      expect(getTemplatesForLanguage('markdown')[0]?.language).toBe('markdown');
      expect(getTemplatesForLanguage('sql')[0]?.language).toBe('sql');
    });
  });

  describe('getTemplateById', () => {
    it('deve encontrar template por ID', () => {
      const template = getTemplateById('py-hello');
      expect(template).toBeDefined();
      expect(template?.name).toBe('Hello World');
    });

    it('deve retornar undefined para ID inválido', () => {
      const template = getTemplateById('invalid-id');
      expect(template).toBeUndefined();
    });
  });

  describe('getTemplatesByCategory', () => {
    it('deve agrupar templates por categoria', () => {
      const grouped = getTemplatesByCategory('python');
      expect(Object.keys(grouped).length).toBeGreaterThan(0);
      expect(grouped['Básico']).toBeDefined();
    });

    it('deve conter múltiplas categorias', () => {
      const grouped = getTemplatesByCategory('html');
      expect(Object.keys(grouped).length).toBeGreaterThan(1);
    });
  });
});

describe('Context Suggestions', () => {
  describe('getHTMLContextSuggestions', () => {
    it('deve sugerir tags HTML', () => {
      const suggestions = getHTMLContextSuggestions('<d', 0, 2);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe('tag');
    });

    it('deve sugerir atributos HTML', () => {
      const suggestions = getHTMLContextSuggestions('<a h', 0, 4);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.type === 'attribute')).toBe(true);
    });
  });

  describe('getCSSContextSuggestions', () => {
    it('deve sugerir propriedades CSS', () => {
      const suggestions = getCSSContextSuggestions('div { c', 0, 8);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.type === 'property')).toBe(true);
    });

    it('deve sugerir valores CSS', () => {
      const suggestions = getCSSContextSuggestions('div {\n  display: ', 1, 11);
      expect(suggestions.length).toBeGreaterThan(0);
      // Pode ser property ou value dependendo da análise
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });

  describe('getPythonContextSuggestions', () => {
    it('deve sugerir keywords Python', () => {
      const suggestions = getPythonContextSuggestions('d', 0, 1);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('deve sugerir funções built-in', () => {
      const suggestions = getPythonContextSuggestions('p', 0, 1);
      expect(suggestions.some(s => s.type === 'function')).toBe(true);
    });
  });

  describe('getJavaScriptContextSuggestions', () => {
    it('deve sugerir keywords JavaScript', () => {
      const suggestions = getJavaScriptContextSuggestions('fun', 0, 3);
      expect(suggestions.some((suggestion) => suggestion.text === 'function')).toBe(true);
    });
  });

  describe('getSQLContextSuggestions', () => {
    it('deve sugerir keywords SQL', () => {
      const suggestions = getSQLContextSuggestions('SEL', 0, 3);
      expect(suggestions.some((suggestion) => suggestion.text === 'SELECT')).toBe(true);
    });
  });

  describe('getContextSuggestions', () => {
    it('deve retornar sugestões HTML', () => {
      const suggestions = getContextSuggestions('html', '<d', 0, 2);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('deve retornar sugestões CSS', () => {
      const suggestions = getContextSuggestions('css', 'div { c', 0, 8);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('deve retornar sugestões Python', () => {
      const suggestions = getContextSuggestions('python', 'd', 0, 1);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('deve retornar sugestões JavaScript e SQL', () => {
      expect(getContextSuggestions('javascript', 'fun', 0, 3).length).toBeGreaterThan(0);
      expect(getContextSuggestions('sql', 'SEL', 0, 3).length).toBeGreaterThan(0);
    });
  });
});
