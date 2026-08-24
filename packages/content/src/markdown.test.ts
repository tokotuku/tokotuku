import { describe, expect, it } from "vitest";
import { renderMarkdownSafe } from "./markdown";

describe("renderMarkdownSafe", () => {
  it("renders the supported editorial Markdown constructs", () => {
    const html = renderMarkdownSafe(
      [
        "# Heading",
        "",
        "A paragraph with **strong**, *emphasis*, `inline code`, and [a link](https://example.com/docs).",
        "",
        "- one",
        "- two",
        "",
        "> A quote",
        "",
        "```ts",
        "const value = 1;",
        "```",
      ].join("\n"),
    );

    expect(html).toContain("<h1>Heading</h1>");
    expect(html).toContain("<p>A paragraph");
    expect(html).toContain("<strong>strong</strong>");
    expect(html).toContain("<em>emphasis</em>");
    expect(html).toContain('<a href="https://example.com/docs"');
    expect(html).toContain("<ul><li>one</li><li>two</li></ul>");
    expect(html).toContain("<blockquote><p>A quote</p></blockquote>");
    expect(html).toContain('<pre><code class="language-ts">const value = 1;</code></pre>');
  });

  it("does not emit raw HTML, unsafe links, or Markdown images", () => {
    const html = renderMarkdownSafe(
      '<script>alert("x")</script><iframe src="https://evil.test"></iframe><span onclick="alert(1)">safe</span>\n\n[bad](javascript:alert(1)) ![cover](https://evil.test/cover.png)',
    );

    expect(html).not.toMatch(/<\/?(?:script|iframe|span|img)\b/i);
    expect(html).not.toMatch(/javascript\s*:/i);
    expect(html).not.toContain("evil.test");
    expect(html).toContain("safe");
  });

  it("escapes user text and accepts only http(s) autolinks", () => {
    const html = renderMarkdownSafe(
      "<https://example.com> & <mailto:test@example.com> <b>text</b>",
    );

    expect(html).toContain('<a href="https://example.com/"');
    expect(html).not.toContain("mailto:");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&amp;");
  });
});
