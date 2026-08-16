/** Returns the index just past a `//` line comment starting at `i`, or null if there isn't one there. */
function skipLineComment(source: string, i: number): number | null {
  if (source[i] !== "/" || source[i + 1] !== "/") return null;
  let end = i;
  while (end < source.length && source[end] !== "\n") end += 1;
  return end;
}

/** Returns the index just past a `/* *\/` block comment starting at `i`, or null if there isn't one there. */
function skipBlockComment(source: string, i: number): number | null {
  if (source[i] !== "/" || source[i + 1] !== "*") return null;
  let end = i + 2;
  while (end < source.length && !(source[end] === "*" && source[end + 1] === "/")) end += 1;
  return end + 2;
}

/**
 * Returns the index just past a `'`, `"`, or template literal starting at
 * `i`, or null if `i` isn't the start of one. Tracks `${...}` nesting inside
 * a template (recursing through any string/template found there) so a `)`
 * or `]` inside an interpolation never unbalances a caller's bracket count.
 */
function skipStringOrTemplate(source: string, i: number): number | null {
  const quote = source[i];
  if (quote !== '"' && quote !== "'" && quote !== "`") return null;
  return quote === "`" ? skipTemplateLiteral(source, i) : skipQuotedString(source, i, quote);
}

function skipQuotedString(source: string, i: number, quote: string): number {
  let j = i + 1;
  while (j < source.length) {
    const ch = source[j];
    if (ch === "\\") {
      j += 2;
      continue;
    }
    if (ch === quote) return j + 1;
    j += 1;
  }
  return j;
}

function skipTemplateLiteral(source: string, i: number): number {
  let j = i + 1;
  while (j < source.length) {
    const ch = source[j];
    if (ch === "\\") {
      j += 2;
      continue;
    }
    if (ch === "`") return j + 1;
    if (ch === "$" && source[j + 1] === "{") {
      j = skipBalancedBraces(source, j + 1);
      continue;
    }
    j += 1;
  }
  return j;
}

/** Given the index of a `${`'s `{`, returns the index just past its matching `}`, skipping any nested comments and string/template literals. */
function skipBalancedBraces(source: string, openIndex: number): number {
  let depth = 0;
  let j = openIndex;
  while (j < source.length) {
    const skip =
      skipLineComment(source, j) ?? skipBlockComment(source, j) ?? skipStringOrTemplate(source, j);
    if (skip !== null) {
      j = skip;
      continue;
    }
    const ch = source[j];
    if (ch === "{") {
      depth += 1;
      j += 1;
      continue;
    }
    if (ch === "}") {
      depth -= 1;
      j += 1;
      if (depth === 0) return j;
      continue;
    }
    j += 1;
  }
  return j;
}

const CLOSERS: Record<string, string> = { "(": ")", "[": "]", "{": "}" };

/**
 * Given the index of an opening `(`, `[`, or `{`, returns the index just
 * past its matching closer -- skipping comments and string/template
 * literals so a bracket character inside either never counts. Throws if the
 * source ends before the bracket closes.
 */
function findMatchingClose(source: string, openIndex: number): number {
  const opener = source[openIndex] as string;
  const closer = CLOSERS[opener];
  if (!closer) {
    throw new Error(`findMatchingClose: "${opener}" at ${openIndex} is not an opening bracket.`);
  }
  let depth = 0;
  let j = openIndex;
  while (j < source.length) {
    const skip =
      skipLineComment(source, j) ?? skipBlockComment(source, j) ?? skipStringOrTemplate(source, j);
    if (skip !== null) {
      j = skip;
      continue;
    }
    const ch = source[j];
    if (ch === opener) {
      depth += 1;
      j += 1;
      continue;
    }
    if (ch === closer) {
      depth -= 1;
      j += 1;
      if (depth === 0) return j;
      continue;
    }
    j += 1;
  }
  throw new Error(`Unterminated "${opener}" starting at index ${openIndex} in astro.config.mjs.`);
}

function isIdentChar(ch: string | undefined): boolean {
  return ch !== undefined && /[A-Za-z0-9_$]/.test(ch);
}

