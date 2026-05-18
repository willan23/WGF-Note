import type { FileInfo } from './file-system-manager';
import type { LocalAIWorkspaceMemoryNote } from './local-ai-memory';
import { isSearchableWorkspaceFile, getWorkspaceRelativePath } from './workspace-search';
import { detectLanguageFromExtension, type CodeLanguage } from './types-extended';
import { getDesktopBridge } from './desktop-bridge';
import type { LocalAIProvider } from './types';

export interface LocalAIConfig {
  provider?: LocalAIProvider;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

export interface LocalAIContext {
  language: CodeLanguage;
  fileName: string;
  filePath?: string | null;
  fullContent: string;
  selectedText: string;
  instruction?: string;
}

export interface LocalAIExplanation {
  summary: string;
  keyPoints: string[];
}

export interface LocalAIEditProposal {
  title: string;
  summary: string;
  replacement: string;
}

export interface LocalAIProjectFileSummary {
  path: string;
  relativePath: string;
  language: CodeLanguage;
  size: number;
}

export interface LocalAIProjectSummary {
  files: LocalAIProjectFileSummary[];
  omittedFileCount: number;
}

export interface LocalAIOpenFileSummary {
  name: string;
  path: string | null;
  language: CodeLanguage;
  isModified: boolean;
  content?: string;
}

export interface LocalAIChatContext extends LocalAIContext {
  openFiles: LocalAIOpenFileSummary[];
  projectSummary: LocalAIProjectSummary;
  retrievedSnippets: LocalAIRetrievedSnippet[];
  workspaceMemoryNotes: LocalAIWorkspaceMemoryNote[];
}

export interface LocalAIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  references?: LocalAIChatReference[];
  editInstruction?: string;
}

export interface LocalAIChatReference {
  relativePath: string;
  line?: number;
  column?: number;
  label?: string;
}

export interface LocalAIChatResponse {
  answer: string;
  references: LocalAIChatReference[];
  editInstruction: string;
  memoryNotes: LocalAIWorkspaceMemoryNote[];
}

export interface LocalAIRetrievedSnippet {
  path: string;
  relativePath: string;
  language: CodeLanguage;
  lineStart: number;
  lineEnd: number;
  excerpt: string;
  score: number;
}

export interface OllamaModelInfo {
  name: string;
  model: string;
}

export interface LocalAIModelInfo {
  name: string;
  model: string;
}

interface OllamaChatResponse {
  message?: {
    content?: string;
  };
}

interface OllamaTagsResponse {
  models?: OllamaModelInfo[];
}

interface OpenAICompatibleModelListResponse {
  data?: Array<{
    id?: string;
  }>;
}

interface OpenAICompatibleChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export interface LocalAIWorkspaceSummaryDependencies {
  listFiles: (directoryUri: string) => Promise<FileInfo[]>;
}

export interface LocalAIWorkspaceSummaryOptions {
  maxFiles?: number;
}

export interface LocalAIRetrievalDependencies {
  listFiles: (directoryUri: string) => Promise<FileInfo[]>;
  readFile: (filePath: string) => Promise<string>;
}

export interface LocalAIRetrievalOptions {
  maxFiles?: number;
  maxSnippets?: number;
  surroundingLines?: number;
  excludePaths?: string[];
}

const explanationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string' },
    keyPoints: {
      type: 'array',
      items: { type: 'string' },
    },
  },
  required: ['summary', 'keyPoints'],
} as const;

const editProposalSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    summary: { type: 'string' },
    replacement: { type: 'string' },
  },
  required: ['title', 'summary', 'replacement'],
} as const;

const chatResponseSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    answer: { type: 'string' },
    references: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          relativePath: { type: 'string' },
          line: { type: 'integer' },
          column: { type: 'integer' },
          label: { type: 'string' },
        },
        required: ['relativePath'],
      },
    },
    editInstruction: { type: 'string' },
    memoryNotes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          text: { type: 'string' },
          evidences: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                relativePath: { type: 'string' },
                line: { type: 'integer' },
                column: { type: 'integer' },
                label: { type: 'string' },
              },
              required: ['relativePath'],
            },
          },
        },
        required: ['text', 'evidences'],
      },
    },
  },
  required: ['answer', 'references', 'editInstruction', 'memoryNotes'],
} as const;

