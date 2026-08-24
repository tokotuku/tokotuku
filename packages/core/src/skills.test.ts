import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * The skills shipped in packages/core/skills/ are consumed by agent tooling
 * that silently ignores a skill it cannot parse -- a typo in the frontmatter
 * doesn't fail anything, it just means the skill never loads and nobody
 * notices. These assertions encode the Agent Skills specification
 * (https://agentskills.io/specification) so a malformed skill fails here
 * instead.
 */
const SKILLS_DIR = fileURLToPath(new URL("../skills", import.meta.url));

const NAME_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function skillDirectories(): string[] {
  return readdirSync(SKILLS_DIR).filter((entry) =>
    statSync(path.join(SKILLS_DIR, entry)).isDirectory(),
  );
}

/** The frontmatter fields these assertions care about. */
interface Frontmatter {
  name?: string;
  description?: string;
}

/** Minimal frontmatter reader: the spec requires YAML between leading `---` fences. */
function parseFrontmatter(source: string): Frontmatter {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (!match?.[1]) throw new Error("missing YAML frontmatter");
  const fields: Frontmatter = {};
  for (const line of match[1].split("\n")) {
    // Only top-level scalars matter here; nested blocks (metadata:) are skipped.
    const field = /^([a-z-]+):\s*(.*)$/.exec(line);
    if (!field?.[1] || !field[2]) continue;
    if (field[1] === "name") fields.name = field[2].trim();
    if (field[1] === "description") fields.description = field[2].trim();
  }
  return fields;
}

describe("shipped agent skills", () => {
  const directories = skillDirectories().sort();

  it("ships at least one skill", () => {
    expect(directories.length).toBeGreaterThan(0);
  });

  it("ships the complete Karsa workflow set", () => {
    expect(directories).toEqual([
      "karsa-content",
      "karsa-data",
      "karsa-modules",
      "karsa-site-builder",
      "karsa-ui",
    ]);
  });

  describe.each(directories)("%s", (directory) => {
    const source = readFileSync(path.join(SKILLS_DIR, directory, "SKILL.md"), "utf8");
    const frontmatter = parseFrontmatter(source);

    it("has a name matching its directory", () => {
      // Required by the spec: agents resolve a skill by directory, so a
      // mismatch makes the skill unaddressable.
      expect(frontmatter.name).toBe(directory);
    });

    it("has a spec-valid name", () => {
      expect(frontmatter.name).toMatch(NAME_PATTERN);
      expect(frontmatter.name?.length).toBeLessThanOrEqual(64);
    });

    it("has a description within the 1024-character limit", () => {
      expect(frontmatter.description).toBeTruthy();
      expect(frontmatter.description?.length).toBeLessThanOrEqual(1024);
    });

    it("describes when to use it, not just what it is", () => {
      // Descriptions are the only thing loaded at startup, so they are what
      // decides whether a skill ever activates.
      expect(frontmatter.description?.toLowerCase()).toContain("use when");
    });

    it("stays within the recommended 500-line budget", () => {
      expect(source.split("\n").length).toBeLessThanOrEqual(500);
    });
  });
});
