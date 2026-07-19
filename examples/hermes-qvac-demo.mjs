#!/usr/bin/env node

import {
  assertQvacServerReachable,
  createHermesQvacProvider,
} from "../dist/index.js";

const shouldCheckServer = process.argv.includes("--check");
const baseURL = process.env.QVAC_BASE_URL ?? "http://127.0.0.1:11434/v1";
const apiKey = process.env.QVAC_API_KEY ?? "qvac-local";
const model = process.env.QVAC_MODEL ?? "qvac-default";

const provider = createHermesQvacProvider({
  baseURL,
  apiKey,
  model,
});

const printableProvider = {
  ...provider,
  openai: {
    ...provider.openai,
    apiKey: provider.openai.apiKey ? "[redacted]" : provider.openai.apiKey,
  },
};

const hermesProviders = [printableProvider];

console.log("Hermes provider registry example:");
console.log(JSON.stringify(hermesProviders, null, 2));

console.log("\nSelect provider id \"qvac\" in Hermes.");
console.log(`QVAC endpoint: ${provider.openai.baseURL}`);
console.log(`Default model: ${provider.defaultModel}`);

if (shouldCheckServer) {
  await assertQvacServerReachable({ baseURL });
  console.log("QVAC server is reachable.");
} else {
  console.log("\nRun with --check to verify the local QVAC server is reachable.");
}
