# hermes-qvac-provider

A community Hermes Agent provider and lifecycle CLI for private, on-device QVAC models.

> Independent project maintained by localhost41. Not affiliated with or endorsed by Tether, QVAC, or Hermes Agent.

The Python plugin makes `qvac` a real Hermes model provider. The `hermes-qvac` CLI adds the lifecycle surface Hermes model-provider plugins do not currently have. It deliberately reuses the official QVAC catalog, config synthesizer, and managed supervisor rather than maintaining a parallel runtime.

## Requirements

- Node 20–26
- Hermes Agent available as `hermes` (fully verified with 0.18.2)
- Python 3.11–3.13 (normally supplied by Hermes)
- Enough RAM and disk for the selected local model

The npm package includes the official `@qvac/cli`. A separate global `qvac` installation is not required unless you select one with `--bin`.

## Install

After installing the package:

```bash
npm install -g @localhost41/hermes-qvac-provider@alpha
hermes-qvac setup
hermes-qvac doctor
```

`setup` atomically copies the minimal Python assets into `$HERMES_HOME/plugins/model-providers/qvac` and enables the plugin through Hermes. It supports upgrades from owned and recognized earlier alpha installations, refuses unrelated directories, and never downloads a model.

From this checkout:

```bash
pnpm install
pnpm build
node dist/cli.js setup
```

## First run

```bash
hermes-qvac run --model qwen3.5-9b -- --cli
```

The CLI asks the official QVAC managed provider to:

1. map every friendly catalog ID to its SDK model constant;
2. generate a private `qvac.config.json`;
3. preload the main `qwen3.5-9b` and auxiliary `qwen3.5-2b` models;
4. expose the remaining catalog entries for lazy loading;
5. choose a free loopback port, start QVAC, and wait for model readiness;
6. launch Hermes with the resolved endpoint; and
7. detach safely when Hermes exits or receives a signal.

Compatible sessions can share the official managed QVAC fleet. The CLI never kills a process merely because it occupies a port.

## Commands

```text
hermes-qvac setup [configuration options]
hermes-qvac config show [--json]
hermes-qvac config set [configuration options]
hermes-qvac config reset
hermes-qvac config path
hermes-qvac config validate [configuration options] [--json]
hermes-qvac doctor [configuration options] [--json]
hermes-qvac models [list] [--json]
hermes-qvac models info MODEL [--json]
hermes-qvac run [configuration options] -- [Hermes arguments]
hermes-qvac serve [configuration options]
hermes-qvac status [--json]
hermes-qvac stop [--json]
hermes-qvac smoke --transport-only
hermes-qvac smoke --model ID --yes
hermes-qvac uninstall
hermes-qvac version
```

- `run` holds QVAC while a child Hermes process runs.
- `serve` holds QVAC in the foreground for separately launched clients.
- `status` reports every managed CLI session in the active `HERMES_HOME` and checks the live endpoint.
- `stop` sends an authenticated shutdown request only to recorded `hermes-qvac` CLI owners. It never signals a recorded PID or kills QVAC directly; the official supervisor preserves a serve used by another application.
- `config validate` resolves and validates configuration without writing anything.
- `models info` reports the official SDK constant, modality, size metadata, and default status.
- `uninstall` verifies ownership before disabling or removing the plugin. Saved configuration remains until `config reset`.

CLI-owned exit codes are `0` success, `2` invalid usage/configuration, `3` unavailable dependencies/endpoints/health, and `4` execution or internal failure. `run` propagates a launched Hermes process's exit code. `--json` returns one compact JSON object for finite commands. Managed `serve` and physical smoke emit newline-delimited event objects (`event: "ready"`, then `"stopping"` or `"result"`); managed `run` emits its ready event and then deliberately attaches Hermes' own standard streams. Non-placeholder API keys are redacted.

See [configuration.md](docs/configuration.md) for every CLI option and environment variable. Precedence is CLI, environment, saved configuration, defaults.

## Defaults

