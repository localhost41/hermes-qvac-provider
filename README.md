# hermes-qvac-provider

Minimal TypeScript provider package for connecting Hermes to a local QVAC
OpenAI-compatible endpoint.

## Install

Install the provider in the Hermes integration project that will connect to
QVAC:

```bash
pnpm add @localhostlabs/hermes-qvac-provider
```

This package only provides the Hermes provider descriptor. It does not install
Hermes or start a QVAC server.

## Defaults

- Endpoint: `http://localhost:8000/v1`
- API key: `qvac-local`
- Default model: `qvac-default`
- Streaming: enabled for the OpenAI-compatible provider path
- Model catalog:
  - `qvac-default`: general-purpose local development model
  - `qvac-small`: lightweight local model for fast iteration
  - `qvac-coder`: code-oriented local model for developer workflows

The API key is a local development placeholder for OpenAI-compatible clients
that require a value. Local QVAC servers may ignore it.

The default provider exposes the model catalog on `provider.models`. If
`model` is not supplied, `createHermesQvacProvider()` uses the first catalog
entry as `defaultModel`.

The provider advertises streaming support on `provider.capabilities.streaming`.
Hermes can use that flag when its OpenAI-compatible provider path sends the
standard streaming request option to QVAC. This package does not emulate
streaming on its own; if a Hermes path or local QVAC server does not support
streaming responses, pass `streaming: false` when creating the provider.

## Configure the provider

Use the default provider when your local QVAC server exposes an
OpenAI-compatible API at `http://localhost:8000/v1`:

```ts
import {
  assertQvacServerReachable,
  createHermesQvacProvider,
  hermesQvacProvider,
} from "@localhostlabs/hermes-qvac-provider";

const provider = hermesQvacProvider;

await assertQvacServerReachable();
```

Create a custom provider when QVAC is running on a different endpoint, uses a
different local key, or exposes a different model catalog:

```ts
import { createHermesQvacProvider } from "@localhostlabs/hermes-qvac-provider";

const customProvider = createHermesQvacProvider({
  baseURL: "http://127.0.0.1:8000/v1",
  apiKey: "local-dev-key",
  model: "qvac-local-model",
  streaming: true,
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

Pass `streaming: false` for a local QVAC endpoint that is reachable but cannot
return streaming OpenAI-compatible responses.

`assertQvacServerReachable()` checks whether the configured local QVAC endpoint
responds before integration code tries to use it. If the server is unavailable,
it throws a clear error telling the developer to start QVAC or pass a different
`baseURL`. This package does not install or start QVAC automatically.

## Run QVAC locally

Start your QVAC server separately before selecting the provider in Hermes. The
server should expose an OpenAI-compatible API and accept requests at the
provider `baseURL`.

The default provider expects:

```text
http://localhost:8000/v1
```

If your QVAC server runs elsewhere, configure `baseURL` with the full
OpenAI-compatible `/v1` URL. If your local server requires an API key, pass it
with `apiKey`; otherwise the default `qvac-local` placeholder is used for
clients that require a value.

You can check reachability from integration code before wiring the provider into
Hermes:

```ts
import { assertQvacServerReachable } from "@localhostlabs/hermes-qvac-provider";

await assertQvacServerReachable({
  baseURL: "http://localhost:8000/v1",
});
```

## Select QVAC in Hermes

Register the provider descriptor with the Hermes provider list using the same
path your Hermes integration uses for other OpenAI-compatible providers, then
select `QVAC Local` from the provider picker.

Hermes should request the provider by `id: "qvac"` and send model requests to
the configured OpenAI-compatible endpoint. The default selected model is
`qvac-default`; override `model` and `models` if your local QVAC server exposes
different model identifiers.

## Demo

This repo includes a small registry example that prints a Hermes provider list
containing the QVAC provider:

```bash
pnpm demo
```

Pass `--check` to also verify that the configured local QVAC server is
reachable:

```bash
QVAC_BASE_URL=http://localhost:8000/v1 pnpm demo -- --check
```

The demo uses `QVAC_BASE_URL`, `QVAC_API_KEY`, and `QVAC_MODEL` when those
environment variables are set. It does not install or start QVAC.

## Troubleshooting

- `QVAC local server is not reachable`: Start the QVAC server, confirm it is
  listening on the configured host and port, and make sure `baseURL` includes
  the OpenAI-compatible `/v1` path.
- Connection succeeds but model calls fail: Check that the selected Hermes model
  exists in your local QVAC server and update `model` or `models` to match.
- Authentication errors: Pass the local key expected by your QVAC server with
  `apiKey`. For local servers that ignore keys, the default `qvac-local`
  placeholder is usually enough.
- Streaming fails or responses hang: Create the provider with
  `streaming: false` if your Hermes path or QVAC server does not support
  streaming OpenAI-compatible responses.
- Hermes does not show QVAC: Confirm the descriptor returned by
  `createHermesQvacProvider()` or `hermesQvacProvider` is included in the Hermes
  provider registry and that the UI is selecting provider `id: "qvac"`.

## Local development

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
```
