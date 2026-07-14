export async function runGenerateChangelog(): Promise<void> {
  const proc = Bun.spawn(["bunx", "changeset", "version"], {
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
