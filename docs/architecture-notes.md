# Hermes Provider Architecture - QVAC Integration Path

## Summary

The v0.1 integration should be a Hermes Agent Python model-provider plugin, not
a generic npm provider package. The plugin registers a static provider profile
named `qvac` and points Hermes to QVAC's local OpenAI-compatible server.

This follows the practical defaults from Tether's `@qvac/openclaw-plugin` while
adapting the packaging and registration surface to Hermes:

- Provider id: `qvac`
- API mode: `chat_completions`
- Base URL: `http://127.0.0.1:11434/v1`
- Health check: `http://127.0.0.1:11434/v1/models`
- Server command: `qvac serve openai --host 127.0.0.1 --port 11434`
- Recommended default model: `qwen3.5-9b`

## Plugin Shape

The repository now exposes the Hermes plugin at:

```text
plugin.yaml
qvac_provider/__init__.py
scripts/install.sh
scripts/doctor.sh
scripts/start-qvac.sh
tests/test_provider_profile.py
```

`qvac_provider.PROVIDER_PROFILE` is the registration object. It uses Hermes'
`ProviderProfile` class when that import is available, and a local dataclass
fallback when running tests outside Hermes.

The profile fields are:

- `name: qvac`
- `aliases: local-qvac, qvac-local`
- `display_name: QVAC`
- `description: Local-first QVAC models via qvac serve openai`
- `api_mode: chat_completions`
- `auth_type: api_key`
- `base_url: http://127.0.0.1:11434/v1`
- `models_url: http://127.0.0.1:11434/v1/models`
- `env_vars: QVAC_API_KEY, QVAC_BASE_URL`
- `fallback_models: qwen3.5-9b, qwen3.5-4b, qwen3.5-2b, qwen3.5-0.8b, qwen3.6-27b, qwen3.6-35b-a3b, gpt-oss-20b, gemma4-31b`
- `default_max_tokens: 8192`
- `default_aux_model: qwen3.5-2b`

## Model Catalog

Hermes should present these friendly local model IDs:

- `qwen3.5-0.8b`
- `qwen3.5-2b`
- `qwen3.5-4b`
- `qwen3.5-9b`
- `qwen3.6-27b`
- `qwen3.6-35b-a3b`
- `gpt-oss-20b`
- `gemma4-31b`

They are treated as zero-cost local models. `qwen3.5-9b` is the recommended
default for agent workflows.

## Lifecycle Decision

v0.2 keeps manual lifecycle as the supported path. Users should run:

```bash
./scripts/start-qvac.sh
```

in one terminal and run Hermes in another.

Research against the current Hermes install showed that model-provider plugins
are discovered by `providers/__init__.py` and register declarative
`ProviderProfile` objects. `ProviderProfile` exposes request/catalog hooks such
as `prepare_messages`, `build_extra_body`, `build_api_kwargs_extras`, and
`fetch_models`. It does not expose a provider-local service hook for starting or
stopping a server.

Hermes' general plugin manager has session lifecycle hooks, but the Hermes docs
state that model-provider plugins are recorded by the general manager and not
imported there, because provider discovery is owned by `providers/__init__.py`.
Using those general hooks for QVAC would require a second plugin surface and
would not be a clean model-provider-local lifecycle contract.

The provider metadata therefore marks managed lifecycle unsupported and records
the intended future defaults only:

- Command: `qvac serve openai --host 127.0.0.1 --port 11434`
- Config keys: `qvacCommand`, `cwd`, `readyTimeoutMs`, `idleStopMs`,
  `timeoutSeconds`
- Readiness check: `/v1/models`

If Hermes later adds a provider-local service hook, managed startup can be
implemented against those defaults without changing the user-facing
configuration names.
