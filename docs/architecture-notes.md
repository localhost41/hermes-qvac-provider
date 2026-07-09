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

v0.1 does not implement managed lifecycle. Users should run:

```bash
./scripts/start-qvac.sh
```

in one terminal and run Hermes in another. Managed lifecycle should be added in
v0.2 only if Hermes exposes a clean hook for starting and stopping
provider-local services.
