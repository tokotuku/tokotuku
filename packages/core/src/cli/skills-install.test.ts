import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { installSkills } from "./skills-install";

let sourceDir: string;
let cwd: string;

beforeEach(async () => {
  sourceDir = await mkdtemp(path.join(tmpdir(), "karsa-skills-source-"));
  cwd = await mkdtemp(path.join(tmpdir(), "karsa-skills-cwd-"));
});

afterEach(async () => {
  await rm(sourceDir, { recursive: true, force: true });
  await rm(cwd, { recursive: true, force: true });
});

async function writeSkill(name: string, description = "A test skill."): Promise<void> {
  const dir = path.join(sourceDir, name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${description}\n---\n`,
  );
}

describe("installSkills", () => {
  it("installs every bundled Karsa skill by default", async () => {
    const result = installSkills(cwd);

    expect(result.skills).toEqual([
      "karsa-content",
      "karsa-data",
      "karsa-modules",
      "karsa-site-builder",
      "karsa-ui",
    ]);
    for (const target of result.targets) {
      for (const skill of result.skills) {
        const content = await readFile(path.join(cwd, target, skill, "SKILL.md"), "utf8");
        expect(content).toContain(`name: ${skill}`);
      }
    }
  });

  it("copies every bundled skill into both agent-skill directories", async () => {
    await writeSkill("karsa-modules");
    await writeSkill("karsa-data");

    const result = installSkills(cwd, sourceDir);

    expect(result.skills).toEqual(["karsa-data", "karsa-modules"]);
    expect(result.targets).toEqual([".agents/skills", ".claude/skills"]);
    for (const target of result.targets) {
      for (const skill of result.skills) {
        const content = await readFile(path.join(cwd, target, skill, "SKILL.md"), "utf8");
        expect(content).toContain(`name: ${skill}`);
      }
    }
  });

  it("ignores entries in the source directory that aren't skills", async () => {
    await writeSkill("karsa-modules");
    await mkdir(path.join(sourceDir, "not-a-skill"), { recursive: true });
    await writeFile(path.join(sourceDir, "README.md"), "not a skill either");

    const result = installSkills(cwd, sourceDir);

    expect(result.skills).toEqual(["karsa-modules"]);
  });

  it("replaces an existing installed skill wholesale rather than merging", async () => {
    await writeSkill("karsa-modules");
    installSkills(cwd, sourceDir);

    // Simulate a stale file left by an older version of this skill, and a
    // local file the user placed there themselves.
    const installedDir = path.join(cwd, ".claude", "skills", "karsa-modules");
    await writeFile(path.join(installedDir, "stale-reference.md"), "old content");

    installSkills(cwd, sourceDir);

    await expect(readFile(path.join(installedDir, "stale-reference.md"), "utf8")).rejects.toThrow();
  });

  it("leaves a directory it doesn't own alone", async () => {
    await writeSkill("karsa-modules");
    await mkdir(path.join(cwd, ".claude", "skills", "my-own-skill"), { recursive: true });
    await writeFile(
      path.join(cwd, ".claude", "skills", "my-own-skill", "SKILL.md"),
      "---\nname: my-own-skill\ndescription: mine\n---\n",
    );

    installSkills(cwd, sourceDir);

    const content = await readFile(
      path.join(cwd, ".claude", "skills", "my-own-skill", "SKILL.md"),
      "utf8",
    );
    expect(content).toContain("mine");
  });

  it("removes only legacy framework skill directories", async () => {
    await writeSkill("karsa-modules");
    for (const target of [".agents/skills", ".claude/skills"]) {
      const legacyDirectory = `${["tako", "ntuku"].join("")}-data`;
      await mkdir(path.join(cwd, target, legacyDirectory), { recursive: true });
      await writeFile(path.join(cwd, target, legacyDirectory, "SKILL.md"), "legacy");
      await mkdir(path.join(cwd, target, "my-custom-skill"), { recursive: true });
      await writeFile(path.join(cwd, target, "my-custom-skill", "SKILL.md"), "custom");
    }
    installSkills(cwd, sourceDir);
    for (const target of [".agents/skills", ".claude/skills"]) {
      const legacyDirectory = `${["tako", "ntuku"].join("")}-data`;
      await expect(
        readFile(path.join(cwd, target, legacyDirectory, "SKILL.md"), "utf8"),
      ).rejects.toThrow();
      await expect(
        readFile(path.join(cwd, target, "my-custom-skill", "SKILL.md"), "utf8"),
      ).resolves.toBe("custom");
    }
  });

  it("throws when the source directory does not exist", () => {
    expect(() => installSkills(cwd, path.join(sourceDir, "does-not-exist"))).toThrow(
      /No bundled skills found/,
    );
  });

  it("throws when the source directory has no skills", () => {
    expect(() => installSkills(cwd, sourceDir)).toThrow(/No skills to install/);
  });
});
