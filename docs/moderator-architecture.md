# Moderator architecture map

This document identifies the ownership boundaries a QVAC or Hermes reviewer
needs to audit. The project is an independent standalone integration; it does
not modify either upstream and does not claim endorsement.

```text
npm package / hermes-qvac companion CLI
  │
  ├─ setup ──> copied, ownership-marked Python payload
  │               └─> $HERMES_HOME/plugins/model-providers/qvac
  │                         └─> real Hermes ProviderProfile discovery
  │
  └─ run/serve ──> official @qvac/ai-sdk-provider managed provider
                      ├─> official model catalog + config synthesis
                      ├─> official @qvac/cli `serve openai`
                      └─> loopback /v1/models + /v1/chat/completions
                                      ▲
                                      └─ child-only QVAC_BASE_URL,
                                         QVAC_API_KEY and timeout → Hermes
```

## Boundary and evidence map

| Boundary | Owner | Integration responsibility | Primary evidence |
| --- | --- | --- | --- |
| Plugin discovery | Hermes | Install the manifest and Python entrypoint in the documented user plugin directory; enable through the Hermes CLI | Python profile tests, packed setup test, real-Hermes transport smoke |
| Provider contract | Hermes | Instantiate the real `ProviderProfile`, filter only unsupported optional constructor fields, and expose the effective endpoint/catalog | real-profile doctor check, current-source compatibility workflow |
| Plugin lifecycle | This package | Copy atomically, identify owned payloads cryptographically, refuse unknown/symlinked targets, roll back failed enablement, and uninstall only owned content | hostile-state, interrupted-upgrade, packaged setup/uninstall tests |
| QVAC catalog | QVAC | Supply official aliases, SDK constants, modality and artifact metadata | cross-runtime catalog test and `hermes-qvac models` |
| QVAC configuration | QVAC plus this package | This package selects documented user options; the official provider synthesizes and supervises the serve configuration | generated-config and managed-lifecycle tests |
| QVAC process lifecycle | QVAC | Official managed provider owns fleet reuse, readiness, consumers and final serve cleanup | fake-QVAC lifecycle tests and physical smoke |
| HTTP compatibility | QVAC/Hermes | QVAC serves the OpenAI-compatible API; Hermes consumes it | strict `/v1/models` probes, real transport smoke, protocol conformance report |
| Child environment | This package | Pass endpoint, API marker and timeout only to the Hermes child; redact captured diagnostics | environment and recursive-redaction tests |
| Session/control state | This package | Store bounded private records and expose authenticated loopback health/stop control without signalling recorded PIDs directly | session schema, token, stale/corrupt/PID-reuse and cleanup tests |
| User/model behavior | Model plus Hermes | Report measured outcomes separately from transport/protocol correctness | model-experience and release-readiness reports |

## Why this is standalone

Hermes directs third-party product integrations to standalone plugin
repositories using its public discovery surfaces. QVAC already publishes the
catalog, config generator, CLI and managed provider needed here. A Hermes-core
special case would add upstream maintenance burden, while a QVAC-core special
case would duplicate a host integration outside QVAC's server contract.

The companion CLI exists because the verified Hermes model-provider surface is
declarative and has no provider-local process lifecycle hook. If Hermes adds a
generic lifecycle hook, adopting that generic surface should be evaluated; the
plugin must not request a QVAC-only hook.

## Security-sensitive operations

- Filesystem mutation is limited to the selected `HERMES_HOME` plugin,
  configuration, lock and session paths.
- Installation and deletion require a validated regular-file layout and
  ownership hashes; unknown content is preserved with an error.
- Managed servers bind to loopback. External endpoints must be HTTP(S), reject
  embedded credentials, and use bounded authenticated health probes.
- Captured output and structured diagnostics redact effective credentials.
- Child processes run with explicit arguments rather than a shell, use bounded
  capture, and receive group-level shutdown with escalation.
- Model download is opt-in in smoke/rehearsal commands and never occurs during
  setup, doctor, metadata verification or transport-only smoke.
