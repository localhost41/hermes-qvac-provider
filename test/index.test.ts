import { describe, expect, it } from "vitest";
import {
  DEFAULT_QVAC_API_KEY,
  DEFAULT_QVAC_MODEL,
  DEFAULT_QVAC_OPENAI_BASE_URL,
  createHermesQvacProvider,
  createQvacOpenAIConfig,
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
      openai: {
        baseURL: DEFAULT_QVAC_OPENAI_BASE_URL,
        apiKey: DEFAULT_QVAC_API_KEY,
      },
    });
  });

  it("exports a ready-to-use default provider", () => {
    expect(hermesQvacProvider).toEqual(createHermesQvacProvider());
  });
});
