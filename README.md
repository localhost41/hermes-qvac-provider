# hermes-qvac-provider

Minimal TypeScript provider package for connecting Hermes to a local QVAC
OpenAI-compatible endpoint.

## Defaults

- Endpoint: `http://localhost:8000/v1`
- API key: `qvac-local`
- Default model: `qvac-default`
- Model catalog:
  - `qvac-default`: general-purpose local development model
  - `qvac-small`: lightweight local model for fast iteration
  - `qvac-coder`: code-oriented local model for developer workflows

The API key is a local development placeholder for OpenAI-compatible clients
that require a value. Local QVAC servers may ignore it.

The default provider exposes the model catalog on `provider.models`. If
`model` is not supplied, `createHermesQvacProvider()` uses the first catalog
entry as `defaultModel`.

## Usage

```ts
import {
  assertQvacServerReachable,
  createHermesQvacProvider,
  hermesQvacProvider,
} from "@localhostlabs/hermes-qvac-provider";

const provider = hermesQvacProvider;

await assertQvacServerReachable();

const customProvider = createHermesQvacProvider({
  baseURL: "http://127.0.0.1:8000/v1",
  apiKey: "local-dev-key",
  model: "qvac-local-model",
  models: [
    {
      id: "qvac-local-model",
      name: "QVAC Local Model",
      description: "Local QVAC model configured for this workstation.",
    },
  ],
});
```

`createHermesQvacProvider()` returns a small provider descriptor with an
`openai` config block that can be passed to Hermes integration code expecting an
OpenAI-compatible provider.

Pass `models` to replace the built-in catalog with the models available from
your QVAC server. Pass `model` when the selected default should differ from the
first catalog entry.

`assertQvacServerReachable()` checks whether the configured local QVAC endpoint
responds before integration code tries to use it. If the server is unavailable,
it throws a clear error telling the developer to start QVAC or pass a different
`baseURL`. This package does not install or start QVAC automatically.

## Local development

```bash
pnpm install
pnpm test
pnpm build
```
