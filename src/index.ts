export const DEFAULT_QVAC_OPENAI_BASE_URL = "http://localhost:8000/v1";
export const DEFAULT_QVAC_API_KEY = "qvac-local";
export const DEFAULT_QVAC_MODEL = "qvac-default";
export const DEFAULT_QVAC_SERVER_TIMEOUT_MS = 2_000;

export type HermesQvacProviderProtocol = "openai-compatible";

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
   * Optional headers forwarded to the underlying OpenAI-compatible client.
   */
  headers?: Record<string, string>;
}

export interface HermesQvacOpenAIConfig {
  baseURL: string;
  apiKey: string;
  defaultHeaders?: Record<string, string>;
}

export interface HermesQvacProvider {
  id: "qvac";
  name: "QVAC Local";
  protocol: HermesQvacProviderProtocol;
  defaultModel: string;
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
  return {
    id: "qvac",
    name: "QVAC Local",
    protocol: "openai-compatible",
    defaultModel: options.model ?? DEFAULT_QVAC_MODEL,
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
    const response = await fetchImpl(baseURL, {
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