const defaultWorkspaceSummaryMaxFiles = 40;
const defaultRetrievalMaxFiles = 120;
const defaultRetrievalMaxSnippets = 4;
const defaultRetrievalSurroundingLines = 2;
const maxFullContextLength = 12000;
const maxSelectionContextLength = 4000;
const retrievalStopWords = new Set([
  'a',
  'as',
  'ao',
  'aos',
  'de',
  'da',
  'das',
  'do',
  'dos',
  'e',
  'em',
  'o',
  'os',
  'que',
  'como',
  'para',
  'por',
  'com',
  'sem',
  'um',
  'uma',
  'the',
  'and',
  'or',
  'to',
  'of',
  'in',
  'on',
  'for',
  'is',
  'are',
  'this',
  'that',
]);
const retrievalSynonyms = new Map<string, string[]>([
  ['autenticacao', ['auth', 'login']],
  ['utilizador', ['user']],
  ['usuario', ['user']],
  ['ficheiro', ['file']],
  ['arquivo', ['file']],
  ['pasta', ['folder', 'directory']],
  ['guardar', ['save']],
  ['abrir', ['open']],
  ['erro', ['error']],
  ['tema', ['theme']],
  ['pesquisa', ['search']],
  ['substituicao', ['replace']],
]);

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed.slice(0, -4) : trimmed;
}

function normalizeOpenAICompatibleBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/v1') ? trimmed : `${trimmed}/v1`;
}

function getLocalAIProvider(config: Pick<LocalAIConfig, 'provider'>): LocalAIProvider {
  return config.provider ?? 'ollama';
}

export function getOllamaChatUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/api/chat`;
}

export function getOllamaTagsUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/api/tags`;
}

export function getOpenAICompatibleChatUrl(baseUrl: string): string {
  return `${normalizeOpenAICompatibleBaseUrl(baseUrl)}/chat/completions`;
}

export function getOpenAICompatibleModelsUrl(baseUrl: string): string {
  return `${normalizeOpenAICompatibleBaseUrl(baseUrl)}/models`;
}

function getAuthHeaders(apiKey?: string): Record<string, string> {
  const trimmedApiKey = apiKey?.trim();
  return trimmedApiKey ? { Authorization: `Bearer ${trimmedApiKey}` } : {};
}

async function requestOllamaJson<T>(
  baseUrl: string,
  endpoint: 'tags' | 'chat',
  body?: unknown,
): Promise<T> {
  const bridge = getDesktopBridge();
  if (bridge) {
    return endpoint === 'tags'
      ? ((await bridge.listOllamaModels(baseUrl)) as T)
      : ((await bridge.ollamaChat(baseUrl, body)) as T);
  }

  const response = await fetch(
    endpoint === 'tags' ? getOllamaTagsUrl(baseUrl) : getOllamaChatUrl(baseUrl),
    endpoint === 'tags'
      ? undefined
      : {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
  );

  if (!response.ok) {
    throw new Error(
      endpoint === 'tags'
        ? 'Não foi possível contactar o Ollama.'
        : 'A IA local não conseguiu responder.',
    );
  }

  return (await response.json()) as T;
}

async function requestOpenAICompatibleJson<T>(
  config: Pick<LocalAIConfig, 'baseUrl' | 'apiKey'>,
  endpoint: 'models' | 'chat',
  body?: unknown,
): Promise<T> {
  const bridge = getDesktopBridge();
  if (bridge) {
    return endpoint === 'models'
      ? ((await bridge.listOpenAICompatibleModels(
          config.baseUrl,
          config.apiKey ?? '',
        )) as T)
      : ((await bridge.openAICompatibleChat(
          config.baseUrl,
          config.apiKey ?? '',
          body,
        )) as T);
  }

  const response = await fetch(
    endpoint === 'models'
      ? getOpenAICompatibleModelsUrl(config.baseUrl)
      : getOpenAICompatibleChatUrl(config.baseUrl),
    endpoint === 'models'
      ? { headers: getAuthHeaders(config.apiKey) }
      : {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(config.apiKey),
          },
          body: JSON.stringify(body),
        },
  );

  if (!response.ok) {
    throw new Error(
      endpoint === 'models'
        ? 'Não foi possível contactar a API compatível.'
        : 'A API compatível não conseguiu responder.',
    );
  }

  return (await response.json()) as T;
}

