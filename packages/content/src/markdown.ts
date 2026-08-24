/**
 * Render the small, deliberately conservative Markdown dialect used by
 * editorial posts. This renderer is shared by public pages and the admin
 * preview API so a preview cannot drift into a more permissive HTML sink.
 *
 * Raw HTML is never emitted. Links must be absolute http(s) URLs, and image
 * syntax is discarded (covers are managed separately through R2).
 */

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const HTML_ESCAPE_PATTERN = /[&<>"']/g;
const RAW_HTML_TAG_PATTERN = /<\/?[A-Za-z][^>]*>/g;
const TOKEN_PATTERN = /@@KARSA_TOKEN_(\d+)@@/g;

function escapeHtml(value: string): string {
  return value.replace(HTML_ESCAPE_PATTERN, (character) => HTML_ESCAPE[character] ?? character);
}

function safeHttpUrl(value: string): string | null {
  const normalized = value.trim();
  if (
    !normalized ||
    normalized.split("").some((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127;
    })
  ) {
    return null;
  }

  let decoded = normalized;
  try {
    decoded = decodeURIComponent(normalized);
  } catch {
    // Keep the original value. URL parsing below will still reject malformed
    // or non-http(s) destinations.
  }

  if (/^javascript\s*:/i.test(decoded) || /^data\s*:/i.test(decoded)) return null;
  try {
    const url = new URL(decoded);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function protect(tokens: string[], html: string): string {
  const token = `@@KARSA_TOKEN_${tokens.length}@@`;
  tokens.push(html);
  return token;
}

function renderInline(source: string): string {
  const tokens: string[] = [];
  let text = source.replace(/!\[([^\]]*)\]\([^)]*\)/g, (_match, _alt: string) => "");

  // Code is protected first, so Markdown-looking text inside a code span is
  // always displayed literally.
  text = text.replace(/`([^`\n]+)`/g, (_match, code: string) =>
    protect(tokens, `<code>${escapeHtml(code)}</code>`),
  );

  // A link with an unsafe destination is intentionally rendered as its label
  // only. It is not allowed to fall through as an href-bearing HTML fragment.
  text = text.replace(
    /\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+(['"])[^)]*\3)?\s*\)/g,
    (_match, label: string, destination: string) => {
      const url = safeHttpUrl(destination);
      if (!url) return escapeHtml(label);
      return protect(
        tokens,
        `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${renderInline(label)}</a>`,
      );
    },
  );

  // Autolinks are useful in editorial copy, but use the same strict URL
  // policy as explicit Markdown links.
  text = text.replace(/<((?:https?):\/\/[^>\s]+)>/gi, (_match, destination: string) => {
    const url = safeHttpUrl(destination);
    if (!url) return "";
    return protect(
      tokens,
      `<a href="${escapeHtml(url)}" rel="noopener noreferrer">${escapeHtml(destination)}</a>`,
    );
  });

  // Raw HTML (including script/style/iframe tags and event-handler-bearing
  // elements) is removed before escaping text. This leaves the surrounding
  // prose readable while ensuring no user HTML reaches the response.
  text = text.replace(RAW_HTML_TAG_PATTERN, "");
  text = escapeHtml(text);

  // Strong before emphasis prevents the single-marker pass from consuming a
  // pair of markers intended for <strong>.
  text = text.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, "<strong>$2</strong>");
  text = text.replace(/(^|[^\w])([*_])(?=\S)([^\n]*?\S)\2(?=$|[^\w])/g, "$1<em>$3</em>");

  return text.replace(TOKEN_PATTERN, (_match, index: string) => tokens[Number(index)] ?? "");
}

function isBlockStart(line: string): boolean {
  return (
    /^ {0,3}(#{1,6})\s+/.test(line) ||
    /^ {0,3}> ?/.test(line) ||
    /^ {0,3}(?:[-+*])\s+/.test(line) ||
    /^ {0,3}\d+[.)]\s+/.test(line) ||
    /^ {0,3}(```|~~~)/.test(line)
  );
}

// The explicit branches below are the renderer's security allow-list.
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: parser branches are the security allow-list
function renderBlocks(lines: string[]): string {
  const output: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fence = line.match(/^ {0,3}(```|~~~)\s*([A-Za-z0-9_+-]*)\s*$/);
    if (fence) {
      const marker = fence[1] as string;
      const language = fence[2] as string;
      const codeLines: string[] = [];
      index += 1;
      while (
        index < lines.length &&
        !new RegExp(`^ {0,3}${marker}\\s*$`).test(lines[index] ?? "")
      ) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      if (index < lines.length) index += 1;
      const classAttribute = language ? ` class="language-${escapeHtml(language)}"` : "";
      output.push(`<pre><code${classAttribute}>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const level = heading[1]?.length ?? 1;
      output.push(`<h${level}>${renderInline(heading[2] ?? "")}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^ {0,3}> ?/.test(line)) {
      const quoteLines: string[] = [];
      while (index < lines.length) {
        const quoteLine = lines[index] ?? "";
        const match = quoteLine.match(/^ {0,3}> ?(.*)$/);
        if (!match) break;
        quoteLines.push(match[1] ?? "");
        index += 1;
      }
      output.push(`<blockquote>${renderBlocks(quoteLines)}</blockquote>`);
      continue;
    }

    const unordered = line.match(/^ {0,3}(?:[-+*])\s+(.+)$/);
    if (unordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = (lines[index] ?? "").match(/^ {0,3}(?:[-+*])\s+(.+)$/);
        if (!item) break;
        items.push(`<li>${renderInline(item[1] ?? "")}</li>`);
        index += 1;
      }
      output.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    const ordered = line.match(/^ {0,3}\d+[.)]\s+(.+)$/);
    if (ordered) {
      const items: string[] = [];
      while (index < lines.length) {
        const item = (lines[index] ?? "").match(/^ {0,3}\d+[.)]\s+(.+)$/);
        if (!item) break;
        items.push(`<li>${renderInline(item[1] ?? "")}</li>`);
        index += 1;
      }
      output.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // Four-space indented blocks are accepted as code, matching the common
    // Markdown form while keeping the parser small and deterministic.
    if (/^ {4}/.test(line)) {
      const codeLines: string[] = [];
      while (
        index < lines.length &&
        (/^ {4}/.test(lines[index] ?? "") || !(lines[index] ?? "").trim())
      ) {
        const codeLine = lines[index] ?? "";
        codeLines.push(codeLine.startsWith("    ") ? codeLine.slice(4) : "");
        index += 1;
      }
      while (codeLines.at(-1) === "") codeLines.pop();
      output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    const paragraph: string[] = [line.trim()];
    index += 1;
    while (index < lines.length) {
      const next = lines[index] ?? "";
      if (!next.trim() || isBlockStart(next)) break;
      paragraph.push(next.trim());
      index += 1;
    }
    output.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return output.join("\n");
}

/** Render post Markdown as safe, server-generated HTML. */
export function renderMarkdownSafe(markdown: string): string {
  if (!markdown) return "";
  return renderBlocks(markdown.replace(/\r\n?/g, "\n").split("\n"));
}
