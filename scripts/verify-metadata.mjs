#!/usr/bin/env node
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = readFileSync("plugin.yaml", "utf8");
const readme = readFileSync("README.md", "utf8");
const changelog = readFileSync("CHANGELOG.md", "utf8");

const manifestVersion = manifest.match(/^version:\s*(\S+)\s*$/m)?.[1];
if (manifestVersion !== packageJson.version) {
  throw new Error(
    `version mismatch: package.json=${packageJson.version}, plugin.yaml=${manifestVersion ?? "missing"}`,
  );
}
if (!readme.includes(`${packageJson.name}@alpha`)) {
  throw new Error(`README does not install ${packageJson.name}@alpha`);
}
if (!/^## Unreleased\s*$/m.test(changelog)) {
  throw new Error("CHANGELOG.md has no Unreleased section");
}
if (!/^kind:\s*model-provider\s*$/m.test(manifest)) {
  throw new Error("plugin.yaml is not a Hermes model-provider manifest");
}

console.log(`ok - release metadata agrees on ${packageJson.version}`);
