import { execFileSync } from "node:child_process";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ModuleSeed } from "../module";
import { assertKeyIsPublic, deriveMediaKey, mimeTypeForFile, planSeedSql } from "../seeds";
import { parseWranglerConfig } from "./wrangler-config";

export interface SeedOptions {
  cwd: string;
  modules: { name: string; seeds: ModuleSeed[] }[];
  mediaPrefixes: string[];
}

export interface SeedResult {
  sqlFilesRun: string[];
  mediaFilesUploaded: string[];
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function listFilesRecursively(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
  return files.sort();
}

function wranglerBinaryPath(cwd: string): string {
  return path.join(cwd, "node_modules", ".bin", "wrangler");
}

interface LabeledSqlFile {
  /** Shown in `tokotuku db seed` output, e.g. "catalog: demo-catalog.sql". */
  label: string;
  path: string;
}

function runSqlFiles(
  wrangler: string,
  cwd: string,
  d1Binding: string,
  files: LabeledSqlFile[],
): string[] {
  for (const file of files) {
    execFileSync(wrangler, ["d1", "execute", d1Binding, "--local", `--file=${file.path}`], {
      cwd,
      stdio: "inherit",
    });
  }
  return files.map((file) => file.label);
}

/** Uploads every file under `mediaRoot` to R2, deriving each one's key from its path relative to that root. Throws if a derived key doesn't fall under any of the client's declared mediaPrefixes -- see assertKeyIsPublic. */
async function uploadMediaDirectory(
  wrangler: string,
  cwd: string,
  bucketName: string,
  mediaRoot: string,
  mediaPrefixes: string[],
  ownerLabel: string,
): Promise<string[]> {
  const uploaded: string[] = [];
  for (const filePath of await listFilesRecursively(mediaRoot)) {
    const key = deriveMediaKey(mediaRoot, filePath);
    assertKeyIsPublic(key, mediaPrefixes, ownerLabel);
    execFileSync(
      wrangler,
      [
        "r2",
        "object",
        "put",
        `${bucketName}/${key}`,
        "--local",
        `--file=${filePath}`,
        `--content-type=${mimeTypeForFile(filePath)}`,
      ],
      { cwd, stdio: "inherit" },
    );
    uploaded.push(key);
  }
  return uploaded;
}

async function listClientSeedSqlFiles(clientSeedDir: string): Promise<LabeledSqlFile[]> {
  const entries = await readdir(clientSeedDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort()
    .map((fileName) => ({ label: `seed/${fileName}`, path: path.join(clientSeedDir, fileName) }));
}

/**
 * Seeds local D1 + R2 state: every installed module's own seed data (in
 * topo order), then the client's own `<root>/seed/` if present -- SQL
 * files in name order, then `<root>/seed/media/**`. Always --local; there
 * is no remote seeding path, deliberately, so demo data can never land in
 * a client's live database.
 */
export async function runSeed({ cwd, modules, mediaPrefixes }: SeedOptions): Promise<SeedResult> {
  const wrangler = wranglerBinaryPath(cwd);
  if (!(await pathExists(wrangler))) {
    throw new Error(`Could not find wrangler at ${wrangler}. Run "bun install" first.`);
  }

  const configSource = await readFile(path.join(cwd, "wrangler.jsonc"), "utf8");
  const { d1DatabaseBinding, r2BucketName } = parseWranglerConfig(configSource);

  const moduleSqlFiles = planSeedSql(modules).map((item) => {
    const sqlPath = fileURLToPath(item.sql);
    return { label: `${item.moduleName}: ${path.basename(sqlPath)}`, path: sqlPath };
  });
  const sqlFilesRun = runSqlFiles(wrangler, cwd, d1DatabaseBinding, moduleSqlFiles);

  const mediaFilesUploaded: string[] = [];
  for (const mod of modules) {
    for (const seed of mod.seeds) {
      if (!seed.media) continue;
      mediaFilesUploaded.push(
        ...(await uploadMediaDirectory(
          wrangler,
          cwd,
          r2BucketName,
          fileURLToPath(seed.media),
          mediaPrefixes,
          mod.name,
        )),
      );
    }
  }

  const clientSeedDir = path.join(cwd, "seed");
  if (await pathExists(clientSeedDir)) {
    const clientSqlFiles = await listClientSeedSqlFiles(clientSeedDir);
    sqlFilesRun.push(...runSqlFiles(wrangler, cwd, d1DatabaseBinding, clientSqlFiles));

    const clientMediaDir = path.join(clientSeedDir, "media");
    if (await pathExists(clientMediaDir)) {
      mediaFilesUploaded.push(
        ...(await uploadMediaDirectory(
          wrangler,
          cwd,
          r2BucketName,
          clientMediaDir,
          mediaPrefixes,
          "seed/media",
        )),
      );
    }
  }

  return { sqlFilesRun, mediaFilesUploaded };
}
