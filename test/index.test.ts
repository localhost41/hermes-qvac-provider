import { describe, expect, it } from "vitest";
import {
  DEFAULT_QVAC_API_KEY,
  DEFAULT_QVAC_MODEL,
  DEFAULT_QVAC_MODEL_CATALOG,
  DEFAULT_QVAC_MODELS_URL,
  DEFAULT_QVAC_OPENAI_BASE_URL,
  assertQvacServerReachable,
  createHermesQvacProvider,
  createQvacOpenAIConfig,
  createQvacServerUnavailableMessage,
  detectQvacServer,
  hermesQvacProvider,
} from "../src/index.js";

describe("createQvacOpenAIConfig", () => {
  it("defaults to the local QVAC OpenAI-compatible endpoint", () => {
    expect(createQvacOpenAIConfig()).toEqual({
      baseURL: DEFAULT_QVAC_OPENAI_BASE_URL,
      apiKey: DEFAULT_QVAC_API_KEY,
    });
  });

  it("allows endpoint, API key, and headers to be overridden", () => {
    expect(
      createQvacOpenAIConfig({
        baseURL: "http://127.0.0.1:9999/v1",
        apiKey: "local-test-key",
        headers: { "x-qvac-profile": "test" },
      }),
    ).toEqual({
      baseURL: "http://127.0.0.1:9999/v1",
      apiKey: "local-test-key",
      defaultHeaders: { "x-qvac-profile": "test" },
    });
  });
});

describe("createHermesQvacProvider", () => {
  it("exports a minimal Hermes provider descriptor", () => {
    expect(createHermesQvacProvider()).toEqual({
      id: "qvac",
      name: "QVAC Local",
      protocol: "openai-compatible",
      defaultModel: DEFAULT_QVAC_MODEL,
      models: DEFAULT_QVAC_MODEL_CATALOG,
      capabilities: {
        streaming: true,
      },
      openai: {
        baseURL: DEFAULT_QVAC_OPENAI_BASE_URL,
        apiKey: DEFAULT_QVAC_API_KEY,
      },
    });
  });

  it("allows the curated model catalog to be overridden", () => {
    const models = [
      {
        id: "custom-local",
        name: "Custom Local",
        description: "User-provided QVAC-compatible model.",
        contextWindowTokens: 8192,
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      },
    ];

    expect(createHermesQvacProvider({ models })).toEqual({
      id: "qvac",
      name: "QVAC Local",
      protocol: "openai-compatible",
      defaultModel: "custom-local",
      models,
      capabilities: {
        streaming: true,
      },
      openai: {
        baseURL: DEFAULT_QVAC_OPENAI_BASE_URL,
        apiKey: DEFAULT_QVAC_API_KEY,
      },
    });
  });

  it("allows the default model to be overridden independently from the catalog", () => {
    expect(
      createHermesQvacProvider({
        model: "custom-selected",
        models: [
          {
            id: "custom-available",
            name: "Custom Available",
            description: "A user-provided model option.",
          },
        ],
      }).defaultModel,
    ).toBe("custom-selected");
  });

  it("allows streaming support to be disabled for non-streaming QVAC paths", () => {
    expect(createHermesQvacProvider({ streaming: false }).capabilities).toEqual(
      {
        streaming: false,
      },
    );
  });

  it("exports a ready-to-use default provider", () => {
    expect(hermesQvacProvider).toEqual(createHermesQvacProvider());
  });

  it("does not share nested mutable catalog state with callers", () => {
    const provider = createHermesQvacProvider();
    (provider.models[0]!.input as ("text" | "image")[])[0] = "image";
    provider.models[0]!.cost!.input = 42;
    expect(DEFAULT_QVAC_MODEL_CATALOG[0]!.input![0]).toBe("text");
    expect(DEFAULT_QVAC_MODEL_CATALOG[0]!.cost!.input).toBe(0);
  });
});

describe("detectQvacServer", () => {
  it("reports the configured QVAC server reachable when it responds", async () => {
    const fetchMock = async () =>
      new Response('{"data":[{"id":"qwen3.5-9b"}]}', { status: 200 });

    await expect(
      detectQvacServer({
        baseURL: "http://127.0.0.1:11434/v1",
        fetch: fetchMock,
      }),
    ).resolves.toEqual({
      reachable: true,
      baseURL: "http://127.0.0.1:11434/v1",
      status: 200,
    });
  });

  it("reports a clear message when the QVAC server cannot be reached", async () => {
    const failure = new Error("connect ECONNREFUSED");
    const fetchMock = async () => {
      throw failure;
    };

    await expect(
      detectQvacServer({
        baseURL: "http://127.0.0.1:11434/v1",
        fetch: fetchMock,
      }),
    ).resolves.toEqual({
      reachable: false,
      baseURL: "http://127.0.0.1:11434/v1",
      errorMessage:
        "QVAC is not healthy at http://127.0.0.1:11434/v1. Use 'hermes-qvac doctor' for diagnostics, 'hermes-qvac run' for managed QVAC, or configure a healthy external base URL.",
      cause: failure,
    });
  });

  it("throws the reachability message from assertQvacServerReachable", async () => {
    const fetchMock = async () => {
      throw new Error("connect ECONNREFUSED");
    };

    await expect(
      assertQvacServerReachable({
        baseURL: "http://127.0.0.1:11434/v1",
        fetch: fetchMock,
      }),
    ).rejects.toThrow(
      createQvacServerUnavailableMessage("http://127.0.0.1:11434/v1"),
    );
  });

  it("uses the OpenAI-compatible models endpoint as the health check", async () => {
    let requestedURL = "";
    const fetchMock = async (url: string | URL | Request) => {
      requestedURL = String(url);
      return new Response('{"data":[{"id":"qwen3.5-9b"}]}', { status: 200 });
    };

    await detectQvacServer({ fetch: fetchMock });

    expect(DEFAULT_QVAC_MODELS_URL).toBe("http://127.0.0.1:11434/v1/models");
    expect(requestedURL).toBe(DEFAULT_QVAC_MODELS_URL);
  });

  it("authenticates probes and requires an advertised selected model", async () => {
    let authorization = "";
    let redirect: RequestRedirect | undefined;
    const fetchMock = async (
      _url: string | URL | Request,
      init?: RequestInit,
    ) => {
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      redirect = init?.redirect;
      return new Response('{"data":[{"id":"another-model"}]}', {
        status: 200,
      });
    };

    const result = await detectQvacServer({
      fetch: fetchMock,
      apiKey: "private-marker",
      model: DEFAULT_QVAC_MODEL,
    });

    expect(authorization).toBe("Bearer private-marker");
    expect(redirect).toBe("error");
    expect(result.reachable).toBe(false);
    if (!result.reachable) {
      expect(String(result.cause)).toContain(DEFAULT_QVAC_MODEL);
    }
  });
});