/** True if `word` occurs at `i` as a standalone identifier/keyword, not as a prefix or suffix of a longer one. */
function matchWord(source: string, i: number, word: string): boolean {
  if (source.slice(i, i + word.length) !== word) return false;
  return !isIdentChar(source[i - 1]) && !isIdentChar(source[i + word.length]);
}

/** Returns the index past any run of whitespace and comments starting at `i`. */
function skipTrivia(source: string, i: number): number {
  let j = i;
  while (j < source.length) {
    if (/\s/.test(source[j] as string)) {
      j += 1;
      continue;
    }
    const skip = skipLineComment(source, j) ?? skipBlockComment(source, j);
    if (skip !== null) {
      j = skip;
      continue;
    }
    break;
  }
  return j;
}

/** Splits `source` on its top-level commas (not inside brackets, strings, or comments). */
function splitTopLevelByComma(source: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let last = 0;
  let i = 0;
  while (i < source.length) {
    const skip =
      skipLineComment(source, i) ?? skipBlockComment(source, i) ?? skipStringOrTemplate(source, i);
    if (skip !== null) {
      i = skip;
      continue;
    }
    const ch = source[i];
    if (ch === "(" || ch === "[" || ch === "{") {
      depth += 1;
      i += 1;
      continue;
    }
    if (ch === ")" || ch === "]" || ch === "}") {
      depth -= 1;
      i += 1;
      continue;
    }
    if (ch === "," && depth === 0) {
      parts.push(source.slice(last, i));
      i += 1;
      last = i;
      continue;
    }
    i += 1;
  }
  parts.push(source.slice(last));
  return parts;
}

export interface ImportDeclaration {
  start: number;
  /** Just past the terminating `;` and one trailing newline, if present -- so removing `[start, end)` never leaves a blank line. */
  end: number;
  specifier: string;
  namedLocals: { imported: string; local: string }[];
}

/** Just past a statement's terminating `;` and one trailing newline, if present. */
function consumeStatementEnd(source: string, j: number): number {
  let k = j;
  if (source[k] === ";") k += 1;
  if (source[k] === "\n") k += 1;
  return k;
}

function parseNamedImportClause(
  source: string,
  braceOpen: number,
): { namedLocals: ImportDeclaration["namedLocals"]; end: number } {
  const braceEnd = findMatchingClose(source, braceOpen);
  const body = source.slice(braceOpen + 1, braceEnd - 1);
  const namedLocals: ImportDeclaration["namedLocals"] = [];
  for (const rawEntry of splitTopLevelByComma(body)) {
    const entry = rawEntry.trim();
    if (!entry) continue;
    const asMatch = entry.match(/^([A-Za-z_$][\w$]*)\s+as\s+([A-Za-z_$][\w$]*)$/);
    namedLocals.push(
      asMatch
        ? { imported: asMatch[1] as string, local: asMatch[2] as string }
        : { imported: entry, local: entry },
    );
  }
  return { namedLocals, end: braceEnd };
}

function parseImportAt(source: string, start: number): ImportDeclaration | null {
  let j = skipTrivia(source, start + "import".length);

  if (source[j] === '"' || source[j] === "'") {
    const specEnd = skipStringOrTemplate(source, j);
    if (specEnd === null) return null;
    const specifier = source.slice(j + 1, specEnd - 1);
    const end = consumeStatementEnd(source, skipTrivia(source, specEnd));
    return { start, end, specifier, namedLocals: [] };
  }

  if (isIdentChar(source[j])) {
    let k = j;
    while (isIdentChar(source[k])) k += 1;
    j = skipTrivia(source, k);
    if (source[j] === ",") j = skipTrivia(source, j + 1);
  }

  let namedLocals: ImportDeclaration["namedLocals"] = [];
  if (source[j] === "{") {
    const clause = parseNamedImportClause(source, j);
    namedLocals = clause.namedLocals;
    j = skipTrivia(source, clause.end);
  }

  if (!matchWord(source, j, "from")) return null;
  j = skipTrivia(source, j + "from".length);
  if (source[j] !== '"' && source[j] !== "'") return null;
  const specEnd = skipStringOrTemplate(source, j);
  if (specEnd === null) return null;
  const specifier = source.slice(j + 1, specEnd - 1);
  const end = consumeStatementEnd(source, skipTrivia(source, specEnd));
  return { start, end, specifier, namedLocals };
}

