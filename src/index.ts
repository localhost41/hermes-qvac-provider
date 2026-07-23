import { allModels, qvacCatalog } from "@qvac/ai-sdk-provider/models";
import { endpointModels } from "./runtime.js";

export const DEFAULT_QVAC_OPENAI_BASE_URL = "http://127.0.0.1:11434/v1";
export const DEFAULT_QVAC_MODELS_URL = "http://127.0.0.1:11434/v1/models";
export const DEFAULT_QVAC_API_KEY = "custom-local";
export const DEFAULT_QVAC_MODEL = "qwen3.5-9b";
export const DEFAULT_QVAC_SERVER_TIMEOUT_MS = 2_000;
export {
  doctor,
  endpointModels,
  installPlugin,
  listModels,
  setupPlugin,
  startManaged,
  uninstallOwnedPlugin,
  uninstallPlugin,
} from "./runtime.js";
export {
  DEFAULT_CONFIG,
  configPath,
  publicConfig,
  readSavedConfig,
  redactSecretText,
  redactSecrets,
  resetConfig,
  resolveConfig,
  saveConfig,
  validateConfig,
} from "./config.js";
export type { ConfigOverrides, HermesQvacConfig } from "./config.js";

export type HermesQvacProviderProtocol = "openai-compatible";

export interface HermesQvacModelCatalogEntry {
  id: string;
  name: string;
  description: string;
  contextWindowTokens?: number;
  input?: readonly ("text" | "image")[];
  downloadBytes?: number;
  cost?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
}

export const DEFAULT_QVAC_MODEL_CATALOG: readonly HermesQvacModelCatalogEntry[] =
  Object.freeze(
    qvacCatalog.map((entry) =>
      Object.freeze({
        id: entry.id,
        name: entry.name,
        description:
          entry.id === DEFAULT_QVAC_MODEL
            ? "Recommended local QVAC model for Hermes agent workflows."
            : "Local model from the official QVAC catalog.",
        contextWindowTokens: 32768,
        input: Object.freeze(
          entry.constant.includes("MULTIMODAL")
            ? (["text", "image"] as const)
            : (["text"] as const),
        ),
        downloadBytes: allModels.find((model) => model.name === entry.constant)
          ?.expectedSize,
        cost: Object.freeze({
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
        }),
      }),
    ),
  );

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
  /** Optional Bearer marker for authenticated endpoints. */
  apiKey?: string;
  /** Require this model to be advertised by the endpoint. */
  model?: string;
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
  const models = (options.models ?? DEFAULT_QVAC_MODEL_CATALOG).map(
    (model) => ({
      ...model,
      ...(model.input ? { input: [...model.input] } : {}),
      ...(model.cost ? { cost: { ...model.cost } } : {}),
    }),
  );

  return {
    id: "qvac",
    name: "QVAC Local",
    protocol: "openai-compatible",
    defaultModel:
      options.model ??
      (options.models ? models[0]?.id : DEFAULT_QVAC_MODEL) ??
      DEFAULT_QVAC_MODEL,
    models,
    capabilities: {
      streaming: options.streaming ?? true,
    },
    openai: createQvacOpenAIConfig(options),
  };
}

export const hermesQvacProvider = createHermesQvacProvider();

export function createQvacServerUnavailableMessage(baseURL: string): string {
  return `QVAC is not healthy at ${baseURL}. Use 'hermes-qvac doctor' for diagnostics, 'hermes-qvac run' for managed QVAC, or configure a healthy external base URL.`;
}

export async function detectQvacServer(
  options: QvacServerDetectionOptions = {},
): Promise<QvacServerDetectionResult> {
  const baseURL = options.baseURL ?? DEFAULT_QVAC_OPENAI_BASE_URL;
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

  try {
    const models = await endpointModels(
      baseURL,
      timeoutMs,
      options.apiKey,
      fetchImpl,
    );
    if (options.model && !models.includes(options.model))
      throw new Error(`endpoint does not advertise model '${options.model}'`);

    return {
      reachable: true,
      baseURL,
      status: 200,
    };
  } catch (cause) {
    return {
      reachable: false,
      baseURL,
      errorMessage: createQvacServerUnavailableMessage(baseURL),
      cause,
    };
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
