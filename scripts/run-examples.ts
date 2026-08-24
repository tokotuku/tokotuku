import path from "node:path";

type Example = {
  name: string;
  port: number;
};

const EXAMPLES: Example[] = [
  { name: "company-install", port: 4301 },
  { name: "company-content", port: 4302 },
  { name: "company-polished", port: 4303 },
  { name: "product-install", port: 4304 },
  { name: "product-content", port: 4305 },
  { name: "product-polished", port: 4306 },
  { name: "service-install", port: 4307 },
  { name: "service-content", port: 4308 },
  { name: "service-polished", port: 4309 },
  { name: "publication-install", port: 4310 },
  { name: "publication-content", port: 4311 },
  { name: "publication-polished", port: 4312 },
];

const examplesRoot = path.resolve(import.meta.dir, "../examples");
const nodeBinary = process.env["KARSA_NODE_BINARY"] ?? Bun.which("node");
if (!nodeBinary) {
  throw new Error(
    "Running examples requires Node.js 22.12+ for Astro. Put node on PATH or set KARSA_NODE_BINARY.",
  );
}

process.stdout.write("Karsa examples running:\n");
for (const { name, port } of EXAMPLES) {
  process.stdout.write(`  ${name.padEnd(24)} http://localhost:${port}\n`);
}
process.stdout.write("Press Ctrl+C to stop all examples.\n");

const children = EXAMPLES.map(({ name, port }) =>
  Bun.spawn(
    [
      nodeBinary,
      path.join(examplesRoot, name, "node_modules", "astro", "bin", "astro.mjs"),
      "dev",
      "--host",
      "127.0.0.1",
      "--port",
      String(port),
    ],
    {
      cwd: path.join(examplesRoot, name),
      env: { ...process.env },
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
      detached: true,
    },
  ),
);

let shuttingDown = false;

function stopAll(signal: NodeJS.Signals = "SIGTERM"): void {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    try {
      process.kill(process.platform === "win32" ? child.pid : -child.pid, signal);
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ESRCH")) throw error;
    }
  }
}

process.on("SIGINT", () => stopAll("SIGINT"));
process.on("SIGTERM", () => stopAll("SIGTERM"));

const results = await Promise.all(
  children.map(async (child, index) => ({
    code: await child.exited,
    name: EXAMPLES[index]?.name ?? "unknown",
  })),
);

const unexpectedExit = results.find(({ code }) => !shuttingDown && code !== 0);
if (unexpectedExit) {
  stopAll();
  process.stderr.write(`${unexpectedExit.name} exited with code ${unexpectedExit.code}.\n`);
  process.exitCode = unexpectedExit.code ?? 1;
}
