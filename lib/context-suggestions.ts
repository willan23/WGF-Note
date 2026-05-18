/**
 * Sugestões contextuais inteligentes para múltiplas linguagens
 */

import type { CodeLanguage } from './types-extended';

export interface Suggestion {
  text: string;
  type: 'tag' | 'attribute' | 'property' | 'value' | 'keyword' | 'function' | 'class';
  description: string;
  insertText?: string;
}

/**
 * Obtém sugestões contextuais para HTML baseadas na posição do cursor
 */
export function getHTMLContextSuggestions(code: string, line: number, column: number): Suggestion[] {
  const lines = code.split('\n');
  const currentLine = lines[line] || '';
  const beforeCursor = currentLine.substring(0, column);
  const suggestions: Suggestion[] = [];

  // Detectar se estamos dentro de uma tag
  const tagMatch = beforeCursor.match(/<([a-zA-Z]*)$/);
  if (tagMatch) {
    const partial = tagMatch[1].toLowerCase();
    const commonTags = [
      { text: 'div', description: 'Contentor genérico' },
      { text: 'p', description: 'Parágrafo' },
      { text: 'h1', description: 'Título nível 1' },
      { text: 'h2', description: 'Título nível 2' },
      { text: 'h3', description: 'Título nível 3' },
      { text: 'span', description: 'Texto inline' },
      { text: 'a', description: 'Link' },
      { text: 'img', description: 'Imagem' },
      { text: 'button', description: 'Botão' },
      { text: 'input', description: 'Campo de entrada' },
      { text: 'form', description: 'Formulário' },
      { text: 'table', description: 'Tabela' },
      { text: 'ul', description: 'Lista não ordenada' },
      { text: 'ol', description: 'Lista ordenada' },
      { text: 'li', description: 'Item de lista' },
      { text: 'header', description: 'Cabeçalho semântico' },
      { text: 'footer', description: 'Rodapé semântico' },
      { text: 'nav', description: 'Navegação semântica' },
      { text: 'main', description: 'Conteúdo principal' },
      { text: 'article', description: 'Artigo semântico' },
      { text: 'section', description: 'Seção semântica' },
    ];

    return commonTags
      .filter(tag => tag.text.startsWith(partial))
      .map(tag => ({
        text: tag.text,
        type: 'tag',
        description: tag.description,
        insertText: tag.text,
      }));
  }

  // Detectar se estamos em atributos
  const attrMatch = beforeCursor.match(/<([a-zA-Z][a-zA-Z0-9]*)\s+([a-zA-Z]*)$/);
  if (attrMatch) {
    const tagName = attrMatch[1].toLowerCase();
    const partial = attrMatch[2].toLowerCase();

    const attributeMap: Record<string, string[]> = {
      'a': ['href', 'target', 'title', 'rel', 'download'],
      'img': ['src', 'alt', 'width', 'height', 'loading', 'srcset'],
      'input': ['type', 'name', 'value', 'placeholder', 'required', 'disabled', 'readonly'],
      'button': ['type', 'name', 'value', 'disabled', 'onclick'],
      'form': ['action', 'method', 'enctype', 'target', 'novalidate'],
      'div': ['class', 'id', 'style', 'data-*'],
      'span': ['class', 'id', 'style', 'data-*'],
      'default': ['class', 'id', 'style', 'title', 'data-*'],
    };

    const attrs = attributeMap[tagName] || attributeMap['default'];
    return attrs
      .filter(attr => attr.startsWith(partial))
      .map(attr => ({
        text: attr,
        type: 'attribute',
        description: `Atributo: ${attr}`,
        insertText: attr + '=""',
      }));
  }

  // Sugestões gerais de tags se não estamos em contexto específico
  if (beforeCursor.includes('<') && !beforeCursor.includes('>')) {
    return [];
  }

  return suggestions;
}

/**
 * Obtém sugestões contextuais para CSS baseadas na posição do cursor
 */
