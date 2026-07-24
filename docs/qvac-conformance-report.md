# QVAC protocol conformance report

Date: 2026-07-22. Host: macOS 26.2 arm64, 16 GiB RAM. The candidate lane
used locked `@qvac/cli` 0.8.1 and its generated 32,768-token configuration.
An independently installed QVAC 0.8.0 lane was also checked.

Run the bounded harness with:

```console
node scripts/qvac-conformance.mjs \
  --base-url http://127.0.0.1:11434/v1 \
  --model qwen3.5-0.8b
```

## Recorded results

| Lane/model | Required cases | Failures | Known cases run | Notes |
| --- | ---: | ---: | ---: | --- |
| QVAC 0.8.0 / cached 1B validation alias | 8/8 | 0 | 0 | Independent server configuration |
| QVAC 0.8.1 / Qwen3.5 0.8B | 8/8 | 0 | 0 | Plugin-generated 32K configuration |
| QVAC 0.8.1 / Qwen3.5 9B | 8/8 | 0 | 0 | Fresh server after cancellation test |

The required cases covered model listing, non-stream and stream response
parsing, explicit output-length termination, unknown model, malformed request,
tool request shape, and a bounded unavailable endpoint. The live 0.8.1 server
returned `finish_reason: "length"` for the deliberately capped generations and
closed each tested stream normally.

Authentication requires a server explicitly started with a test key and was
not exercised in these three lanes. Restart and stop-mid-stream require
lifecycle ownership and remain assigned to the lifecycle/soak harness instead
of being represented as protocol passes.

## Known upstream cases

QVAC #3384 (context-boundary streaming hang) and #3225 (structured JSON terminal
state) are opt-in destructive cases. They are skipped by default and are never
converted into passes by a timeout. A 2,048-token external configuration again
left the Hermes request open at the context boundary. Cancelling Hermes did not
make the QVAC worker immediately available to a following request; restarting
the owned server restored service. This is recorded as upstream behavior, not
hidden with a plugin response shim.

The structured-output case was not rerun in this pass. Its status remains a
tracked upstream limitation rather than an inferred result.

On 2026-07-23 the beta-gate rerun used QVAC 0.8.1, cached Qwen3.5 0.8B,
`ctx_size=2048`, disabled reasoning/tools, and a bounded isolated managed server.
All eight required protocol cases passed. The #3384 stream exceeded the
10-second probe bound, and the #3225 response contained incomplete JSON. Both
remain known-upstream failures; the server then stopped cleanly on SIGINT.
