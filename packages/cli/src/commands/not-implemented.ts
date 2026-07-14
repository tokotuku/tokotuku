export function notImplemented(command: string): never {
  console.error(`\n"${command}" is not implemented yet. See packages/cli/README.md.\n`);
  process.exit(1);
}
