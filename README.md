# hermes-qvac-provider

Minimal TypeScript provider package for connecting Hermes to a local QVAC
OpenAI-compatible endpoint.

## Defaults

- Endpoint: `http://localhost:8000/v1`
- API key: `qvac-local`
- Default model: `qvac-default`

The API key is a local development placeholder for OpenAI-compatible clients
that require a value. Local QVAC servers may ignore it.

## Usage

```ts
import {
  createHermesQvacProvider,
  hermesQvacProvider,
} from "@localhostlabs/hermes-qvac-provider";

const provider = hermesQvacProvider;

const customProvider = createHermesQvacProvider({
  baseURL: "http://127.0.0.1:8000/v1",
  apiKey: "local-dev-key",
  model: "qvac-local-model",
});
```

`createHermesQvacProvider()` returns a small provider descriptor with an
`openai` config block that can be passed to Hermes integration code expecting an
OpenAI-compatible provider.

## Local development

```bash
pnpm install
pnpm test
pnpm build
```