- Main model: `qwen3.5-9b`
- Auxiliary model: `qwen3.5-2b`
- Context: 32768 tokens
- Maximum output: 8192 tokens
- Reasoning budget: `-1` (enabled)
- QVAC tool-call formatting: enabled
- Bind: `127.0.0.1`, automatic free port
- Startup timeout: 180 seconds
- Hermes request timeout: 300 seconds
- API marker: `custom-local`

Run `hermes-qvac models` for the authoritative model list and SDK mappings. The list comes directly from `@qvac/ai-sdk-provider/models`.

## Existing QVAC endpoint

To use a server you already manage:

```bash
QVAC_BASE_URL=http://127.0.0.1:19000/v1 \
  hermes-qvac run --external --model qwen3.5-9b -- --cli
```

The CLI authenticates the `/models` probe when an API key is configured and refuses to launch Hermes unless the endpoint advertises the selected model.

## Smoke tests

The safe transport test creates an isolated `HERMES_HOME`, installs and enables the packaged profile there, starts an OpenAI-compatible streaming fixture, and invokes the real local Hermes executable:

```bash
hermes-qvac smoke --transport-only
```

Success requires the exact visible response `pong`. This proves real plugin discovery, real `ProviderProfile` loading, base-URL injection, chat-completions streaming, and Hermes response handling without starting QVAC or downloading a model.

Physical inference is opt-in because a cold QVAC model can require a multi-gigabyte download. The CLI derives the estimate from official SDK metadata and includes both preloaded models in its consent error. At the current catalog sizes, the smallest example below is approximately 1.69 GiB of model payload (`0.8b` main plus `2b` auxiliary); the defaults total approximately 6.48 GiB. A cold run can transfer up to that payload and needs at least comparable free disk and RAM plus cache, context, and runtime overhead. Startup may take minutes depending on hardware and network speed:

```bash
hermes-qvac smoke --model qwen3.5-0.8b --yes
```

The physical test starts managed QVAC, waits for model readiness, invokes real Hermes, and requires exact `pong`. No model download occurs during setup, doctor, models, config, package verification, or transport-only smoke.

## Doctor and troubleshooting

`hermes-qvac doctor` verifies:

- the Hermes command and version;
- plugin files and enabled state;
- loading as Hermes' real `ProviderProfile`, including the effective endpoint and vision flag;
- the bundled or configured QVAC executable;
- saved configuration and official catalog membership for main and auxiliary models; and
- endpoint reachability and selected-model advertisement.

An offline endpoint is an expected warning in managed mode because QVAC starts on demand. It is an error when `QVAC_BASE_URL` selects external mode.

Common fixes:

- Plugin missing or disabled: run `hermes-qvac setup` under the same `HERMES_HOME` as Hermes.
- Pinned port occupied: omit `--port` for automatic allocation or stop the process you own.
- Custom working directory: combine `--cwd PATH --no-reuse`; upstream fleet identity does not include cwd.
- Model absent from an external endpoint: configure the endpoint with the same friendly alias returned by `hermes-qvac models`.
- Cold startup timeout: increase `--ready-timeout-ms`; downloads can take minutes.
- Weak agent behavior: use the default 9B model or a larger catalog model and keep tools/context enabled.

## Development

```bash
pnpm install
pnpm lint
pnpm test
pnpm test:python
pnpm smoke:transport
pnpm verify:hermes
pnpm verify:package
```

The test suite covers full generated QVAC configuration, main/aux preload, lifecycle readiness and cleanup, port conflicts, multiple owned-session records, status/stop, Hermes arguments and environment, signal forwarding, safe plugin ownership, real-Hermes isolated transport, and an installed npm tarball.

Engineering evidence:

- [architecture](docs/architecture-notes.md)
- [OpenClaw parity matrix](docs/openclaw-parity.md)
- [requirements traceability](docs/requirements-traceability.md)
- [threat and failure model](docs/threat-model.md)
- [test inventory](docs/test-inventory.md)
- [compatibility](docs/compatibility.md)
- [security and privacy](docs/security.md)
- [contributing](CONTRIBUTING.md)

Legacy `scripts/install.sh`, `scripts/doctor.sh`, and `scripts/start-qvac.sh` remain as thin compatibility wrappers around the authoritative CLI; they no longer implement a separate manual lifecycle.
