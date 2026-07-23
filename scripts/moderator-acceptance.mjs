#!/usr/bin/env node
import { execFile } from "node:child_process";
import { chmod, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const OUTPUT_LIMIT = 2 * 1024 * 1024;

async function command(file, args, options = {}) {
  const started = performance.now();
  try {
    const result = await exec(file, args, {
      ...options,
      timeout: options.timeout ?? 120_000,
      maxBuffer: OUTPUT_LIMIT,
      encoding: "utf8",
    });
    return {
      command: [file, ...args].join(" "),
      ok: true,
      code: 0,
      durationMs: Math.round(performance.now() - started),
      stdout: result.stdout.trim().slice(-4_000),
      stderr: result.stderr.trim().slice(-4_000),
    };
  } catch (error) {
    return {
      command: [file, ...args].join(" "),
      ok: false,
      code: typeof error.code === "number" ? error.code : null,
      signal: error.signal ?? null,
      killed: Boolean(error.killed),
      durationMs: Math.round(performance.now() - started),
      stdout: String(error.stdout ?? "").trim().slice(-4_000),
      stderr: String(error.stderr ?? error.message ?? error).trim().slice(-4_000),
    };
  }
}

function parseArgs(argv) {
  const options = { keepOnFailure: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--keep-on-failure") options.keepOnFailure = true;
    else if (["--tarball", "--hermes-bin", "--hermes-source", "--hermes-python"].includes(arg)) {
      const value = argv[++index];
      if (!value) throw new TypeError(`${arg} requires a value`);
      if (arg === "--tarball") options.tarball = value;
      else if (arg === "--hermes-bin") options.hermesBin = value;
      else if (arg === "--hermes-source") options.hermesSource = resolve(value);
      else options.hermesPython = resolve(value);
    } else throw new TypeError(`unknown option: ${arg}`);
  }
  if (!options.tarball)
    throw new TypeError(
      "usage: moderator-acceptance --tarball PACKAGE.tgz [--hermes-bin PATH] [--keep-on-failure]",
    );
  options.tarball = resolve(options.tarball);
  options.hermesBin = options.hermesBin ?? "hermes";
  if (options.hermesSource && !options.hermesPython)
    throw new TypeError("--hermes-source requires --hermes-python");
  return options;
}

export async function moderatorAcceptance(options) {
  const root = await mkdtemp(join(tmpdir(), "hermes-qvac-acceptance-"));
  const home = join(root, "home");
  const consumer = join(root, "consumer");
  await mkdir(home, { recursive: true, mode: 0o700 });
  await mkdir(consumer, { recursive: true, mode: 0o700 });
  await writeFile(join(consumer, "package.json"), '{"private":true}\n');
  const hermesPath = isAbsolute(options.hermesBin)
    ? options.hermesBin
    : options.hermesBin;
  const hermesFile = options.hermesSource ? options.hermesPython : hermesPath;
  const hermesPrefix = options.hermesSource ? ["-m", "hermes_cli.main"] : [];
  const shimDir = join(root, "bin");
  if (options.hermesSource) {
    await mkdir(shimDir, { recursive: true, mode: 0o700 });
    const shim = join(shimDir, "hermes");
    await writeFile(
      shim,
      `#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const result = spawnSync(${JSON.stringify(options.hermesPython)}, ["-m", "hermes_cli.main", ...process.argv.slice(2)], { stdio: "inherit", env: { ...process.env, PYTHONPATH: ${JSON.stringify(options.hermesSource)} + (process.env.PYTHONPATH ? ":" + process.env.PYTHONPATH : "") } });
process.exit(result.status ?? 1);
`,
      { mode: 0o700 },
    );
    await chmod(shim, 0o700);
  }
  const env = {
    ...process.env,
    HOME: home,
    HERMES_HOME: join(home, ".hermes"),
    PATH: `${join(consumer, "node_modules", ".bin")}:${options.hermesSource ? `${shimDir}:` : ""}${process.env.PATH ?? ""}`,
    ...(options.hermesSource
      ? {
          PYTHONPATH: `${options.hermesSource}${process.env.PYTHONPATH ? `:${process.env.PYTHONPATH}` : ""}`,
          HERMES_PYTHON: options.hermesPython,
        }
      : {}),
  };
  const steps = [];
  let keep = false;
  const run = async (name, file, args, commandOptions = {}) => {
    const result = await command(file, args, {
      cwd: consumer,
      env,
      ...commandOptions,
    });
    steps.push({ name, ...result });
    if (!result.ok) throw new Error(`${name} failed`);
    return result;
  };
  try {
    await run("Hermes version", hermesFile, [...hermesPrefix, "--version"], { timeout: 30_000 });
    await run(
      "Install packed candidate",
      "npm",
      ["install", "--ignore-scripts", "--no-audit", "--no-fund", options.tarball],
    );
    const cli = join(consumer, "node_modules", ".bin", "hermes-qvac");
    const setup = await run("Initial copied setup", cli, ["setup", "--json"]);
    const setupJson = JSON.parse(setup.stdout);
    if (!setupJson.ok || setupJson.upgraded)
      throw new Error("initial setup did not report a clean install");
    const listing = await run("Hermes discovery", hermesFile, [...hermesPrefix, "plugins", "list"]);
    if (!/qvac[\s\S]*enabled|enabled[\s\S]*qvac/i.test(listing.stdout))
      throw new Error("Hermes did not list qvac as enabled");
    await run("Managed-mode doctor", cli, ["doctor", "--json"]);
    await run("Real Hermes transport smoke", cli, ["smoke", "--transport-only", "--json"], {
      timeout: 60_000,
    });
    const upgrade = await run("Idempotent upgrade", cli, ["setup", "--json"]);
    if (!JSON.parse(upgrade.stdout).upgraded)
      throw new Error("repeated setup did not report an upgrade");
    const uninstall = await run("Owned uninstall", cli, ["uninstall", "--json"]);
    if (!JSON.parse(uninstall.stdout).removed)
      throw new Error("uninstall did not report removal");
    const finalListing = await run("Discovery after uninstall", hermesFile, [...hermesPrefix, "plugins", "list"]);
    if (/qvac[\s\S]*enabled|enabled[\s\S]*qvac/i.test(finalListing.stdout))
      throw new Error("qvac remained enabled after uninstall");
    const pluginPath = join(env.HERMES_HOME, "plugins", "model-providers", "qvac");
    try {
      await readFile(join(pluginPath, "plugin.yaml"));
      throw new Error("owned plugin directory remained after uninstall");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    const scrub = (value) =>
      value
        .replaceAll(root, "<acceptance-root>")
        .replaceAll(homedir(), "<host-home>")
        .replaceAll(options.tarball, `<tarball>/${options.tarball.split("/").at(-1)}`);
    const sanitizedSteps = steps.map((step) =>
      Object.fromEntries(
        Object.entries(step).map(([key, value]) => [
          key,
          typeof value === "string" ? scrub(value) : value,
        ]),
      ),
    );
    return {
      schema: 1,
      ok: true,
      generatedAt: new Date().toISOString(),
      isolatedHome: true,
      sourceCheckoutUsedAtRuntime: false,
      tarball: options.tarball.split("/").at(-1),
      steps: sanitizedSteps,
    };
  } catch (error) {
    keep = Boolean(options.keepOnFailure);
    const scrub = (value) =>
      value
        .replaceAll(root, "<acceptance-root>")
        .replaceAll(homedir(), "<host-home>")
        .replaceAll(options.tarball, `<tarball>/${options.tarball.split("/").at(-1)}`);
    return {
      schema: 1,
      ok: false,
      generatedAt: new Date().toISOString(),
      isolatedHome: true,
      sourceCheckoutUsedAtRuntime: false,
      tarball: options.tarball.split("/").at(-1),
      error: error instanceof Error ? error.message : String(error),
      retainedDiagnosticRoot: keep ? root : null,
      steps: steps.map((step) =>
        Object.fromEntries(
          Object.entries(step).map(([key, value]) => [
            key,
            typeof value === "string" ? scrub(value) : value,
          ]),
        ),
      ),
    };
  } finally {
    if (!keep) await rm(root, { recursive: true, force: true });
  }
}

try {
  const result = await moderatorAcceptance(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 2;
}
