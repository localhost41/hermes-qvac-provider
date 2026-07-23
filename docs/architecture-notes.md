# Architecture

## Host boundary

Hermes model-provider plugins are declarative Python `ProviderProfile` objects. They can describe identity, authentication, endpoints, models, vision support, request hooks, and token defaults, but Hermes 0.18.2 has no provider-local process lifecycle hook comparable to OpenClaw `localService`.

The integration therefore has two deliberately small layers:

1. `qvac_provider/__init__.py` registers the real Hermes `ProviderProfile`. It reads `QVAC_BASE_URL` when Hermes imports it, advertises the friendly catalog as a fallback, sets the auxiliary model, and declares the OpenAI chat-completions and vision capabilities Hermes understands.
2. `hermes-qvac` owns setup and command orchestration outside the plugin hook. It starts the official QVAC managed provider, then launches Hermes with a process-scoped endpoint and API timeout.

The CLI does not implement its own QVAC supervisor. `@qvac/ai-sdk-provider` owns config synthesis, free-port selection, model readiness, compatible fleet reuse, crash recovery, consumer tracking, and serve cleanup. This keeps lifecycle semantics aligned with official QVAC integrations.

## Model and configuration flow

```text
official @qvac/ai-sdk-provider/models catalog
                 │
                 ├── TypeScript descriptors and `hermes-qvac models`
                 ├── managed qvac.config.json entries
                 └── parity test against Python fallback ids

CLI options → QVAC_* environment → saved config → defaults
                 │
                 ├── validation and secret redaction
                 ├── official managed QVAC provider
                 └── child-only QVAC_BASE_URL / QVAC_API_KEY / HERMES_API_TIMEOUT
                                      │
                                      └── real Hermes ProviderProfile
```

Every official catalog entry is emitted into the managed serve config. The main and auxiliary models preload; the main model is the serve default; other models remain lazy. Each entry receives `ctx_size`, `reasoning_budget`, and `tools`.

The Python fallback list is necessarily packaged as Python data because Hermes cannot import a Node module. A cross-runtime test compares its exact ordered list to the official Node catalog so drift fails CI.

## Process ownership

Managed sessions write mode-`0600` records under `$HERMES_HOME/hermes-qvac/sessions/<cli-pid>.json`. Multiple CLI processes can share the upstream QVAC fleet while retaining separate ownership records.

- `status` reports those sessions and probes the active endpoint.
- `stop` sends an authenticated loopback shutdown request using a random per-session token. The owning CLI signals itself; `stop` never signals a PID directly, so stale state and PID reuse cannot terminate an unrelated process.
- `run` forwards `SIGINT` and `SIGTERM` to Hermes, propagates the Hermes exit code, removes its state, and detaches its upstream consumer in `finally`.
- `serve` holds a managed consumer in the foreground until signaled.
- The upstream supervisor stops a serve only when all consumers have detached, according to `idleStopMs`.

A pinned port is preflighted with a loopback bind. A collision fails before QVAC starts and never signals the occupant. This remains subject to the normal bind-close-spawn race; QVAC startup still reports a later collision safely.

Session files must be bounded regular files with a filename matching the positive CLI PID, a valid managed loopback URL, valid timestamps/ports, and a 256-bit hexadecimal token. Corrupt and symbolic state entries are isolated and reported rather than preventing healthy sessions from being inspected or stopped. The control server exposes only authenticated health and stop operations.

## Installation safety

`setup` holds a private bounded-wait installation lock, recovers locks whose recorded process is dead, stages the three Hermes runtime assets beside the destination, and atomically renames them into place. It retains the previous owned installation until Hermes enablement succeeds, then commits; enable failure restores both the prior plugin and saved configuration. A recognized backup left by an interrupted rename is recovered on the next setup, but is preserved with an error if an unrelated target appeared meanwhile. Only exact core-file hashes from published pre-marker alpha installations can migrate; unrelated or symbolic directories are refused. The ownership marker is a bounded regular file with schema, package and plugin identity plus SHA-256 digests for every installed runtime asset. Removal re-hashes regular, non-symlink payloads and rejects unexpected entries; a package-name-only marker, modified payload, or extra user file is not deletion authority.

`uninstall` verifies the ownership marker before disabling or deleting anything. Saved configuration is deliberately preserved and can be removed separately with `hermes-qvac config reset`.

## Security properties

- Managed QVAC binds only to `127.0.0.1` or `localhost`; wildcard and remote bind hosts are rejected.
- External base URLs must use HTTP(S), end in `/v1`, and contain no query or fragment.
- Non-placeholder API keys are redacted from command output and diagnostics.
- Configuration and session files are written with mode `0600`; parent directories use mode `0700` when created.
- Endpoint probes use bounded timeouts and the configured Bearer marker.
- Endpoint catalog bodies are capped at one MiB, model count at 10,000, and IDs at 200 characters.
- Captured Hermes output is capped at two MiB and scrubbed for the effective API marker; captured smoke processes have a wall-clock bound and terminate the detached Hermes process group, escalating from `SIGTERM` to `SIGKILL` if a process refuses shutdown. Interactive runs also forward signals to the group and escalate after a grace period.
- No setup or diagnostic command downloads a model.

## Known host limitations

- Hermes has no native provider setup wizard, plugin configuration schema, synthetic-auth callback, or provider-local lifecycle hook. The companion CLI is the equivalent supported surface.
- Hermes exposes provider-wide `supports_vision`, not OpenClaw's per-model input modality rows. QVAC is marked vision-capable because seven of the eight catalog entries are multimodal; Hermes cannot express that `gpt-oss-20b` is text-only in the profile.
- A real physical inference smoke may require a multi-gigabyte model download and is intentionally opt-in.
