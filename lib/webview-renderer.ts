/**
 * WebView Renderer Service
 * Gerencia renderização de HTML/CSS em WebView nativa
 */

export interface WebViewMessage {
  type: 'code-update' | 'console-log' | 'console-error' | 'ready' | 'execute-js';
  data: any;
}

export interface RenderOptions {
  enableJavaScript?: boolean;
  enableConsole?: boolean;
  sandboxMode?: boolean;
  timeout?: number;
}

/**
 * Gera HTML para renderização no WebView
 * Injeta código CSS/JavaScript do utilizador
 */
export function generateWebViewHTML(
  htmlCode: string,
  cssCode: string,
  jsCode: string,
  options: RenderOptions = {}
): string {
  const {
    enableJavaScript = true,
    enableConsole = true,
    sandboxMode = true,
  } = options;

  // Sanitizar código para evitar injeção
  const sanitizedHTML = sanitizeHTML(htmlCode);
  const sanitizedCSS = sanitizeCSS(cssCode);
  const sanitizedJS = enableJavaScript ? sanitizeJavaScript(jsCode) : '';

  // Criar console mock se necessário
  const consoleMock = enableConsole
    ? `
    <script>
      window.consoleLogs = [];
      window.consoleErrors = [];
      
      const originalLog = console.log;
      const originalError = console.error;
      
      console.log = function(...args) {
        window.consoleLogs.push(args.map(a => String(a)).join(' '));
        originalLog.apply(console, args);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'console-log',
            data: args.map(a => String(a)).join(' ')
          }));
        }
      };
      
      console.error = function(...args) {
        window.consoleErrors.push(args.map(a => String(a)).join(' '));
        originalError.apply(console, args);
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'console-error',
            data: args.map(a => String(a)).join(' ')
          }));
        }
      };
    </script>
  `
    : '';

  return `
    <!DOCTYPE html>
    <html lang="pt-PT">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Preview</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: #fff;
          color: #333;
        }
        ${sanitizedCSS}
      </style>
    </head>
    <body>
      ${sanitizedHTML}
      ${consoleMock}
      <script>
        window.addEventListener('message', (event) => {
          if (event.data.type === 'execute-js') {
            try {
              eval(event.data.code);
            } catch (error) {
              console.error('Erro ao executar JavaScript:', error.message);
            }
          }
        });
        
        window.parent.postMessage({ type: 'ready' }, '*');
      </script>
      ${sanitizedJS ? `<script>${sanitizedJS}</script>` : ''}
    </body>
    </html>
  `;
}

/**
 * Sanitiza HTML para evitar injeção de código malicioso
 */
function sanitizeHTML(html: string): string {
  // Relaxed for local preview
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
}

/**
 * Sanitiza CSS para evitar injeção de código
 */
function sanitizeCSS(css: string): string {
  // Remover @import e @keyframes perigosas
  let sanitized = css
    .replace(/@import\s+[^;]+;/gi, '')
    .replace(/expression\s*\([^)]*\)/gi, '')
    .replace(/javascript:/gi, '');

  return sanitized;
}

/**
 * Sanitiza JavaScript para evitar código malicioso
 */
function sanitizeJavaScript(js: string): string {
  // Remover eval, Function constructor, e acesso a window.parent
  let sanitized = js
    .replace(/\beval\s*\(/gi, 'void(')
    .replace(/\bnew\s+Function\s*\(/gi, 'void(')
    .replace(/window\.parent/gi, 'void')
    .replace(/window\.top/gi, 'void')
    .replace(/document\.write/gi, 'void');

  return sanitized;
}

/**
 * Cria um data URL para WebView
 */
export function createWebViewDataURL(
  htmlCode: string,
  cssCode: string,
  jsCode: string,
  options?: RenderOptions
): string {
  const html = generateWebViewHTML(htmlCode, cssCode, jsCode, options);
  const encoded = encodeURIComponent(html);
  return `data:text/html;charset=utf-8,${encoded}`;
}

/**
 * Extrai código HTML, CSS e JavaScript de um ficheiro
 */
export function extractCodeFromHTML(html: string): {
  htmlCode: string;
  cssCode: string;
  jsCode: string;
} {
  const cssMatch = html.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const jsMatch = html.match(/<script[^>]*>([\s\S]*?)<\/script>/i);

  const cssCode = cssMatch ? cssMatch[1] : '';
  const jsCode = jsMatch ? jsMatch[1] : '';

  // Remover style e script tags do HTML
  const htmlCode = html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  return { htmlCode, cssCode, jsCode };
}

/**
 * Valida se o código HTML é válido
 */
export function validateHTML(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Verificar tags não fechadas
  const openTags = html.match(/<([a-z][a-z0-9]*)[^>]*>/gi) || [];
  const closeTags = html.match(/<\/([a-z][a-z0-9]*)>/gi) || [];

  const selfClosingTags = ['br', 'hr', 'img', 'input', 'meta', 'link'];

  for (const tag of openTags) {
    const tagName = tag.match(/<([a-z][a-z0-9]*)/i)?.[1]?.toLowerCase();
    if (tagName && !selfClosingTags.includes(tagName)) {
      const closeTag = `</${tagName}>`;
      if (!html.includes(closeTag)) {
        errors.push(`Tag não fechada: <${tagName}>`);
      }
    }
  }

  // Verificar DOCTYPE (Opcional no editor)
  /* if (!html.match(/<!DOCTYPE\s+html>/i)) {
    errors.push('DOCTYPE não encontrado');
  } */

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Minifica HTML/CSS/JS
 */
export function minifyCode(code: string, type: 'html' | 'css' | 'js'): string {
  switch (type) {
    case 'html':
      return code
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .trim();

    case 'css':
      return code
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .replace(/\s*([{}:;,])\s*/g, '$1')
        .trim();

    case 'js':
      return code
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\s+/g, ' ')
        .trim();

    default:
      return code;
  }
}

/**
 * Formata código HTML/CSS/JS
 */
export function formatCode(code: string, type: 'html' | 'css' | 'js'): string {
  switch (type) {
    case 'html':
      return formatHTML(code);
    case 'css':
      return formatCSS(code);
    case 'js':
      return formatJavaScript(code);
    default:
      return code;
  }
}

function formatHTML(html: string): string {
  let formatted = '';
  let indent = 0;

  const lines = html.split(/>\s*</);

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    if (i > 0) line = '<' + line;
    if (i < lines.length - 1) line = line + '>';

    if (line.match(/^<\/\w/)) {
      indent = Math.max(0, indent - 1);
    }

    formatted += '  '.repeat(indent) + line.trim() + '\n';

    if (line.match(/^<\w[^>]*[^/]>$/) && !line.match(/^<(br|hr|img|input|meta|link)/)) {
      indent++;
    }
  }

  return formatted;
}

function formatCSS(css: string): string {
  return css
    .replace(/\s*{\s*/g, ' {\n  ')
    .replace(/;\s*/g, ';\n  ')
    .replace(/\s*}\s*/g, '\n}\n')
    .replace(/,\s*/g, ',\n  ');
}

function formatJavaScript(js: string): string {
  return js
    .replace(/\s*{\s*/g, ' {\n  ')
    .replace(/;\s*/g, ';\n')
    .replace(/\s*}\s*/g, '\n}\n')
    .replace(/,\s*/g, ', ');
}