export function getCSSContextSuggestions(code: string, line: number, column: number): Suggestion[] {
  const lines = code.split('\n');
  const currentLine = lines[line] || '';
  const beforeCursor = currentLine.substring(0, column);
  const suggestions: Suggestion[] = [];

  // Detectar se estamos em um seletor
  if (beforeCursor.includes('{') && !beforeCursor.includes('}')) {
    // Estamos dentro de uma regra CSS
    const propertyMatch = beforeCursor.match(/([a-z-]*)$/i);
    if (propertyMatch) {
      const partial = propertyMatch[1].toLowerCase();

      const commonProperties = [
        { text: 'color', description: 'Cor do texto', value: '#000000' },
        { text: 'background', description: 'Fundo', value: '#ffffff' },
        { text: 'background-color', description: 'Cor de fundo', value: '#ffffff' },
        { text: 'font-size', description: 'Tamanho da fonte', value: '16px' },
        { text: 'font-weight', description: 'Peso da fonte', value: 'normal' },
        { text: 'padding', description: 'Espaço interno', value: '10px' },
        { text: 'margin', description: 'Espaço externo', value: '10px' },
        { text: 'border', description: 'Borda', value: '1px solid #000' },
        { text: 'width', description: 'Largura', value: '100%' },
        { text: 'height', description: 'Altura', value: 'auto' },
        { text: 'display', description: 'Tipo de exibição', value: 'block' },
        { text: 'flex', description: 'Flexbox', value: '1' },
        { text: 'justify-content', description: 'Alinhamento horizontal (flex)', value: 'center' },
        { text: 'align-items', description: 'Alinhamento vertical (flex)', value: 'center' },
        { text: 'position', description: 'Posicionamento', value: 'relative' },
        { text: 'top', description: 'Distância do topo', value: '0' },
        { text: 'left', description: 'Distância da esquerda', value: '0' },
        { text: 'z-index', description: 'Profundidade', value: '1' },
        { text: 'opacity', description: 'Opacidade', value: '1' },
        { text: 'transform', description: 'Transformação', value: 'scale(1)' },
        { text: 'transition', description: 'Transição', value: 'all 0.3s ease' },
        { text: 'box-shadow', description: 'Sombra', value: '0 2px 4px rgba(0,0,0,0.1)' },
        { text: 'border-radius', description: 'Cantos arredondados', value: '4px' },
        { text: 'overflow', description: 'Transbordamento', value: 'hidden' },
      ];

      return commonProperties
        .filter(prop => prop.text.startsWith(partial))
        .map(prop => ({
          text: prop.text,
          type: 'property',
          description: prop.description,
          insertText: `${prop.text}: ${prop.value};`,
        }));
    }
  }

  // Detectar se estamos em um valor de propriedade
  const valueMatch = beforeCursor.match(/:\s*([a-z0-9-#]*)$/i);
  if (valueMatch) {
    const partial = valueMatch[1].toLowerCase();
    const propertyMatch = beforeCursor.match(/([a-z-]+)\s*:/i);
    const property = propertyMatch ? propertyMatch[1].toLowerCase() : '';

    const valueMap: Record<string, string[]> = {
      'display': ['block', 'inline', 'inline-block', 'flex', 'grid', 'none', 'table'],
      'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
      'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'],
      'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
      'align-items': ['flex-start', 'flex-end', 'center', 'stretch', 'baseline'],
      'overflow': ['visible', 'hidden', 'scroll', 'auto'],
      'text-align': ['left', 'right', 'center', 'justify'],
      'cursor': ['pointer', 'default', 'text', 'move', 'wait', 'help'],
      'font-weight': ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
    };

    const values = valueMap[property] || [];
    return values
      .filter(val => val.startsWith(partial))
      .map(val => ({
        text: val,
        type: 'value',
        description: `Valor: ${val}`,
        insertText: val,
      }));
  }

  // Detectar seletores de classe
  if (beforeCursor.match(/\.\s*[a-z0-9-]*$/i)) {
    const partial = beforeCursor.match(/\.([a-z0-9-]*)$/i)?.[1] || '';
    const commonClasses = ['container', 'wrapper', 'header', 'footer', 'nav', 'main', 'content', 'sidebar', 'button', 'card', 'item'];
    
    return commonClasses
      .filter(cls => cls.startsWith(partial))
      .map(cls => ({
        text: cls,
        type: 'keyword',
        description: `Classe: ${cls}`,
        insertText: cls,
      }));
  }

  return suggestions;
}

/**
 * Obtém sugestões contextuais para Python
 */
export function getPythonContextSuggestions(code: string, line: number, column: number): Suggestion[] {
  const lines = code.split('\n');
  const currentLine = lines[line] || '';
  const beforeCursor = currentLine.substring(0, column);

  const pythonKeywords = [
    'def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except',
    'finally', 'with', 'import', 'from', 'return', 'yield', 'pass', 'break',
    'continue', 'lambda', 'and', 'or', 'not', 'in', 'is', 'None', 'True', 'False',
  ];

  const builtinFunctions = [
    'print', 'len', 'range', 'str', 'int', 'float', 'list', 'dict', 'set',
    'tuple', 'open', 'input', 'sum', 'min', 'max', 'sorted', 'enumerate',
    'zip', 'map', 'filter', 'type', 'isinstance', 'hasattr', 'getattr',
  ];

  const partial = beforeCursor.match(/([a-zA-Z_]\w*)$/)?.[1] || '';

  if (!partial) {
    return [];
  }

  const suggestions: Suggestion[] = [];

  // Sugerir keywords
  pythonKeywords
    .filter(kw => kw.startsWith(partial.toLowerCase()))
    .forEach(kw => {
      suggestions.push({
        text: kw,
        type: 'keyword',
        description: `Palavra-chave Python: ${kw}`,
      });
    });

  // Sugerir funções built-in
  builtinFunctions
    .filter(fn => fn.startsWith(partial.toLowerCase()))
    .forEach(fn => {
      suggestions.push({
        text: fn,
        type: 'function',
        description: `Função built-in: ${fn}`,
        insertText: `${fn}()`,
      });
    });

  return suggestions;
}

export function getJavaScriptContextSuggestions(
  code: string,
  line: number,
  column: number,
): Suggestion[] {
  const lines = code.split('\n');
  const currentLine = lines[line] || '';
  const beforeCursor = currentLine.substring(0, column);
  const partial = beforeCursor.match(/([a-zA-Z_$][\w$]*)$/)?.[1] || '';
  if (!partial) return [];

  const keywords = [
    'const',
    'let',
    'function',
    'class',
    'if',
    'else',
    'for',
    'while',
    'switch',
    'return',
    'import',
    'export',
    'async',
    'await',
    'interface',
    'type',
  ];
  const functions = ['console.log', 'fetch', 'map', 'filter', 'reduce', 'setTimeout'];

  return [
    ...keywords
      .filter((keyword) => keyword.startsWith(partial))
      .map((keyword) => ({
        text: keyword,
        type: keyword === 'class' ? ('class' as const) : ('keyword' as const),
        description: `Palavra-chave JavaScript/TypeScript: ${keyword}`,
      })),
    ...functions
      .filter((fn) => fn.startsWith(partial))
      .map((fn) => ({
        text: fn,
        type: 'function' as const,
        description: `Função comum: ${fn}`,
        insertText: `${fn}()`,
      })),
  ];
}

export function getSQLContextSuggestions(
  code: string,
  line: number,
  column: number,
): Suggestion[] {
  const lines = code.split('\n');
  const currentLine = lines[line] || '';
  const beforeCursor = currentLine.substring(0, column);
  const partial = beforeCursor.match(/([a-zA-Z_]+)$/)?.[1]?.toUpperCase() || '';
  if (!partial) return [];

  const keywords = [
    'SELECT',
    'FROM',
    'WHERE',
    'JOIN',
    'LEFT JOIN',
    'GROUP BY',
    'ORDER BY',
    'INSERT INTO',
    'UPDATE',
    'DELETE FROM',
    'CREATE TABLE',
  ];

  return keywords
    .filter((keyword) => keyword.startsWith(partial))
    .map((keyword) => ({
      text: keyword,
      type: 'keyword' as const,
      description: `Palavra-chave SQL: ${keyword}`,
      insertText: keyword,
    }));
}

/**
 * Obtém sugestões contextuais baseadas na linguagem
 */
export function getContextSuggestions(
  language: CodeLanguage,
  code: string,
  line: number,
  column: number
): Suggestion[] {
  switch (language) {
    case 'html':
      return getHTMLContextSuggestions(code, line, column);
    case 'css':
      return getCSSContextSuggestions(code, line, column);
    case 'python':
      return getPythonContextSuggestions(code, line, column);
    case 'javascript':
    case 'typescript':
      return getJavaScriptContextSuggestions(code, line, column);
    case 'sql':
      return getSQLContextSuggestions(code, line, column);
    default:
      return [];
  }
}
