export const DEFAULT_QVAC_OPENAI_BASE_URL = "http://localhost:8000/v1";
export const DEFAULT_QVAC_API_KEY = "qvac-local";
export const DEFAULT_QVAC_MODEL = "qvac-default";

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
