#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const forbidden = [
  /(^|\/)node_modules\//,
  /(^|\/)tests?\//,
  /(^|\/)__pycache__\//,
  /\.py[cod]$/,
  /(^|\/)(?:\.env|\.npmrc)$/,
  /(^|\/)(?:coverage|logs?|models?|fixtures?)\//,
  /\.(?:gguf|bin|log)$/,
  /(^|\/)\.git(?:hub)?\//,
  /^docs\/(?:findings-ledger|release-readiness-|test-inventory|.*-report)/,
  /^scripts\/(?:verify-|qvac-conformance|moderator-acceptance|artifact-provenance|resilience-soak)/,
];

function parseArgs(argv) {
  const options = { allowDirty: false, outputDir: tmpdir() };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--allow-dirty") options.allowDirty = true;
    else if (arg === "--output-dir") {
      const value = argv[++index];
      if (!value) throw new TypeError("--output-dir requires a value");
      options.outputDir = resolve(value);
    } else throw new TypeError(`unknown option: ${arg}`);
  }
  return options;
}

async function run(file, args) {
  return exec(file, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
}

export async function artifactProvenance(options = {}) {
  const outputDir = options.outputDir ?? (await mkdtemp(`${tmpdir()}/hermes-qvac-artifact-`));
  const [{ stdout: sha }, { stdout: status }, { stdout: packOutput }, { stdout: dependencyOutput }] =
    await Promise.all([
      run("git", ["rev-parse", "HEAD"]),
      run("git", ["status", "--porcelain"]),
      run("npm", ["pack", "--json", "--pack-destination", outputDir]),
      run("pnpm", ["list", "--prod", "--depth", "0", "--json"]),
    ]);
  if (status.trim() && !options.allowDirty)
    throw new Error("refusing provenance claim for a dirty worktree; commit first or pass --allow-dirty for rehearsal only");
  const packed = JSON.parse(packOutput)[0];
  const tarballPath = resolve(outputDir, packed.filename);
  const bytes = await readFile(tarballPath);
  const inventory = packed.files.map((file) => ({ path: file.path, size: file.size, mode: file.mode }));
  const rejected = inventory.filter((file) => forbidden.some((pattern) => pattern.test(file.path)));
  if (rejected.length)
    throw new Error(`forbidden packed paths: ${rejected.map((entry) => entry.path).join(", ")}`);
  const { stdout: packedText } = await run("tar", ["-xOzf", tarballPath]);
  const absolutePathText = packedText.match(/\/Users\/|\/home\/|[A-Za-z]:\\Users\\/);
  if (absolutePathText) throw new Error("packed bytes contain a recognizable machine-specific home path");
  const dependencyTree = JSON.parse(dependencyOutput)[0];
  return {
    schema: 1,
    commit: sha.trim(),
    dirty: Boolean(status.trim()),
    package: { name: packed.name, version: packed.version },
    artifact: {
      filename: packed.filename,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      npmShasum: packed.shasum,
      npmIntegrity: packed.integrity,
      packedBytes: packed.size,
      unpackedBytes: packed.unpackedSize,
      fileCount: packed.entryCount,
    },
    productionDependencies: dependencyTree.dependencies ?? {},
    inventory,
  };
}

try {
  const result = await artifactProvenance(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 1;
}
