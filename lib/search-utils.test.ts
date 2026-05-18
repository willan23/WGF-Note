import { describe, expect, it } from 'vitest';
import {
  findMatches,
  getAdjacentMatch,
  replaceAllMatches,
  replaceMatch,
} from './search-utils';

describe('search-utils', () => {
  it('encontra correspondências sem distinguir maiúsculas por padrão', () => {
    expect(findMatches('Teste teste TESTE', 'teste')).toEqual([
      { start: 0, end: 5 },
      { start: 6, end: 11 },
      { start: 12, end: 17 },
    ]);
  });

  it('respeita correspondências de palavra inteira', () => {
    expect(findMatches('cat scatter cat', 'cat', { caseSensitive: false, wholeWord: true })).toEqual([
      { start: 0, end: 3 },
      { start: 12, end: 15 },
    ]);
  });

  it('navega com wrap entre correspondências', () => {
    const matches = findMatches('um dois um', 'um');

    expect(getAdjacentMatch(matches, 0, 2, 'next')).toEqual({ start: 8, end: 10 });
    expect(getAdjacentMatch(matches, 0, 0, 'previous')).toEqual({ start: 8, end: 10 });
  });

  it('substitui uma correspondência e todas as correspondências', () => {
    const matches = findMatches('a b a', 'a');

    expect(replaceMatch('a b a', matches[0], 'x')).toEqual({
      content: 'x b a',
      selectionStart: 1,
      selectionEnd: 1,
    });
    expect(replaceAllMatches('a b a', matches, 'x')).toEqual({
      content: 'x b x',
      selectionStart: 1,
      selectionEnd: 1,
    });
  });
});
