#!/usr/bin/env bun

const COMMIT_TYPES = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
] as const;

const HEADER_PATTERN = new RegExp(`^(${COMMIT_TYPES.join("|")})(\\([\\w./-]+\\))?!?: .{1,100}$`);
const MERGE_PATTERN = /^Merge /;

async function main(): Promise<void> {
  const commitMsgPath = process.argv[2];
  if (!commitMsgPath) {
    console.error("verify-commit-msg: missing commit message file path");
    process.exit(1);
  }

  const content = await Bun.file(commitMsgPath).text();
  const header = (content.split("\n")[0] ?? "").trim();

  if (header.length === 0 || MERGE_PATTERN.test(header)) {
    return;
  }

  if (!HEADER_PATTERN.test(header)) {
    console.error(`
✖ Commit message does not follow Conventional Commits.

  Received: "${header}"
  Expected: <type>(<optional scope>): <description>

  Allowed types: ${COMMIT_TYPES.join(", ")}

  Examples:
    feat(elements): add tk-button component
    fix(core): correct focus trap edge case
    docs(tokens): document spacing scale
`);
    process.exit(1);
  }
}

await main();