/** Finds every top-level `import ... from "specifier";` (or bare `import "specifier";`) declaration in `source`, in file order. */
export function scanImports(source: string): ImportDeclaration[] {
  const declarations: ImportDeclaration[] = [];
  let i = 0;
  while (i < source.length) {
    const skip =
      skipLineComment(source, i) ?? skipBlockComment(source, i) ?? skipStringOrTemplate(source, i);
    if (skip !== null) {
      i = skip;
      continue;
    }
    if (matchWord(source, i, "import")) {
      const decl = parseImportAt(source, i);
      if (decl) {
        declarations.push(decl);
        i = decl.end;
        continue;
      }
    }
    i += 1;
  }
  return declarations;
}

/** Finds the import declaration for `specifier`, if any. */
export function findImport(source: string, specifier: string): ImportDeclaration | null {
  return scanImports(source).find((decl) => decl.specifier === specifier) ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Inserts `import { importedName } from "specifier";` in sorted position
 * among the file's existing top-level imports (biome sorts by specifier, so
 * matching that order means `bun run lint` never has to move it). No-op if
 * an import already binds `importedName` from `specifier`. Throws rather
 * than guess if `specifier` is already imported under a different name, or
 * if `importedName` is already bound to something else.
 */
export function addImport(
  source: string,
  specifier: string,
  importedName: string,
): { source: string; local: string } {
  const imports = scanImports(source);
  const existing = imports.find((decl) => decl.specifier === specifier);
  if (existing) {
    const binding = existing.namedLocals.find((n) => n.imported === importedName);
    if (binding) return { source, local: binding.local };
    throw new Error(
      `astro.config.mjs already imports from "${specifier}" without "${importedName}". Add the import by hand.`,
    );
  }

  if (imports.some((decl) => decl.namedLocals.some((n) => n.local === importedName))) {
    throw new Error(
      `"${importedName}" is already bound in astro.config.mjs. Rename that binding, or add the import by hand.`,
    );
  }

  const insertAt =
    imports.find((decl) => decl.specifier > specifier)?.start ?? imports.at(-1)?.end ?? 0;
  const line = `import { ${importedName} } from "${specifier}";\n`;
  return { source: source.slice(0, insertAt) + line + source.slice(insertAt), local: importedName };
}

/**
 * Removes the whole `import ... from "specifier";` declaration, but only if
 * none of its bound local names appear anywhere else in the file --
 * deliberately conservative: a false "still used" match (e.g. inside an
 * unrelated comment) just leaves the import in place instead of risking a
 * broken build.
 */
export function removeImport(source: string, specifier: string): string {
  const decl = findImport(source, specifier);
  if (!decl) return source;

  const rest = source.slice(0, decl.start) + source.slice(decl.end);
  const stillUsed = decl.namedLocals.some(({ local }) =>
    new RegExp(`\\b${escapeRegExp(local)}\\b`).test(rest),
  );
  if (stillUsed) return source;
  return rest;
}

function isOpenBracket(ch: string | undefined): boolean {
  return ch === "(" || ch === "[" || ch === "{";
}

function isCloseBracket(ch: string | undefined): boolean {
  return ch === ")" || ch === "]" || ch === "}";
}

/** If `key` occurs at `i` as a top-level property (followed, after whitespace, by `:`), returns the index just past that `:`. Otherwise null. */
function matchTopLevelKey(source: string, i: number, key: string): number | null {
  if (!matchWord(source, i, key)) return null;
  const after = skipTrivia(source, i + key.length);
  return source[after] === ":" ? after + 1 : null;
}

/** Finds the index just past the `:` of a top-level `key:` property (not nested inside another object/array) spanning `(objOpen, objClose)`. Returns null if not found. */
function findTopLevelKey(
  source: string,
  objOpen: number,
  objClose: number,
  key: string,
): number | null {
  let i = objOpen + 1;
  let depth = 0;
  while (i < objClose) {
    const skip =
      skipLineComment(source, i) ?? skipBlockComment(source, i) ?? skipStringOrTemplate(source, i);
    if (skip !== null) {
      i = skip;
      continue;
    }
    const ch = source[i];
    if (isOpenBracket(ch)) {
      depth += 1;
      i += 1;
      continue;
    }
    if (isCloseBracket(ch)) {
      depth -= 1;
      i += 1;
      continue;
    }
    const keyEnd = depth === 0 ? matchTopLevelKey(source, i, key) : null;
    if (keyEnd !== null) return keyEnd;
    i += 1;
  }
  return null;
}

