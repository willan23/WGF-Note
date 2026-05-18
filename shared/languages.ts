export const CODE_LANGUAGES = [
  "python",
  "javascript",
  "typescript",
  "html",
  "css",
  "json",
  "markdown",
  "sql",
  "java",
  "c",
  "cpp",
  "csharp",
  "plaintext",
] as const;

export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export const CODE_LANGUAGE_EXTENSIONS: Record<CodeLanguage, readonly string[]> = {
  python: ["py"],
  javascript: ["js", "jsx", "mjs", "cjs"],
  typescript: ["ts", "tsx"],
  html: ["html", "htm"],
  css: ["css"],
  json: ["json"],
  markdown: ["md", "markdown"],
  sql: ["sql"],
  java: ["java"],
  c: ["c", "h"],
  cpp: ["cpp", "cc", "cxx", "hpp", "hh", "hxx"],
  csharp: ["cs"],
  plaintext: ["txt"],
};

export const SUPPORTED_FILE_EXTENSIONS = new Set(
  Object.values(CODE_LANGUAGE_EXTENSIONS).flat(),
);