async function requestLocalAIChatContent(
  config: LocalAIConfig,
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  schema: unknown,
): Promise<string | undefined> {
  const provider = getLocalAIProvider(config);

  if (provider === 'ollama') {
    const payload = await requestOllamaJson<OllamaChatResponse>(
      config.baseUrl,
      'chat',
      {
        model: config.model.trim(),
        stream: false,
        format: schema,
        messages,
      },
    );
    return payload.message?.content;
  }

  const payload = await requestOpenAICompatibleJson<OpenAICompatibleChatResponse>(
    config,
    'chat',
    {
      model: config.model.trim(),
      stream: false,
      response_format: { type: 'json_object' },
      messages,
    },
  );

  return payload.choices?.[0]?.message?.content;
}

function assertConfigured(config: LocalAIConfig): void {
  assertBaseUrl(config.baseUrl, getLocalAIProvider(config));

  if (!config.model.trim()) {
    throw new Error('Defina o modelo local.');
  }
}

function assertBaseUrl(baseUrl: string, provider: LocalAIProvider = 'ollama'): void {
  if (!baseUrl.trim()) {
    throw new Error(
      provider === 'ollama'
        ? 'Defina o endereço do Ollama.'
        : 'Defina o endereço da API compatível.',
    );
  }
}

function extractJsonObject(content: string): string | null {
  const fencedMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const source = fencedMatch?.[1]?.trim() ?? content.trim();
  const firstBrace = source.indexOf('{');
  if (firstBrace === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = firstBrace; index < source.length; index += 1) {
    const character = source[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (character === '\\') {
      escaped = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (character === '{') {
      depth += 1;
    } else if (character === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(firstBrace, index + 1);
      }
    }
  }

  return null;
}

function parseStructuredContent<T>(content: string | undefined): T {
  if (!content) {
    throw new Error('A IA local não devolveu conteúdo.');
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    const jsonObject = extractJsonObject(content);
    if (!jsonObject) {
      throw new Error('A IA local devolveu uma resposta inválida.');
    }

    try {
      return JSON.parse(jsonObject) as T;
    } catch {
      throw new Error('A IA local devolveu uma resposta inválida.');
    }
  }
}

export function clipLocalAIContextValue(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const marker = '\n\n[…conteúdo truncado localmente para manter o contexto útil…]\n\n';
  const availableLength = Math.max(0, maxLength - marker.length);
  const headLength = Math.ceil(availableLength * 0.7);
  const tailLength = Math.max(0, availableLength - headLength);

  return `${value.slice(0, headLength)}${marker}${value.slice(-tailLength)}`;
}

function buildContextBlock(context: LocalAIContext): string {
  return [
    `Ficheiro: ${context.fileName}`,
    context.filePath ? `Caminho: ${context.filePath}` : null,
    `Linguagem: ${context.language}`,
    '',
    'Código completo:',
    '```',
    clipLocalAIContextValue(context.fullContent, maxFullContextLength),
    '```',
    '',
    'Seleção atual:',
    '```',
    context.selectedText
      ? clipLocalAIContextValue(context.selectedText, maxSelectionContextLength)
      : '(sem seleção)',
    '```',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

function formatOpenFiles(openFiles: LocalAIOpenFileSummary[]): string {
  if (openFiles.length === 0) {
    return '- nenhum';
  }

  return openFiles
    .map((file) => {
      const modified = file.isModified ? ' · modificado' : '';
      const path = file.path ? ` · ${file.path}` : '';
      return `- ${file.name} (${file.language})${modified}${path}`;
    })
    .join('\n');
}

function formatProjectSummary(summary: LocalAIProjectSummary): string {
  if (summary.files.length === 0) {
    return '- nenhum ficheiro suportado encontrado';
  }

  const lines = summary.files.map(
    (file) => `- ${file.relativePath} (${file.language}, ${file.size} bytes)`,
  );

  if (summary.omittedFileCount > 0) {
    lines.push(`- …mais ${summary.omittedFileCount} ficheiro(s) não listados`);
  }

  return lines.join('\n');
}

function formatRetrievedSnippets(snippets: LocalAIRetrievedSnippet[]): string {
  if (snippets.length === 0) {
    return '- nenhum trecho adicional recuperado';
  }

  return snippets
    .map(
      (snippet) =>
        [
          `- ${snippet.relativePath} linhas ${snippet.lineStart}-${snippet.lineEnd}`,
          '```',
          snippet.excerpt,
          '```',
        ].join('\n'),
    )
    .join('\n');
}

function formatWorkspaceMemoryNotes(notes: LocalAIWorkspaceMemoryNote[]): string {
  if (notes.length === 0) {
    return '- sem memória durável ainda';
  }

  return notes
    .map((note) => {
      if (note.evidences.length === 0) {
        return `- ${note.text}`;
      }

      const evidences = note.evidences
        .map((evidence) => {
          const location = evidence.line ? ` linha ${evidence.line}` : '';
          return `${evidence.relativePath}${location}`;
        })
        .join('; ');

      return `- ${note.text}\n  evidências: ${evidences}`;
    })
    .join('\n');
}

function sanitizeChatReference(
  reference: unknown,
  knownPaths: Set<string>,
): LocalAIChatReference | null {
  if (!reference || typeof reference !== 'object') {
    return null;
  }

  const candidate = reference as Partial<LocalAIChatReference>;
  if (
    typeof candidate.relativePath !== 'string' ||
    !knownPaths.has(candidate.relativePath)
  ) {
    return null;
  }

  const nextReference: LocalAIChatReference = {
    relativePath: candidate.relativePath,
  };

  if (typeof candidate.line === 'number' && Number.isFinite(candidate.line)) {
    nextReference.line = Math.max(1, Math.floor(candidate.line));
  }

  if (typeof candidate.column === 'number' && Number.isFinite(candidate.column)) {
    nextReference.column = Math.max(1, Math.floor(candidate.column));
  }

  if (candidate.label?.trim()) {
    nextReference.label = candidate.label.trim();
  }

  return nextReference;
}

function dedupeChatReferences(
  references: LocalAIChatReference[],
): LocalAIChatReference[] {
  const referencesByKey = new Map<string, LocalAIChatReference>();

  for (const reference of references) {
    const key = [
      reference.relativePath,
      reference.line ?? '',
      reference.column ?? '',
      reference.label ?? '',
    ].join(':');
    referencesByKey.delete(key);
    referencesByKey.set(key, reference);
  }

  return Array.from(referencesByKey.values());
}

function sanitizeChatResponse(
  response: LocalAIChatResponse,
  context: LocalAIChatContext,
): LocalAIChatResponse {
  const knownPaths = new Set([
    ...context.projectSummary.files.map((file) => file.relativePath),
    ...context.retrievedSnippets.map((snippet) => snippet.relativePath),
  ]);
  const rawReferences: unknown[] = Array.isArray(response.references)
    ? (response.references as unknown[])
    : [];
  const rawMemoryNotes: unknown[] = Array.isArray(response.memoryNotes)
    ? (response.memoryNotes as unknown[])
    : [];
  const references = dedupeChatReferences(
    rawReferences.flatMap((reference) => {
      const sanitized = sanitizeChatReference(reference, knownPaths);
      return sanitized ? [sanitized] : [];
    }),
  );
  const memoryNotes = rawMemoryNotes
    .flatMap((note) => {
      const candidate =
        typeof note === 'object' && note !== null
          ? (note as Partial<LocalAIWorkspaceMemoryNote>)
          : null;
      const text =
        typeof note === 'string'
          ? note.trim()
          : typeof candidate?.text === 'string'
            ? candidate.text.trim()
            : '';
      if (!text) return [];

      return [
        {
          text,
          evidences: dedupeChatReferences(
            (Array.isArray(candidate?.evidences) ? candidate.evidences : []).flatMap(
              (evidence) => {
              const sanitized = sanitizeChatReference(evidence, knownPaths);
              return sanitized ? [sanitized] : [];
              },
            ),
          ).slice(-6),
        },
      ];
    })
    .slice(-6);

  return {
    answer: response.answer.trim(),
    references,
    editInstruction: response.editInstruction.trim(),
    memoryNotes,
  };
}

function createPlainChatResponse(content: string): LocalAIChatResponse {
  return {
    answer: content.trim(),
    references: [],
    editInstruction: '',
    memoryNotes: [],
  };
}

export function buildLocalAIChatContextBlock(context: LocalAIChatContext): string {
  return [
    buildContextBlock(context),
    '',
    'Ficheiros abertos:',
    formatOpenFiles(context.openFiles),
    '',
    'Mapa leve do projeto:',
    formatProjectSummary(context.projectSummary),
    '',
    'Trechos recuperados para a pergunta atual:',
    formatRetrievedSnippets(context.retrievedSnippets),
    '',
    'Memória local durável do workspace:',
    formatWorkspaceMemoryNotes(context.workspaceMemoryNotes),
  ].join('\n');
}

function normalizeRetrievalText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase();
}

export function extractLocalAIRetrievalTerms(query: string): string[] {
  const normalized = normalizeRetrievalText(query);
  const terms = normalized.match(/[a-z0-9_]+/g) ?? [];
  const filteredTerms = terms.filter(
    (term) => term.length >= 2 && !retrievalStopWords.has(term),
  );

  return Array.from(
    new Set(
      filteredTerms.flatMap((term) => [term, ...(retrievalSynonyms.get(term) ?? [])]),
    ),
  );
}

function countTermMatches(value: string, terms: string[]): number {
  return terms.reduce((score, term) => {
    if (!value.includes(term)) return score;
    return score + 1;
  }, 0);
}

function createRetrievedSnippet(
  file: LocalAIProjectFileSummary,
  lines: string[],
  lineIndex: number,
  score: number,
  surroundingLines: number,
): LocalAIRetrievedSnippet {
  const startIndex = Math.max(0, lineIndex - surroundingLines);
  const endIndex = Math.min(lines.length - 1, lineIndex + surroundingLines);

  return {
    path: file.path,
    relativePath: file.relativePath,
    language: file.language,
    lineStart: startIndex + 1,
    lineEnd: endIndex + 1,
    excerpt: lines.slice(startIndex, endIndex + 1).join('\n'),
    score,
  };
}

function overlapsSnippet(
  left: LocalAIRetrievedSnippet,
  right: LocalAIRetrievedSnippet,
): boolean {
  return (
    left.path === right.path &&
    left.lineStart <= right.lineEnd &&
    right.lineStart <= left.lineEnd
  );
}

export async function listOllamaModels(baseUrl: string): Promise<OllamaModelInfo[]> {
  assertBaseUrl(baseUrl);

  const payload = await requestOllamaJson<OllamaTagsResponse>(baseUrl, 'tags');
  return payload.models ?? [];
}

export async function listOpenAICompatibleModels(
  baseUrl: string,
  apiKey = '',
): Promise<LocalAIModelInfo[]> {
  assertBaseUrl(baseUrl, 'openai-compatible');

  const payload = await requestOpenAICompatibleJson<OpenAICompatibleModelListResponse>(
    { baseUrl, apiKey },
    'models',
  );

  return (payload.data ?? []).flatMap((model) =>
    model.id ? [{ name: model.id, model: model.id }] : [],
  );
}

export async function listLocalAIModels(
  config: Pick<LocalAIConfig, 'provider' | 'baseUrl' | 'apiKey'>,
): Promise<LocalAIModelInfo[]> {
  return getLocalAIProvider(config) === 'ollama'
    ? listOllamaModels(config.baseUrl)
    : listOpenAICompatibleModels(config.baseUrl, config.apiKey);
}

export async function requestLocalAIExplanation(
  config: LocalAIConfig,
  context: LocalAIContext,
): Promise<LocalAIExplanation> {
  assertConfigured(config);

  const content = await requestLocalAIChatContent(
    config,
    [
        {
          role: 'system',
          content:
            'És um assistente de código conciso. Explica apenas o código recebido e devolve somente JSON válido segundo o schema pedido.',
        },
        {
          role: 'user',
          content: `${buildContextBlock(context)}\n\nExplica a seleção se existir; caso contrário, resume o ficheiro.`,
        },
    ],
    explanationSchema,
  );
  return parseStructuredContent<LocalAIExplanation>(content);
}

export async function requestLocalAIEditProposal(
  config: LocalAIConfig,
  context: LocalAIContext,
): Promise<LocalAIEditProposal> {
  assertConfigured(config);

  if (!context.instruction?.trim()) {
    throw new Error('Escreva uma instrução para a alteração.');
  }

  const hasSelection = Boolean(context.selectedText.trim());
  const content = await requestLocalAIChatContent(
    config,
    [
        {
          role: 'system',
          content:
            'És um assistente de programação. Mantém a linguagem e devolve somente JSON válido segundo o schema pedido. Se existir seleção, replacement deve substituir apenas a seleção. Se não existir seleção, replacement deve ser código pronto para inserir no cursor atual e satisfazer o pedido sem reescrever desnecessariamente o ficheiro inteiro.',
        },
        {
          role: 'user',
          content: `${buildContextBlock(context)}\n\nModo: ${
            hasSelection ? 'substituir seleção' : 'inserir no cursor'
          }\nPedido: ${context.instruction}`,
        },
    ],
    editProposalSchema,
  );
  return parseStructuredContent<LocalAIEditProposal>(content);
}

export async function summarizeWorkspaceForLocalAI(
  rootUri: string,
  dependencies: LocalAIWorkspaceSummaryDependencies,
  options: LocalAIWorkspaceSummaryOptions = {},
): Promise<LocalAIProjectSummary> {
  const maxFiles = options.maxFiles ?? defaultWorkspaceSummaryMaxFiles;
  const files: LocalAIProjectFileSummary[] = [];
  let omittedFileCount = 0;

  const visitDirectory = async (directoryUri: string): Promise<void> => {
    const children = await dependencies.listFiles(directoryUri);

    for (const child of children) {
      if (child.isDirectory) {
        await visitDirectory(child.uri);
        continue;
      }

      if (!isSearchableWorkspaceFile(child)) {
        continue;
      }

      if (files.length >= maxFiles) {
        omittedFileCount += 1;
        continue;
      }

      files.push({
        path: child.uri,
        relativePath: getWorkspaceRelativePath(rootUri, child.uri),
        language: detectLanguageFromExtension(child.name),
        size: child.size,
      });
    }
  };

  await visitDirectory(rootUri);

  return {
    files,
    omittedFileCount,
  };
}

export async function retrieveRelevantWorkspaceSnippetsForLocalAI(
  rootUri: string,
  query: string,
  dependencies: LocalAIRetrievalDependencies,
  options: LocalAIRetrievalOptions = {},
): Promise<LocalAIRetrievedSnippet[]> {
  const terms = extractLocalAIRetrievalTerms(query);
  if (terms.length === 0) return [];

  const maxFiles = options.maxFiles ?? defaultRetrievalMaxFiles;
  const maxSnippets = options.maxSnippets ?? defaultRetrievalMaxSnippets;
  const surroundingLines =
    options.surroundingLines ?? defaultRetrievalSurroundingLines;
  const excludedPaths = new Set(options.excludePaths ?? []);
  const candidates: LocalAIRetrievedSnippet[] = [];
  let scannedFiles = 0;

  const visitDirectory = async (directoryUri: string): Promise<void> => {
    if (scannedFiles >= maxFiles) return;

    const children = await dependencies.listFiles(directoryUri);

    for (const child of children) {
      if (scannedFiles >= maxFiles) return;

      if (child.isDirectory) {
        await visitDirectory(child.uri);
        continue;
      }

      if (!isSearchableWorkspaceFile(child) || excludedPaths.has(child.uri)) {
        continue;
      }

      scannedFiles += 1;

      let content = '';
      try {
        content = await dependencies.readFile(child.uri);
      } catch {
        continue;
      }

      const normalizedContent = normalizeRetrievalText(content);
      const file = {
        path: child.uri,
        relativePath: getWorkspaceRelativePath(rootUri, child.uri),
        language: detectLanguageFromExtension(child.name),
        size: child.size,
      };
      const normalizedPath = normalizeRetrievalText(file.relativePath);
      const fileNameScore = countTermMatches(normalizedPath, terms) * 3;
      const lines = content.split('\n');
      const normalizedLines = normalizedContent.split('\n');
      let foundLineMatch = false;

      normalizedLines.forEach((line, lineIndex) => {
        const lineScore = countTermMatches(line, terms);
        if (lineScore === 0) return;

        foundLineMatch = true;

        const exactPhraseBonus = normalizedContent.includes(
          normalizeRetrievalText(query),
        )
          ? 3
          : 0;
        const score = lineScore * 4 + fileNameScore + exactPhraseBonus;
        if (score === 0) return;

        const nextSnippet = createRetrievedSnippet(
          file,
          lines,
          lineIndex,
          score,
          surroundingLines,
        );
        const overlappingSnippet = candidates.find((candidate) =>
          overlapsSnippet(candidate, nextSnippet),
        );

        if (overlappingSnippet) {
          if (nextSnippet.score > overlappingSnippet.score) {
            Object.assign(overlappingSnippet, nextSnippet);
          }
          return;
        }

        candidates.push(nextSnippet);
      });

      if (!foundLineMatch && fileNameScore > 0 && lines.length > 0) {
        const firstMeaningfulLineIndex = Math.max(
          0,
          lines.findIndex((line) => Boolean(line.trim())),
        );
        candidates.push(
          createRetrievedSnippet(
            file,
            lines,
            firstMeaningfulLineIndex,
            fileNameScore,
            surroundingLines,
          ),
        );
      }
    }
  };

  await visitDirectory(rootUri);

  return candidates
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.relativePath.localeCompare(right.relativePath) ||
        left.lineStart - right.lineStart,
    )
    .slice(0, maxSnippets);
}

export async function requestLocalAIChat(
  config: LocalAIConfig,
  context: LocalAIChatContext,
  messages: LocalAIChatMessage[],
): Promise<LocalAIChatResponse> {
  assertConfigured(config);

  const content = await requestLocalAIChatContent(
    config,
    [
        {
          role: 'system',
          content:
            'És um assistente de programação local-first. Responde em português claro, usa o contexto recebido, dá prioridade aos trechos recuperados quando forem relevantes, admite incerteza quando faltar informação e nunca afirmes que alteraste ficheiros sem uma confirmação explícita do utilizador. Devolve somente JSON válido segundo o schema pedido. references só podem usar relativePath presentes no mapa do projeto ou nos trechos recuperados; usa linha/coluna apenas quando estiveres confiante. editInstruction deve ficar vazio quando não houver uma mudança concreta e segura; quando houver pedido de código, pode descrever uma mudança para a seleção atual ou para inserção no cursor se não houver seleção. memoryNotes deve conter apenas factos duráveis e úteis sobre a arquitetura, decisões ou convenções do workspace; cada nota precisa de texto curto e evidências reais em ficheiros quando existirem. Deixa vazio para suposições, detalhes passageiros ou segredos.',
        },
        {
          role: 'user',
          content: `Contexto atual:\n${buildLocalAIChatContextBlock(context)}`,
        },
        ...messages.map(({ role, content }) => ({ role, content })),
    ],
    chatResponseSchema,
  );
  let parsed: LocalAIChatResponse;
  try {
    parsed = parseStructuredContent<LocalAIChatResponse>(content);
  } catch (error) {
    if (getLocalAIProvider(config) === 'openai-compatible' && content?.trim()) {
      return createPlainChatResponse(content);
    }

    throw error;
  }

  if (!parsed.answer.trim()) {
    throw new Error('A IA local devolveu uma resposta inválida.');
  }

  return sanitizeChatResponse(parsed, context);
}