function findTakontukuLocal(source: string): string {
  const coreImport = findImport(source, "@takontuku/core");
  const local = coreImport?.namedLocals.find((n) => n.imported === "takontuku")?.local;
  if (!local) {
    throw new Error(
      'Could not find an import of the takontuku() integration from "@takontuku/core" in astro.config.mjs. Add or remove the module by hand.',
    );
  }
  return local;
}

function findCallSites(source: string, local: string): number[] {
  const callSites: number[] = [];
  let i = 0;
  while (i < source.length) {
    const skip =
      skipLineComment(source, i) ?? skipBlockComment(source, i) ?? skipStringOrTemplate(source, i);
    if (skip !== null) {
      i = skip;
      continue;
    }
    if (matchWord(source, i, local)) {
      const after = skipTrivia(source, i + local.length);
      if (source[after] === "(") callSites.push(i);
    }
    i += 1;
  }
  return callSites;
}

function locateCallObject(
  source: string,
  callStart: number,
  local: string,
): { objOpen: number; objClose: number } {
  const parenOpen = skipTrivia(source, callStart + local.length);
  const parenClose = findMatchingClose(source, parenOpen);
  const objOpen = skipTrivia(source, parenOpen + 1);
  if (source[objOpen] !== "{") {
    throw new Error(
      `${local}()'s argument in astro.config.mjs is not an object literal. Add or remove the module by hand.`,
    );
  }
  const objClose = findMatchingClose(source, objOpen);
  if (objClose > parenClose) {
    throw new Error(
      `Could not parse ${local}()'s argument in astro.config.mjs. Add or remove the module by hand.`,
    );
  }
  return { objOpen, objClose };
}

/**
 * Finds the single `takontuku({ ... modules: [...] ... })` call's modules
 * array, returning the index of its `[` and the index just past its
 * matching `]`. Refuses (throws, naming manual editing as the fallback)
 * rather than guess when the shape isn't one this scanner understands.
 */
export function locateModulesArray(source: string): { open: number; close: number } {
  const local = findTakontukuLocal(source);
  const callSites = findCallSites(source, local);
  if (callSites.length !== 1) {
    throw new Error(
      `Found ${callSites.length === 0 ? "no" : "more than one"} ${local}() call in astro.config.mjs. Add or remove the module by hand.`,
    );
  }

  const { objOpen, objClose } = locateCallObject(source, callSites[0] as number, local);

  const modulesValueStart = findTopLevelKey(source, objOpen, objClose, "modules");
  if (modulesValueStart === null) {
    throw new Error(
      'astro.config.mjs has no "modules: [...]" array inside takontuku(). Add the module by hand.',
    );
  }
  const arrayOpen = skipTrivia(source, modulesValueStart);
  if (source[arrayOpen] !== "[") {
    throw new Error(
      'astro.config.mjs\'s "modules" is not an array literal -- this CLI only edits a literal list. Add the module by hand.',
    );
  }
  const arrayClose = findMatchingClose(source, arrayOpen);
  return { open: arrayOpen, close: arrayClose };
}

export interface ModuleEntry {
  start: number;
  end: number;
  /** The called identifier, e.g. "catalog" for `catalog()` -- null for anything this scanner can't identify (a spread, a bare identifier, a conditional). */
  calleeName: string | null;
}

