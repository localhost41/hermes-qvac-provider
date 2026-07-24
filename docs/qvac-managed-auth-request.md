# Draft QVAC managed authentication request

Do not post without repository-owner approval.

## Confirmed gap

QVAC CLI 0.8.1 supports `qvac serve openai --api-key KEY` and rejects missing or incorrect bearer credentials when that option is used. The current latest `@qvac/ai-sdk-provider` 0.3.0 managed options expose `apiKey` only for the OpenAI-compatible client. Its managed `spawnServe` command constructs `qvac serve openai` without `--api-key`, so a managed endpoint accepts missing and incorrect credentials.

## Requested supported surface

Add an optional managed server-auth value or secret-provider callback that:

- passes the value to QVAC CLI without including it in fleet identity logs or diagnostics;
- includes authentication mode, but not the secret, in fleet compatibility identity;
- authenticates managed readiness probes;
- rejects reuse when callers disagree about authentication mode;
- redacts the value from errors and process reports; and
- preserves existing unauthenticated behavior when unset.

If CLI argument transport is the only available mechanism, please document the process-list exposure and intended threat model. An environment or private configuration-file route would be preferable.

## Reproduction

1. Create a managed provider with `apiKey: "test-secret"`.
2. Wait for its `/v1/models` endpoint.
3. Request `/v1/models` with no Authorization header and with a wrong bearer value.
4. Both currently return HTTP 200; direct `qvac serve openai --api-key test-secret` returns 401 for both.

The Hermes community plugin will continue binding managed QVAC to loopback and will not fork or patch the official supervisor while this surface is absent.
