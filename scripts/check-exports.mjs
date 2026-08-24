import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const repositoryRoot = resolve(dirname(new URL(import.meta.url).pathname), "..");

const expected = {
  "@karsa/theme": [
    "./styles.css",
    "./tokens.css",
    "./fonts.css",
    "./admin.css",
    "./palette",
    "./ThemeScript.astro",
  ],
  "@karsa/charts": ["./Chart.astro", "./types"],
  "@karsa/ui": ["./DocumentLayout.astro", "./InspectorMetric.astro", "./CursorPagination.astro"],
  "@karsa/core": ["./components/*", "./layouts/*"],
  "@karsa/auth": ["./client", "./components/*"],
};

const removed = {
  "@karsa/ui": [
    "./Layout.astro",
    "./AdminMetric.astro",
    "./Chart.astro",
    "./chart",
    "./theme",
    "./styles.css",
    "./admin.css",
  ],
};

function packageDirectory(packageName) {
  const shortName = packageName.replace("@karsa/", "");
  return shortName === "config"
    ? resolve(repositoryRoot, "configs")
    : resolve(repositoryRoot, "packages", shortName);
}

function readPackage(packageName) {
  const directory = packageDirectory(packageName);
  return {
    directory,
    manifest: JSON.parse(readFileSync(resolve(directory, "package.json"), "utf8")),
  };
}

const errors = [];

for (const [packageName, subpaths] of Object.entries(expected)) {
  const { directory, manifest } = readPackage(packageName);
  for (const subpath of subpaths) {
    if (!(subpath in manifest.exports)) {
      errors.push(`${packageName} is missing export ${subpath}`);
      continue;
    }

    const target = manifest.exports[subpath];
    if (typeof target === "string") {
      const targetPath = target.endsWith("/*") ? target.slice(0, -2) : target;
      if (!existsSync(resolve(directory, targetPath))) {
        errors.push(`${packageName}${subpath} points to missing ${target}`);
      }
      continue;
    }

    const importTarget = target.import ?? target.types;
    if (
      !importTarget ||
      !existsSync(
        resolve(directory, importTarget.endsWith("/*") ? importTarget.slice(0, -2) : importTarget),
      )
    ) {
      errors.push(`${packageName}${subpath} points to a missing import target`);
    }
  }
}

for (const [packageName, subpaths] of Object.entries(removed)) {
  const { manifest } = readPackage(packageName);
  for (const subpath of subpaths) {
    if (subpath in manifest.exports) {
      errors.push(`${packageName} still exposes removed export ${subpath}`);
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

process.stdout.write(
  "Export map passed: Karsa 0.3.0 subpaths resolve and removed exports are absent.\n",
);
