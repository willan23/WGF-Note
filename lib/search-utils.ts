export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
}

export interface SearchMatch {
  start: number;
  end: number;
}

const defaultOptions: SearchOptions = {
  caseSensitive: false,
  wholeWord: false,
};

function isWordCharacter(value: string | undefined): boolean {
  return Boolean(value && /[A-Za-z0-9_]/.test(value));
}

function isWholeWordMatch(content: string, start: number, end: number): boolean {
  return !isWordCharacter(content[start - 1]) && !isWordCharacter(content[end]);
}

// Cache de resultados de busca para consultas repetidas
const searchCache = new Map<string, SearchMatch[]>();
const CACHE_MAX_SIZE = 500;

function getCacheKey(content: string, query: string, options: SearchOptions): string {
  return `${content.length}:${query}:${options.caseSensitive}:${options.wholeWord}`;
}

function cacheResults(key: string, matches: SearchMatch[]): void {
  if (searchCache.size >= CACHE_MAX_SIZE) {
    // Remove o primeiro item (LRU simples)
    const firstKey = searchCache.keys().next().value;
    if (firstKey) {
      searchCache.delete(firstKey);
    }
  }
  searchCache.set(key, matches);
}

export function clearSearchCache(): void {
  searchCache.clear();
}

export function findMatches(
  content: string,
  query: string,
  options: SearchOptions = defaultOptions,
): SearchMatch[] {
  if (!query) return [];

  // Tentar usar cache primeiro
  const cacheKey = getCacheKey(content, query, options);
  const cached = searchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const haystack = options.caseSensitive ? content : content.toLocaleLowerCase();
  const needle = options.caseSensitive ? query : query.toLocaleLowerCase();
  const matches: SearchMatch[] = [];
  let searchFrom = 0;

  while (searchFrom <= haystack.length - needle.length) {
    const start = haystack.indexOf(needle, searchFrom);
    if (start === -1) break;

    const end = start + needle.length;
    if (!options.wholeWord || isWholeWordMatch(content, start, end)) {
      matches.push({ start, end });
    }

    searchFrom = Math.max(end, start + 1);
  }

  // Cache dos resultados
  cacheResults(cacheKey, matches);

  return matches;
}

export function getActiveMatchIndex(
  matches: SearchMatch[],
  selectionStart: number,
  selectionEnd: number,
): number {
  return matches.findIndex(
    (match) => match.start === selectionStart && match.end === selectionEnd,
  );
}

export function getAdjacentMatch(
  matches: SearchMatch[],
  selectionStart: number,
  selectionEnd: number,
  direction: 'next' | 'previous',
): SearchMatch | null {
  if (matches.length === 0) return null;

  const activeIndex = getActiveMatchIndex(matches, selectionStart, selectionEnd);
  if (activeIndex >= 0) {
    const nextIndex =
      direction === 'next'
        ? (activeIndex + 1) % matches.length
        : (activeIndex - 1 + matches.length) % matches.length;
    return matches[nextIndex];
  }

  if (direction === 'next') {
    return matches.find((match) => match.start >= selectionEnd) ?? matches[0];
  }

  for (let index = matches.length - 1; index >= 0; index -= 1) {
    if (matches[index].end <= selectionStart) {
      return matches[index];
    }
  }

  return matches[matches.length - 1];
}

export function replaceMatch(
  content: string,
  match: SearchMatch,
  replacement: string,
): { content: string; selectionStart: number; selectionEnd: number } {
  const nextContent = `${content.slice(0, match.start)}${replacement}${content.slice(match.end)}`;
  const caret = match.start + replacement.length;

  return {
    content: nextContent,
    selectionStart: caret,
    selectionEnd: caret,
  };
}

export function replaceAllMatches(
  content: string,
  matches: SearchMatch[],
  replacement: string,
): { content: string; selectionStart: number; selectionEnd: number } {
  if (matches.length === 0) {
    return {
      content,
      selectionStart: 0,
      selectionEnd: 0,
    };
  }

  let nextContent = content;
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    nextContent = `${nextContent.slice(0, match.start)}${replacement}${nextContent.slice(match.end)}`;
  }

  return {
    content: nextContent,
    selectionStart: matches[0].start + replacement.length,
    selectionEnd: matches[0].start + replacement.length,
  };
}
