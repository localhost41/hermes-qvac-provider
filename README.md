# hermes-qvac-provider

Hermes Agent model-provider plugin for local QVAC models.

This plugin registers provider id `qvac` and points Hermes at QVAC's local
OpenAI-compatible endpoint:

```text
http://127.0.0.1:11434/v1
```

It follows the practical defaults used by Tether's `@qvac/openclaw-plugin`, but
targets Hermes Agent's Python model-provider plugin system.

## v0.2 Scope

This alpha release provides a working Hermes provider entry for QVAC. It does
not manage the QVAC server lifecycle yet. Run QVAC in one terminal and Hermes
in another.

The current Hermes model-provider plugin surface is a declarative
`ProviderProfile`. It supports provider request/catalog hooks such as message
preparation, API kwargs, and model fetching, but it does not expose a clean
provider-local service lifecycle hook for starting and stopping a local server.
Hermes' general plugin lifecycle hooks are not used for model-provider plugins,
so this package keeps manual QVAC startup as the supported path.

## Defaults

- Provider id: `qvac`
- Aliases: `local-qvac`, `qvac-local`
- API mode: `chat_completions`
- Auth type: `api_key`
- Base URL: `http://127.0.0.1:11434/v1`
- Health check: `http://127.0.0.1:11434/v1/models`
- Recommended model: `qwen3.5-9b`
- Default aux model: `qwen3.5-2b`
- Context window: `32768`
- Max tokens: `8192`
- Cost: zero-cost local models

Friendly model IDs:

- `qwen3.5-0.8b`
- `qwen3.5-2b`
- `qwen3.5-4b`
- `qwen3.5-9b`
- `qwen3.6-27b`
- `qwen3.6-35b-a3b`
- `gpt-oss-20b`
- `gemma4-31b`

`qwen3.5-9b` is recommended for agent workflows. Smaller models can be useful
for direct prompts and fast local checks, but they are usually weaker for full
agent harnesses with tool use, planning, and multi-step edits.

## Install

From this repository:

```bash
./scripts/install.sh
```

By default the installer symlinks this repository into:

```text
$HERMES_HOME/plugins/model-providers/qvac/
```

If `HERMES_HOME` is unset, it defaults to:

```text
~/.hermes/plugins/model-providers/qvac/
```

To copy files instead of symlinking:

```bash
./scripts/install.sh --copy
```

## Run QVAC Server

Start QVAC's OpenAI-compatible local server:

```bash
./scripts/start-qvac.sh
```

This runs:

```bash
qvac serve openai --host 127.0.0.1 --port 11434
```

Leave that terminal running while Hermes uses the provider.

## Managed Lifecycle

Managed startup is intentionally disabled because Hermes currently exposes no
clean provider-local service lifecycle hook for model providers.

The intended command remains:

```bash
qvac serve openai --host 127.0.0.1 --port 11434
```

The plugin metadata keeps the lifecycle-related defaults for future
compatibility:

- `qvacCommand`: `qvac serve openai`
- `cwd`: empty string
- `readyTimeoutMs`: `30000`
- `idleStopMs`: `0`
- `timeoutSeconds`: `120`
- Health check path: `/v1/models`

Because managed lifecycle is not active, the provider does not install QVAC,
spawn QVAC, stop QVAC, or kill any existing process.

## Configure Hermes

Hermes should discover the plugin from:

```text
$HERMES_HOME/plugins/model-providers/qvac/
```

The provider module exposes `PROVIDER_PROFILE` and `register()` from
`qvac_provider`.

If Hermes requires an API key environment variable even for local providers, set
a harmless local placeholder:

```bash
export QVAC_API_KEY=custom-local
```

Override the base URL if you run QVAC somewhere else:

```bash
export QVAC_BASE_URL=http://127.0.0.1:11434/v1
```

Then select provider `qvac` and model `qwen3.5-9b` in Hermes.

## Smoke Test

Run the doctor script:

```bash
./scripts/doctor.sh
```

It checks:

- `hermes` is installed
- `qvac` is installed
- `qvac --version` works
- `http://127.0.0.1:11434/v1/models` responds
- Hermes can list or use provider `qvac` with known provider-list commands

You can also directly check the health endpoint:

```bash
curl -fsS http://127.0.0.1:11434/v1/models
```

## Troubleshooting

- `qvac: command not found`: Install QVAC and confirm `qvac --version` works.
- `/v1/models` does not respond: Start QVAC with `./scripts/start-qvac.sh` and
  confirm it is listening on `127.0.0.1:11434`.
- Hermes asks for an API key: Run `export QVAC_API_KEY=custom-local`. Local QVAC
  may ignore the value, but some OpenAI-compatible clients require a non-empty
  key.
- Hermes does not show QVAC: Re-run `./scripts/install.sh`, confirm
  `$HERMES_HOME/plugins/model-providers/qvac/plugin.yaml` exists, then restart
  Hermes.
- Model calls fail: Confirm the selected model is available from
  `curl -fsS http://127.0.0.1:11434/v1/models`. Start with `qwen3.5-9b`.
- Agent workflows are weak or unreliable: Use `qwen3.5-9b` or larger. Smaller
  models may be fine for direct prompts but weaker in full agent harnesses.

## Development

```bash
pnpm install
pnpm lint
pnpm test
pnpm build
python3 -m unittest discover -s tests -p 'test_*.py'
```

## Alpha Release Readiness

- Package version: `0.1.0-alpha.1`
- Plugin metadata version: `0.1.0-alpha.1`
- Packaged assets include `dist`, `docs`, `examples`, `qvac_provider`, `scripts`,
  `plugin.yaml`, `README.md`, and `CHANGELOG.md`.
- Verify the package contents without publishing:

```bash
npm pack --dry-run
```

This repository does not publish a stable release as part of alpha prep.
