export const DEFAULT_QVAC_OPENAI_BASE_URL = "http://127.0.0.1:11434/v1";
export const DEFAULT_QVAC_MODELS_URL = "http://127.0.0.1:11434/v1/models";
export const DEFAULT_QVAC_API_KEY = "custom-local";
export const DEFAULT_QVAC_MODEL = "qwen3.5-9b";
export const DEFAULT_QVAC_SERVER_TIMEOUT_MS = 2_000;

export type HermesQvacProviderProtocol = "openai-compatible";

export interface HermesQvacModelCatalogEntry {
  id: string;
  name: string;
  description: string;
  contextWindowTokens?: number;
}

export const DEFAULT_QVAC_MODEL_CATALOG: HermesQvacModelCatalogEntry[] = [
  {
    id: DEFAULT_QVAC_MODEL,
    name: "Qwen 3.5 9B",
    description: "Recommended local QVAC model for Hermes agent workflows.",
    contextWindowTokens: 32768,
  },
  {
    id: "qwen3.5-4b",
    name: "Qwen 3.5 4B",
    description: "Smaller local QVAC model for direct prompts and lighter workflows.",
    contextWindowTokens: 32768,
  },
  {
    id: "qwen3.5-2b",
    name: "Qwen 3.5 2B",
    description: "Fast local QVAC model for lightweight prompts.",
    contextWindowTokens: 32768,
  },
  {
    id: "qwen3.5-0.8b",
    name: "Qwen 3.5 0.8B",
    description: "Smallest friendly local QVAC model option.",
    contextWindowTokens: 32768,
  },
  {
    id: "qwen3.6-27b",
    name: "Qwen 3.6 27B",
    description: "Larger local QVAC model option for higher-quality responses.",
    contextWindowTokens: 32768,
  },
  {
    id: "qwen3.6-35b-a3b",
    name: "Qwen 3.6 35B A3B",
    description: "Large local QVAC model option.",
    contextWindowTokens: 32768,
  },
  {
    id: "gpt-oss-20b",
    name: "GPT OSS 20B",
    description: "Local GPT OSS model exposed by QVAC.",
    contextWindowTokens: 32768,
  },
  {
    id: "gemma4-31b",
    name: "Gemma 4 31B",
    description: "Local Gemma model exposed by QVAC.",
    contextWindowTokens: 32768,
  },
];

export interface HermesQvacProviderOptions {
  /**
   * OpenAI-compatible QVAC endpoint. Defaults to a local development server.
   */
  baseURL?: string;
  /**
   * API key passed to OpenAI-compatible clients. Local QVAC servers may ignore it.
   */
  apiKey?: string;
  /**
   * Default model identifier Hermes should request from QVAC.
   */
  model?: string;
  /**
   * Curated models Hermes should present for this QVAC provider. Defaults to the
   * built-in local development catalog.
   */
  models?: readonly HermesQvacModelCatalogEntry[];
  /**
   * Optional headers forwarded to the underlying OpenAI-compatible client.
   */
  headers?: Record<string, string>;
  /**
   * Whether Hermes should treat this provider as streaming-capable. Defaults to
   * true because the QVAC provider uses an OpenAI-compatible path.
   */
  streaming?: boolean;
}

export interface HermesQvacOpenAIConfig {
  baseURL: string;
  apiKey: string;
  defaultHeaders?: Record<string, string>;
}

export interface HermesQvacProviderCapabilities {
  /**
   * QVAC is exposed through an OpenAI-compatible provider path, where streaming
   * is requested by Hermes with the standard stream option.
   */
  streaming: boolean;
}

export interface HermesQvacProvider {
  id: "qvac";
  name: "QVAC Local";
  protocol: HermesQvacProviderProtocol;
  defaultModel: string;
  models: HermesQvacModelCatalogEntry[];
  capabilities: HermesQvacProviderCapabilities;
  openai: HermesQvacOpenAIConfig;
}

export interface QvacServerDetectionOptions {
  /**
   * OpenAI-compatible QVAC endpoint to probe. Defaults to the local development server.
   */
  baseURL?: string;
  /**
   * Maximum time to wait for the server to respond before reporting it unreachable.
   */
  timeoutMs?: number;
  /**
   * Optional fetch implementation for runtimes or tests that need to inject one.
   */
  fetch?: typeof fetch;
}

export type QvacServerDetectionResult =
  | {
      reachable: true;
      baseURL: string;
      status: number;
    }
  | {
      reachable: false;
      baseURL: string;
      errorMessage: string;
      cause: unknown;
    };

export function createQvacOpenAIConfig(
  options: HermesQvacProviderOptions = {},
): HermesQvacOpenAIConfig {
  const config: HermesQvacOpenAIConfig = {
    baseURL: options.baseURL ?? DEFAULT_QVAC_OPENAI_BASE_URL,
    apiKey: options.apiKey ?? DEFAULT_QVAC_API_KEY,
  };

  if (options.headers && Object.keys(options.headers).length > 0) {
    config.defaultHeaders = { ...options.headers };
  }

  return config;
}

export function createHermesQvacProvider(
  options: HermesQvacProviderOptions = {},
): HermesQvacProvider {
  const models = (options.models ?? DEFAULT_QVAC_MODEL_CATALOG).map((model) => ({
    ...model,
  }));

  return {
    id: "qvac",
    name: "QVAC Local",
    protocol: "openai-compatible",
    defaultModel: options.model ?? models[0]?.id ?? DEFAULT_QVAC_MODEL,
    models,
    capabilities: {
      streaming: options.streaming ?? true,
    },
    openai: createQvacOpenAIConfig(options),
  };
}

export const hermesQvacProvider = createHermesQvacProvider();

export function createQvacServerUnavailableMessage(baseURL: string): string {
  return `QVAC local server is not reachable at ${baseURL}. Start the QVAC local server, or pass a different baseURL if it is running elsewhere. This package does not install or start QVAC automatically.`;
}

export async function detectQvacServer(
  options: QvacServerDetectionOptions = {},
): Promise<QvacServerDetectionResult> {
  const baseURL = options.baseURL ?? DEFAULT_QVAC_OPENAI_BASE_URL;
  const modelsURL = `${baseURL.replace(/\/$/, "")}/models`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_QVAC_SERVER_TIMEOUT_MS;
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (!fetchImpl) {
    return {
      reachable: false,
      baseURL,
      errorMessage: `${createQvacServerUnavailableMessage(baseURL)} No fetch implementation is available in this runtime.`,
      cause: new Error("fetch is not available"),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(modelsURL, {
      method: "GET",
      headers: { accept: "application/json" },
      signal: controller.signal,
    });

    return {
      reachable: true,
      baseURL,
      status: response.status,
    };
  } catch (cause) {
    return {
      reachable: false,
      baseURL,
      errorMessage: createQvacServerUnavailableMessage(baseURL),
      cause,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function assertQvacServerReachable(
  options: QvacServerDetectionOptions = {},
): Promise<void> {
  const result = await detectQvacServer(options);

  if (!result.reachable) {
    throw new Error(result.errorMessage, { cause: result.cause });
  }
}
