# Adverse Hermes transport report

The real-Hermes harness uses an isolated plugin installation and a bounded
OpenAI-compatible fixture. Every capture is capped at two MiB and every child
process is terminated as a process group on deadline.

| Case | Hermes 0.18.2 result | Classification |
| --- | --- | --- |
| Complete streamed response with terminal `finish_reason` and `[DONE]` | Natural exit 0, exact `pong` | Pass |
| Semantically wrong response | Natural exit 0, non-`pong` response | Correctly rejected by plugin smoke gate |
| HTTP 503 | Harness termination at 8 seconds | Hermes host limitation |
| Malformed SSE | Harness termination at 8 seconds | Hermes host limitation |
| Premature connection close | Harness termination at 8 seconds | Hermes host limitation |
| Response delayed beyond configured API timeout | Harness termination at 5 seconds | Hermes host limitation |
| Non-stream JSON returned to a streaming request | Harness termination at 8 seconds | Hermes host limitation |

The harness now records `natural-exit` versus the exact enforced termination
reason. A forced result is exit code 124 and is never presented as a graceful
Hermes error. The fixture itself emits one terminal `finish_reason` and one
`[DONE]`; this was strengthened after Hermes 0.19 correctly exposed that the
older fixture's unterminated stream caused retries.

No QVAC or plugin workaround is appropriate for generic Hermes client error
handling. The defensible plugin responsibility is a strict success predicate,
bounded process lifetime, group cleanup, capped output, and redacted evidence.
Those guarantees apply to the captured `smoke` and conformance paths.
Interactive `run` deliberately attaches Hermes standard streams and follows the
host lifetime; it is not advertised as a bounded transport-health command.
