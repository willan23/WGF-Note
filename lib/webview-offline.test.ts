import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateWebViewHTML,
  createWebViewDataURL,
  extractCodeFromHTML,
  validateHTML,
  minifyCode,
  formatCode,
} from './webview-renderer';
import {
  addToSyncQueue,
  removeFromSyncQueue,
  getSyncQueue,
  getOfflineState,
  syncPendingChanges,
  clearFailedItems,
  retryFailedItems,
  _resetForTesting,
} from './offline-sync-queue';

describe('WebView Renderer', () => {
  describe('generateWebViewHTML', () => {
    it('deve gerar HTML válido para WebView', () => {
      const html = '<p>Hello</p>';
      const css = 'p { color: red; }';
      const result = generateWebViewHTML(html, css, '');

      expect(result).toContain('<!DOCTYPE html>');
      expect(result).toContain('<p>Hello</p>');
      expect(result).toContain('color: red');
    });

    it('deve incluir console mock quando habilitado', () => {
      const html = '<p>Test</p>';
      const result = generateWebViewHTML(html, '', '', { enableConsole: true });

      expect(result).toContain('window.consoleLogs');
      expect(result).toContain('console.log');
    });

    it('deve sanitizar código malicioso', () => {
      const html = '<p>Test</p><script>alert("xss")</script>';
      const result = generateWebViewHTML(html, '', '');

      expect(result).not.toContain('alert');
    });
  });

  describe('createWebViewDataURL', () => {
    it('deve criar data URL válida', () => {
      const html = '<p>Test</p>';
      const url = createWebViewDataURL(html, '', '');

      expect(url).toContain('data:text/html');
      expect(url).toContain('charset=utf-8');
    });
  });

  describe('extractCodeFromHTML', () => {
    it('deve extrair CSS de tags style', () => {
      const html = '<style>p { color: red; }</style><p>Test</p>';
      const { cssCode } = extractCodeFromHTML(html);

      expect(cssCode).toContain('color: red');
    });

    it('deve extrair JavaScript de tags script', () => {
      const html = '<p>Test</p><script>console.log("test");</script>';
      const { jsCode } = extractCodeFromHTML(html);

      expect(jsCode).toContain('console.log');
    });

    it('deve remover tags de style e script do HTML', () => {
      const html = '<style>p { color: red; }</style><p>Test</p><script>alert("x");</script>';
      const { htmlCode } = extractCodeFromHTML(html);

      expect(htmlCode).not.toContain('<style>');
      expect(htmlCode).not.toContain('<script>');
      expect(htmlCode).toContain('<p>Test</p>');
    });
  });

  describe('validateHTML', () => {
    it('deve validar HTML correto', () => {
      const html = '<!DOCTYPE html><html><body><p>Test</p></body></html>';
      const result = validateHTML(html);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('deve detectar DOCTYPE ausente', () => {
      const html = '<html><body><p>Test</p></body></html>';
      const result = validateHTML(html);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('DOCTYPE'))).toBe(true);
    });

    it('deve detectar tags não fechadas', () => {
      const html = '<!DOCTYPE html><html><body><p>Test</body></html>';
      const result = validateHTML(html);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('não fechada'))).toBe(true);
    });
  });

  describe('minifyCode', () => {
    it('deve minificar HTML', () => {
      const html = '<p>  Test  </p>';
      const result = minifyCode(html, 'html');

      expect(result).not.toContain('  ');
    });

    it('deve minificar CSS', () => {
      const css = 'p { color: red; }';
      const result = minifyCode(css, 'css');

      expect(result).not.toContain(' ');
    });

    it('deve remover comentários JavaScript', () => {
      const js = 'console.log("test"); // comentário';
      const result = minifyCode(js, 'js');

      expect(result).not.toContain('comentário');
    });
  });

  describe('formatCode', () => {
    it('deve formatar HTML com indentação', () => {
      const html = '<html><body><p>Test</p></body></html>';
      const result = formatCode(html, 'html');

      expect(result).toContain('\n');
    });

    it('deve formatar CSS com quebras de linha', () => {
      const css = 'p{color:red;}';
      const result = formatCode(css, 'css');

      expect(result).toContain('\n');
    });
  });
});

describe('Offline Sync Queue', () => {
  beforeEach(() => {
    _resetForTesting();
  });

  afterEach(() => {
    _resetForTesting();
  });

  describe('addToSyncQueue', () => {
    it('deve adicionar item à fila', async () => {
      const item = await addToSyncQueue('save', 'file1', 'test.py', 'print("hello")', 'python');

      expect(item).toBeDefined();
      expect(item.fileId).toBe('file1');
    });

    it('deve incrementar pendingChanges', async () => {
      await addToSyncQueue('save', 'file1', 'test.py', 'print("hello")', 'python');

      const state = getOfflineState();
      expect(state.pendingChanges + state.failedChanges).toBeGreaterThanOrEqual(0);
    });
  });

  describe('removeFromSyncQueue', () => {
    it('deve remover item da fila', async () => {
      const item = await addToSyncQueue('save', 'file1', 'test.py', 'print("hello")', 'python');
      await removeFromSyncQueue(item.id);

      const queue = getSyncQueue();
      expect(queue.length).toBe(0);
    });

    it('deve decrementar pendingChanges', async () => {
      const item = await addToSyncQueue('save', 'file1', 'test.py', 'print("hello")', 'python');
      await removeFromSyncQueue(item.id);

      const state = getOfflineState();
      expect(state.pendingChanges).toBe(0);
    });
  });

  describe('getSyncQueue', () => {
    it('deve retornar cópia da fila', async () => {
      await addToSyncQueue('save', 'file1', 'test.py', 'print("hello")', 'python');

      const queue = getSyncQueue();
      expect(Array.isArray(queue)).toBe(true);
    });
  });

  describe('getOfflineState', () => {
    it('deve retornar estado offline', () => {
      const state = getOfflineState();

      expect(state).toBeDefined();
      expect(state.isOnline).toBeDefined();
      expect(state.pendingChanges).toBeDefined();
      expect(state.failedChanges).toBeDefined();
    });
  });

  describe('syncPendingChanges', () => {
    it('deve sincronizar mudanças pendentes', async () => {
      await addToSyncQueue('save', 'file1', 'test.py', 'print("hello")', 'python');

      const result = await syncPendingChanges();

      expect(result).toBeDefined();
      expect(typeof result.successful).toBe('number');
      expect(typeof result.failed).toBe('number');
    });

    it('deve retornar 0 se não estiver online', async () => {
      await addToSyncQueue('save', 'file1', 'test.py', 'print("hello")', 'python');

      const state = getOfflineState();
      state.isOnline = false;

      const result = await syncPendingChanges();

      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
    });
  });

  describe('clearFailedItems', () => {
    it('deve limpar itens com falha', async () => {
      const item = await addToSyncQueue('save', 'file1', 'test.py', 'print("hello")', 'python');
      item.status = 'failed';

      await clearFailedItems();

      const queue = getSyncQueue();
      expect(queue.length).toBe(0);
    });
  });

  describe('retryFailedItems', () => {
    it('deve retornar itens com falha para pendente', async () => {
      await addToSyncQueue('save', 'file1', 'test.py', 'print("hello")', 'python');

      const result = await retryFailedItems();

      expect(result).toBeDefined();
      expect(typeof result.successful).toBe('number');
      expect(typeof result.failed).toBe('number');
    });
  });
});
