import { describe, expect, it } from 'vitest';
import {
  detectLanguageFromExtension,
  getAvailableLanguages,
  getLanguageConfig,
  isSupportedFileExtension,
} from './types-extended';

describe('types-extended', () => {
  it('deteta linguagens por extensão', () => {
    expect(detectLanguageFromExtension('app.js')).toBe('javascript');
    expect(detectLanguageFromExtension('app.tsx')).toBe('typescript');
    expect(detectLanguageFromExtension('README.md')).toBe('markdown');
    expect(detectLanguageFromExtension('query.sql')).toBe('sql');
    expect(detectLanguageFromExtension('program.cpp')).toBe('cpp');
    expect(detectLanguageFromExtension('notes.unknown')).toBe('plaintext');
  });

  it('expõe extensões e configurações das novas linguagens', () => {
    expect(isSupportedFileExtension('cs')).toBe(true);
    expect(isSupportedFileExtension('png')).toBe(false);
    expect(getLanguageConfig('typescript').extension).toBe('ts');
    expect(getAvailableLanguages().length).toBeGreaterThanOrEqual(13);
  });
});
