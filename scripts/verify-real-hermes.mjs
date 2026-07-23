#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  prepareIsolatedHermesHome,
  runHermesCaptured,
  withMockQvac,
} from "../dist/runtime.js";
import { DEFAULT_CONFIG } from "../dist/config.js";

const promptArgs = ["-z", "Reply with exactly pong.", "--ignore-user-config", "--cli"];
const isolated = await prepareIsolatedHermesHome();
const results = [];

async function runCase(name, fixtureOptions, expectation, processTimeoutMs = 8_000) {
  const fixture = await withMockQvac(fixtureOptions);
  try {
    const result = await runHermesCaptured(
      fixture.baseURL,
      DEFAULT_CONFIG.model,
      promptArgs,
      { ...DEFAULT_CONFIG, timeoutSeconds: 1 },
      isolated.env,
      processTimeoutMs,
    );
    expectation(result);
    results.push({ name, code: result.code, response: result.stdout.trim() });
  } finally {
    await fixture.close();
  }
}

try {
  await runCase("streaming success", {}, (result) => {
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout.trim(), "pong");
  });
  await runCase("wrong response", { responseText: "not-pong" }, (result) => {
    assert.notEqual(result.stdout.trim(), "pong");
  });
  await runCase("HTTP failure", { chatStatus: 503 }, (result) => {
    // Hermes 0.18.2 may exit zero after reporting a transport error. The
    // hermes-qvac smoke command therefore gates success on the exact response.
    assert.ok(result.code !== 0 || result.stdout.trim() !== "pong");
  });
  await runCase("malformed SSE", { malformedSse: true }, (result) => {
    assert.ok(result.code !== 0 || result.stdout.trim() !== "pong");
  });
  await runCase("connection close", { closeEarly: true }, (result) => {
    assert.ok(result.code !== 0 || result.stdout.trim() !== "pong");
  });
  await runCase("delayed timeout", { delayMs: 2_500 }, (result) => {
    assert.ok(result.code !== 0 || result.stdout.trim() !== "pong");
  }, 5_000);
  await runCase("non-stream response", { nonStreaming: true }, (result) => {
    assert.ok(result.code !== 0 || result.stdout.trim() !== "pong");
  });
  process.stdout.write(`${JSON.stringify({ ok: true, isolatedHermesHome: true, cases: results }, null, 2)}\n`);
} finally {
  await isolated.cleanup();
}
