#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

const BODY_LIMIT = 2 * 1024 * 1024;

function normalizeBaseURL(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || !url.hostname)
    throw new TypeError('base URL must be HTTP(S)');
  if (url.username || url.password || url.search || url.hash)
    throw new TypeError('base URL must not contain credentials, query, or fragment');
  url.pathname = `${url.pathname.replace(/\/+$/, '').replace(/\/v1$/, '')}/v1`;
  return url.toString().replace(/\/$/, '');
}

async function boundedBody(response) {
  const reader = response.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > BODY_LIMIT) {
      await reader.cancel();
      throw new Error(`response exceeds ${BODY_LIMIT} bytes`);
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

async function request(baseURL, path, options = {}, timeoutMs = 15_000) {
  const started = performance.now();
  const response = await fetch(`${baseURL}${path}`, {
    ...options,
    redirect: 'manual',
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await boundedBody(response);
  return {
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    body,
    durationMs: Math.round(performance.now() - started),
  };
}

function authHeaders(apiKey) {
  return {
    'content-type': 'application/json',
    ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
  };
}

function completionBody(model, overrides = {}) {
  return {
    model,
    messages: [{ role: 'user', content: 'Reply with exactly pong.' }],
    temperature: 0,
    max_tokens: 32,
    ...overrides,
  };
}

function parseJson(body) {
  try {
    return JSON.parse(body);
  } catch (error) {
    throw new Error(`invalid JSON: ${error instanceof Error ? error.message : error}`);
  }
}

function parseSse(body) {
  const events = [];
  let done = 0;
  for (const block of body.split(/\r?\n\r?\n/)) {
    const lines = block.split(/\r?\n/).filter((line) => line.startsWith('data:'));
    if (lines.length === 0) continue;
    const data = lines.map((line) => line.slice(5).trimStart()).join('\n');
    if (data === '[DONE]') {
      done += 1;
      continue;
    }
    events.push(parseJson(data));
  }
  return { events, done };
}

export async function runQvacConformance(options) {
  const baseURL = normalizeBaseURL(options.baseURL);
  const model = options.model;
  const timeoutMs = options.timeoutMs ?? 15_000;
  const headers = authHeaders(options.apiKey);
  const cases = [];
  const record = async (name, fn, classification = 'required') => {
    try {
      const evidence = await fn();
      cases.push({ name, status: 'pass', classification, ...evidence });
    } catch (error) {
      cases.push({
        name,
        status:
          classification === 'known-upstream' ? 'known-upstream-failure' : 'fail',
        classification,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };
  const skip = (name, reason, classification = 'optional') =>
    cases.push({ name, status: 'skip', classification, reason });

  await record('models', async () => {
    const response = await request(baseURL, '/models', { headers }, timeoutMs);
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    const json = parseJson(response.body);
    if (!Array.isArray(json?.data) || !json.data.every((item) => typeof item?.id === 'string'))
      throw new Error('expected {data:[{id:string}]}');
    if (!json.data.some((item) => item.id === model))
      throw new Error(`selected model '${model}' is not advertised`);
    return { httpStatus: response.status, durationMs: response.durationMs, models: json.data.map((item) => item.id) };
  });

  await record('non-stream completion', async () => {
    const response = await request(baseURL, '/chat/completions', {
      method: 'POST', headers, body: JSON.stringify(completionBody(model, { stream: false })),
    }, timeoutMs);
    if (response.status !== 200) throw new Error(`HTTP ${response.status}: ${response.body.slice(0, 300)}`);
    const json = parseJson(response.body);
    if (!Array.isArray(json?.choices) || json.choices.length === 0)
      throw new Error('missing completion choices');
    const choice = json.choices[0];
    if (typeof choice?.message?.content !== 'string') throw new Error('missing assistant content');
    if (typeof choice.finish_reason !== 'string') throw new Error('missing finish_reason');
    return { httpStatus: response.status, durationMs: response.durationMs, finishReason: choice.finish_reason, usage: json.usage ?? null };
  });

  await record('stream completion', async () => {
    const response = await request(baseURL, '/chat/completions', {
      method: 'POST', headers, body: JSON.stringify(completionBody(model, { stream: true, stream_options: { include_usage: true } })),
    }, timeoutMs);
    if (response.status !== 200) throw new Error(`HTTP ${response.status}: ${response.body.slice(0, 300)}`);
    const parsed = parseSse(response.body);
    if (parsed.done !== 1) throw new Error(`expected exactly one [DONE], received ${parsed.done}`);
    if (parsed.events.length === 0) throw new Error('no streamed JSON events');
    const finishReasons = parsed.events.flatMap((event) => event.choices ?? []).map((choice) => choice.finish_reason).filter(Boolean);
    if (finishReasons.length !== 1) throw new Error(`expected one terminal finish reason, received ${finishReasons.length}`);
    const usageEvents = parsed.events.filter((event) => event.usage);
    return { httpStatus: response.status, durationMs: response.durationMs, events: parsed.events.length, finishReason: finishReasons[0], usageEvents: usageEvents.length };
  });

  await record('explicit max-token termination', async () => {
    const response = await request(baseURL, '/chat/completions', {
      method: 'POST', headers, body: JSON.stringify(completionBody(model, { stream: false, max_tokens: 1 })),
    }, timeoutMs);
    if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
    const json = parseJson(response.body);
    const finishReason = json?.choices?.[0]?.finish_reason;
    if (typeof finishReason !== 'string') throw new Error('missing finish_reason');
    return { httpStatus: response.status, durationMs: response.durationMs, finishReason };
  });

  await record('invalid model', async () => {
    const response = await request(baseURL, '/chat/completions', {
      method: 'POST', headers, body: JSON.stringify(completionBody(`missing-${Date.now()}`, { stream: false })),
    }, timeoutMs);
    if (response.status < 400) throw new Error(`invalid model unexpectedly returned HTTP ${response.status}`);
    return { httpStatus: response.status, durationMs: response.durationMs };
  });

  await record('malformed request', async () => {
    const response = await request(baseURL, '/chat/completions', {
      method: 'POST', headers, body: '{not-json',
    }, timeoutMs);
    if (response.status < 400) throw new Error(`malformed JSON unexpectedly returned HTTP ${response.status}`);
    return { httpStatus: response.status, durationMs: response.durationMs };
  });

  await record('tool request shape', async () => {
    const response = await request(baseURL, '/chat/completions', {
      method: 'POST', headers, body: JSON.stringify(completionBody(model, {
        stream: false,
        messages: [{ role: 'user', content: 'Use the echo tool with value pong.' }],
        tools: [{ type: 'function', function: { name: 'echo', description: 'Return a supplied value', parameters: { type: 'object', properties: { value: { type: 'string' } }, required: ['value'], additionalProperties: false } } }],
        tool_choice: 'auto',
      })),
    }, timeoutMs);
    if (response.status !== 200) throw new Error(`HTTP ${response.status}: ${response.body.slice(0, 300)}`);
    const json = parseJson(response.body);
    if (!Array.isArray(json?.choices) || !json.choices[0]?.message)
      throw new Error('missing OpenAI-compatible response message');
    return { httpStatus: response.status, durationMs: response.durationMs, finishReason: json.choices[0].finish_reason ?? null, emittedToolCall: Array.isArray(json.choices[0].message.tool_calls) };
  });

  await record('unavailable server is bounded', async () => {
    const started = performance.now();
    try {
      await request('http://127.0.0.1:1/v1', '/models', {}, 1_000);
    } catch {
      return { durationMs: Math.round(performance.now() - started) };
    }
    throw new Error('unavailable endpoint unexpectedly responded');
  });

  if (options.expectAuth) {
    for (const [name, key] of [['missing authentication', undefined], ['wrong authentication', 'definitely-wrong']]) {
      await record(name, async () => {
        const response = await request(baseURL, '/models', { headers: authHeaders(key) }, timeoutMs);
        if (![401, 403].includes(response.status)) throw new Error(`expected 401/403, received HTTP ${response.status}`);
        return { httpStatus: response.status, durationMs: response.durationMs };
      });
    }
  } else {
    skip('authentication rejection', 'server authentication was not declared enabled');
  }

  skip('server restart', 'requires lifecycle ownership; covered by managed acceptance/soak harness');
  skip('server stop mid-response', 'requires lifecycle ownership; covered by managed acceptance/soak harness');
  skip('context boundary (#3384)', 'destructive known-failure case requires --include-known-failures', 'known-upstream');
  skip('structured JSON terminal state (#3225)', 'destructive known-failure case requires --include-known-failures', 'known-upstream');

  if (options.includeKnownFailures) {
    const knownProbeNames = new Set([
      'context boundary (#3384)',
      'structured JSON terminal state (#3225)',
    ]);
    for (let index = cases.length - 1; index >= 0; index -= 1) {
      if (knownProbeNames.has(cases[index].name)) cases.splice(index, 1);
    }
    await record('context boundary (#3384)', async () => {
      const prompt = 'x '.repeat(options.contextProbeWords ?? 20_000);
      const response = await request(baseURL, '/chat/completions', {
        method: 'POST', headers, body: JSON.stringify(completionBody(model, { stream: true, max_tokens: 8_192, messages: [{ role: 'user', content: prompt }] })),
      }, Math.min(timeoutMs, 10_000));
      const parsed = parseSse(response.body);
      if (parsed.done !== 1) throw new Error(`stream did not terminate exactly once (DONE=${parsed.done})`);
      return { httpStatus: response.status, durationMs: response.durationMs };
    }, 'known-upstream');
    await record('structured JSON terminal state (#3225)', async () => {
      const response = await request(baseURL, '/chat/completions', {
        method: 'POST', headers, body: JSON.stringify(completionBody(model, {
          stream: false,
          max_tokens: 256,
          response_format: { type: 'json_schema', json_schema: { name: 'one_value', strict: true, schema: { type: 'object', properties: { answer: { type: 'string' } }, required: ['answer'], additionalProperties: false } } },
        })),
      }, Math.min(timeoutMs, 15_000));
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      const json = parseJson(response.body);
      JSON.parse(json?.choices?.[0]?.message?.content ?? '');
      if (json?.choices?.[0]?.finish_reason === 'length') throw new Error('complete JSON ended by length rather than schema completion');
      return { httpStatus: response.status, durationMs: response.durationMs, finishReason: json.choices[0].finish_reason };
    }, 'known-upstream');
  }

  const unexpectedFailures = cases.filter((entry) => entry.status === 'fail');
  return {
    schema: 1,
    generatedAt: new Date().toISOString(),
    target: { baseURL, model, authExpected: Boolean(options.expectAuth) },
    summary: {
      pass: cases.filter((entry) => entry.status === 'pass').length,
      fail: unexpectedFailures.length,
      skip: cases.filter((entry) => entry.status === 'skip').length,
      knownUpstreamFailure: cases.filter((entry) => entry.status === 'known-upstream-failure').length,
    },
    ok: unexpectedFailures.length === 0,
    cases,
  };
}

function parseArgs(argv) {
  const options = { timeoutMs: 15_000 };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--expect-auth') options.expectAuth = true;
    else if (arg === '--include-known-failures') options.includeKnownFailures = true;
    else if (['--base-url', '--model', '--api-key', '--timeout-ms'].includes(arg)) {
      const value = argv[++index];
      if (!value) throw new TypeError(`${arg} requires a value`);
      if (arg === '--base-url') options.baseURL = value;
      else if (arg === '--model') options.model = value;
      else if (arg === '--api-key') options.apiKey = value;
      else options.timeoutMs = Number(value);
    } else throw new TypeError(`unknown option: ${arg}`);
  }
  if (!options.baseURL || !options.model)
    throw new TypeError('usage: qvac-conformance --base-url URL --model ID [--api-key KEY] [--expect-auth] [--include-known-failures]');
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await runQvacConformance(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    process.exitCode = result.ok ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    process.exitCode = 2;
  }
}
