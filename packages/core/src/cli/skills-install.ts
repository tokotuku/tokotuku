import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Where the Agent Skills bundled with this package get copied to.
 *
 * The spec (https://agentskills.io/specification) defines the skill format
 * but deliberately leaves discovery to each agent, and they disagree:
 * `.agents/skills/` is the neutral location Copilot and Cursor read, while
 * Claude Code reads `.claude/skills/`. Writing both is what makes one
 * authored skill work across a team using different editors -- they are
 * copies of the same source, so keeping them in sync is this command's job,
 * not the reader's.
 */
const INSTALL_DIRS = [".agents/skills", ".claude/skills"];
const LEGACY_FRAMEWORK_PREFIXES = [["tako", "ntuku"].join(""), ["toko", "tuku"].join("")].map(
  (brand) => `${brand}-`,
);

/** Skills live beside dist/ in the published package, not inside it. */
const SOURCE_DIR = fileURLToPath(new URL("../../skills", import.meta.url));

export interface SkillsInstallResult {
  skills: string[];
  targets: string[];
}

function listSkills(sourceDir: string): string[] {
  return readdirSync(sourceDir)
    .filter((entry) => statSync(path.join(sourceDir, entry)).isDirectory())
    .filter((entry) => existsSync(path.join(sourceDir, entry, "SKILL.md")))
    .sort();
}

/**
 * Copies every bundled skill into this project's agent-skill directories.
 *
 * Each skill directory is replaced wholesale rather than merged, so a skill
 * that drops a reference file in a later release doesn't leave the stale one
 * behind for an agent to read. Only directories this package owns are
 * touched; anything else already in the target is left alone.
 */
export function installSkills(cwd: string, sourceDir = SOURCE_DIR): SkillsInstallResult {
  if (!existsSync(sourceDir)) {
    throw new Error(
      `No bundled skills found at ${sourceDir}. This usually means @karsa/core was installed ` +
        "without its `skills` directory -- check that the installed version ships it.",
    );
  }

  const skills = listSkills(sourceDir);
  if (skills.length === 0) throw new Error(`No skills to install in ${sourceDir}.`);

  for (const target of INSTALL_DIRS) {
    const targetDir = path.join(cwd, target);
    mkdirSync(targetDir, { recursive: true });
    for (const entry of readdirSync(targetDir)) {
      if (LEGACY_FRAMEWORK_PREFIXES.some((prefix) => entry.startsWith(prefix))) {
        rmSync(path.join(targetDir, entry), { recursive: true, force: true });
      }
    }
    for (const skill of skills) {
      const destination = path.join(targetDir, skill);
      rmSync(destination, { recursive: true, force: true });
      cpSync(path.join(sourceDir, skill), destination, { recursive: true });
    }
  }

  return { skills, targets: INSTALL_DIRS };
}