/** Splits a `modules: [...]` array's contents (`open` = index of `[`, `close` = index just past the matching `]`) into its top-level comma-separated elements. */
export function listModuleEntries(source: string, open: number, close: number): ModuleEntry[] {
  const inner = source.slice(open + 1, close - 1);
  const parts = splitTopLevelByComma(inner);
  const entries: ModuleEntry[] = [];
  let cursor = open + 1;
  for (const part of parts) {
    const leading = part.match(/^\s*/)?.[0].length ?? 0;
    const trailing = part.match(/\s*$/)?.[0].length ?? 0;
    const text = part.slice(leading, part.length - trailing);
    if (text.length > 0) {
      const start = cursor + leading;
      const end = start + text.length;
      const calleeMatch = text.match(/^([A-Za-z_$][\w$]*)\(/);
      entries.push({ start, end, calleeName: calleeMatch ? (calleeMatch[1] as string) : null });
    }
    cursor += part.length + 1;
  }
  return entries;
}

/** True if `modules: [...]` already contains a `local()` entry. */
export function hasModuleEntry(source: string, local: string): boolean {
  const { open, close } = locateModulesArray(source);
  return listModuleEntries(source, open, close).some((entry) => entry.calleeName === local);
}

/** Appends `local()` to the modules array, preserving whether it's single- or multi-line. No-op if `local()` is already an entry. */
export function addModuleEntry(source: string, local: string): string {
  const { open, close } = locateModulesArray(source);
  const entries = listModuleEntries(source, open, close);
  if (entries.some((entry) => entry.calleeName === local)) return source;

  const closeBracket = close - 1;
  if (entries.length === 0) {
    return `${source.slice(0, closeBracket)}${local}()${source.slice(closeBracket)}`;
  }

  const last = entries[entries.length - 1] as ModuleEntry;
  const isMultiline = source.slice(open + 1, closeBracket).includes("\n");

  if (!isMultiline) {
    return (
      source.slice(0, last.end) +
      `, ${local}()` +
      source.slice(last.end, closeBracket) +
      source.slice(closeBracket)
    );
  }

  const lineStart = source.lastIndexOf("\n", last.start) + 1;
  const indent = source.slice(lineStart, last.start);
  let working = source;
  let insertPoint = working.lastIndexOf("\n", closeBracket) + 1;
  if (working[last.end] !== ",") {
    working = `${working.slice(0, last.end)},${working.slice(last.end)}`;
    insertPoint += 1;
  }
  return `${working.slice(0, insertPoint)}${indent}${local}(),\n${working.slice(insertPoint)}`;
}

/**
 * Removes the `local()` entry from the modules array, along with exactly
 * one adjacent separator comma. Refuses if any entry in the array (not just
 * the target) isn't a plain `identifier()` call -- deliberately
 * conservative, since editing around an entry this scanner can't identify
 * (a spread, a conditional) risks misjudging the array's real structure.
 */
export function removeModuleEntry(source: string, local: string): string {
  const { open, close } = locateModulesArray(source);
  const entries = listModuleEntries(source, open, close);
  const target = entries.find((entry) => entry.calleeName === local);
  if (!target) return source;

  if (entries.some((entry) => entry.calleeName === null)) {
    throw new Error(
      "astro.config.mjs's \"modules\" array contains an entry this CLI can't identify (not a plain function call) -- remove the module by hand.",
    );
  }

  const closeBracket = close - 1;
  const index = entries.indexOf(target);
  const isLast = index === entries.length - 1;

  if (isLast) {
    const prevEnd = index > 0 ? (entries[index - 1] as ModuleEntry).end : open + 1;
    const before = source.slice(prevEnd, target.start);
    const commaIdx = before.lastIndexOf(",");
    const removeFrom = commaIdx >= 0 ? prevEnd + commaIdx : target.start;
    const afterTarget = source.slice(target.end, closeBracket);
    const trailingCommaMatch = afterTarget.match(/^\s*,/);
    const removeTo = trailingCommaMatch ? target.end + trailingCommaMatch[0].length : target.end;
    return source.slice(0, removeFrom) + source.slice(removeTo);
  }

  const afterTarget = source.slice(target.end, closeBracket);
  // Only spaces/tabs after the comma, not newlines -- a single-line array's
  // ", " separator collapses cleanly, while a multi-line array's ",\n  "
  // leaves the next entry's own newline and indent untouched.
  const commaMatch = afterTarget.match(/^,[ \t]*/);
  const removeTo = commaMatch ? target.end + commaMatch[0].length : target.end;
  return source.slice(0, target.start) + source.slice(removeTo);
}
