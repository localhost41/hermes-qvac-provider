import { describe, expect, it } from "vitest";
import {
  DEFAULT_QVAC_API_KEY,
  DEFAULT_QVAC_MODEL,
  DEFAULT_QVAC_MODEL_CATALOG,
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
    expect(createHermesQvacProvider({ streaming: false }).capabilities).toEqual({
      streaming: false,
    });
  });

  it("exports a ready-to-use default provider", () => {
    expect(hermesQvacProvider).toEqual(createHermesQvacProvider());
  });
});

describe("detectQvacServer", () => {
  it("reports the configured QVAC server reachable when it responds", async () => {
    const fetchMock = async () => new Response("{}", { status: 404 });

    await expect(
      detectQvacServer({
        baseURL: "http://127.0.0.1:8000/v1",
        fetch: fetchMock,
      }),
    ).resolves.toEqual({
      reachable: true,
      baseURL: "http://127.0.0.1:8000/v1",
      status: 404,
    });
  });

  it("reports a clear message when the QVAC server cannot be reached", async () => {
    const failure = new Error("connect ECONNREFUSED");
    const fetchMock = async () => {
      throw failure;
    };

    await expect(
      detectQvacServer({
        baseURL: "http://127.0.0.1:8000/v1",
        fetch: fetchMock,
      }),
    ).resolves.toEqual({
      reachable: false,
      baseURL: "http://127.0.0.1:8000/v1",
      errorMessage:
        "QVAC local server is not reachable at http://127.0.0.1:8000/v1. Start the QVAC local server, or pass a different baseURL if it is running elsewhere. This package does not install or start QVAC automatically.",
      cause: failure,
    });
  });

  it("throws the reachability message from assertQvacServerReachable", async () => {
    const fetchMock = async () => {
      throw new Error("connect ECONNREFUSED");
    };

    await expect(
      assertQvacServerReachable({
        baseURL: "http://127.0.0.1:8000/v1",
        fetch: fetchMock,
      }),
    ).rejects.toThrow(createQvacServerUnavailableMessage("http://127.0.0.1:8000/v1"));
  });
});
