import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";

import { runQvacConformance } from "../scripts/qvac-conformance.mjs";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers
      .splice(0)
      .map(
        (server) =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      ),
  );
});

describe("QVAC OpenAI conformance", () => {
  it("proves authenticated external mode and negative authentication", async () => {
    const secret = "beta-external-secret";
    const server = createServer(async (request, response) => {
      if (request.headers.authorization !== `Bearer ${secret}`) {
        response.writeHead(401, { "content-type": "application/json" });
        response.end('{"error":{"message":"unauthorized"}}');
        return;
      }
      if (request.url === "/v1/models") {
        response.setHeader("content-type", "application/json");
        response.end('{"data":[{"id":"qvac-test"}]}');
        return;
      }
      if (request.url !== "/v1/chat/completions") {
        response.writeHead(404).end();
        return;
      }
      let body = "";
      for await (const chunk of request) body += chunk;
      if (body === "{not-json") {
        response.writeHead(400, { "content-type": "application/json" });
        response.end('{"error":{"message":"invalid JSON"}}');
        return;
      }
      const json = JSON.parse(body);
      if (String(json.model).startsWith("missing-")) {
        response.writeHead(404, { "content-type": "application/json" });
        response.end('{"error":{"message":"model not found"}}');
        return;
      }
      response.setHeader(
        "content-type",
        json.stream ? "text/event-stream" : "application/json",
      );
      if (json.stream) {
        response.end(
          'data: {"choices":[{"delta":{"content":"pong"},"finish_reason":null}]}\n\n' +
            'data: {"choices":[{"delta":{},"finish_reason":"stop"}],"usage":{"total_tokens":2}}\n\n' +
            "data: [DONE]\n\n",
        );
        return;
      }
      response.end(
        JSON.stringify({
          choices: [
            {
              message: { role: "assistant", content: "pong" },
              finish_reason: json.max_tokens === 1 ? "length" : "stop",
            },
          ],
          usage: { total_tokens: 2 },
        }),
      );
    });
    servers.push(server);
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("fixture did not bind");

    const result = await runQvacConformance({
      baseURL: `http://127.0.0.1:${address.port}/v1`,
      model: "qvac-test",
      apiKey: secret,
      expectAuth: true,
      timeoutMs: 2_000,
    });

    expect(result.ok).toBe(true);
    expect(result.summary).toMatchObject({ pass: 10, fail: 0 });
    expect(result.cases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "missing authentication",
          status: "pass",
          httpStatus: 401,
        }),
        expect.objectContaining({
          name: "wrong authentication",
          status: "pass",
          httpStatus: 401,
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain(secret);
  });
});
