#!/usr/bin/env node
import { performance } from "node:perf_hooks";

function parseArgs(argv) {
  const options = { sequential: 100, concurrent: 20, timeoutMs: 15_000 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = argv[++index];
    if (!value) throw new TypeError(`${arg} requires a value`);
    if (arg === "--base-url") options.baseURL = value.replace(/\/$/, "");
    else if (arg === "--model") options.model = value;
    else if (arg === "--sequential") options.sequential = Number(value);
    else if (arg === "--concurrent") options.concurrent = Number(value);
    else if (arg === "--timeout-ms") options.timeoutMs = Number(value);
    else throw new TypeError(`unknown option: ${arg}`);
  }
  if (!options.baseURL || !options.model)
    throw new TypeError("usage: resilience-soak --base-url URL --model ID [--sequential 100] [--concurrent 20]");
  for (const key of ["sequential", "concurrent", "timeoutMs"])
    if (!Number.isSafeInteger(options[key]) || options[key] < 1)
      throw new TypeError(`${key} must be a positive integer`);
  return options;
}

function percentile(values, quantile) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * quantile))];
}

async function request(options, index) {
  const started = performance.now();
  try {
    const response = await fetch(`${options.baseURL}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(options.timeoutMs),
      body: JSON.stringify({
        model: options.model,
        messages: [{ role: "user", content: `Return one token. Request ${index}.` }],
        max_tokens: 1,
        temperature: 0,
        stream: false,
      }),
    });
    const body = await response.json();
    const finishReason = body?.choices?.[0]?.finish_reason;
    if (!response.ok || !body?.choices?.[0] || !["length", "stop"].includes(finishReason))
      throw new Error(`HTTP ${response.status}, finish_reason=${String(finishReason)}`);
    return { ok: true, durationMs: Math.round(performance.now() - started), finishReason };
  } catch (error) {
    return {
      ok: false,
      durationMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function resilienceSoak(options) {
  const started = new Date().toISOString();
  const sequential = [];
  for (let index = 0; index < options.sequential; index += 1)
    sequential.push(await request(options, `sequential-${index + 1}`));
  const concurrent = await Promise.all(
    Array.from({ length: options.concurrent }, (_, index) => request(options, `concurrent-${index + 1}`)),
  );
  const results = [...sequential, ...concurrent];
  const durations = results.map((entry) => entry.durationMs);
  const failures = results.filter((entry) => !entry.ok);
  return {
    schema: 1,
    started,
    finished: new Date().toISOString(),
    target: { baseURL: options.baseURL, model: options.model },
    counts: {
      sequential: sequential.length,
      concurrent: concurrent.length,
      passed: results.length - failures.length,
      failed: failures.length,
    },
    latencyMs: {
      min: Math.min(...durations),
      p50: percentile(durations, 0.5),
      p95: percentile(durations, 0.95),
      max: Math.max(...durations),
    },
    finishReasons: Object.fromEntries(
      Object.entries(
        Object.groupBy(
          results.filter((entry) => entry.ok),
          (entry) => entry.finishReason,
        ),
      ).map(([reason, entries]) => [reason, entries.length]),
    ),
    failures,
    ok: failures.length === 0,
  };
}

try {
  const result = await resilienceSoak(parseArgs(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = result.ok ? 0 : 1;
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exitCode = 2;
}
