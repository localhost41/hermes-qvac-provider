# Resilience and soak report

Date: 2026-07-22. Host: macOS 26.2 arm64, 16 GiB. QVAC lane: locked
0.8.1 with an already cached Qwen3.5 0.8B model and plugin-generated 32K
configuration.

## Request soak

Two consecutive runs of the bounded soak harness each issued 100 sequential and
20 concurrent non-stream requests with `max_tokens: 1`:

```console
node scripts/resilience-soak.mjs \
  --base-url http://127.0.0.1:11434/v1 \
  --model qwen3.5-0.8b \
  --sequential 100 \
  --concurrent 20
```

| Run | Passed | Failed | min | p50 | p95 | max |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 120 | 0 | 102 ms | 104 ms | 1,431 ms | 2,042 ms |
| 2 | 120 | 0 | 102 ms | 104 ms | 1,431 ms | 2,042 ms |

All 240 requests ended with the expected deliberate `length` outcome. Worker
RSS was approximately 1,222,112 KiB after the first run and 1,153,040 KiB after
the second; the sample did not show unexplained growth.

## Lifecycle cycles

- Ten real managed QVAC start/ready/SIGINT/stop cycles passed. Every cycle
  advertised `/v1/models`, exited zero, and released port 11434 before the next.
- Ten setup/upgrade operations passed in an isolated `HOME`/`HERMES_HOME`.
- Ten uninstall/reinstall operations passed against real Hermes discovery. The
  installed plugin hash remained
  `028b6cc395b5f584d033f849df35a8947adc400542ee29a2ded0278123838255`.
- Final uninstall removed the plugin directory. No QVAC worker, listener,
  lifecycle session file, or test home remained.

## Adverse outcomes

The adverse-host cases remain bounded by the harness but do not exit gracefully
inside Hermes; see [Adverse stream behavior](adverse-stream-report.md). A
cancelled long 9B generation left QVAC occupied until the managed server was
restarted. The plugin cleaned up its child process, but this run does not claim
that upstream request cancellation is effective.

Long multi-turn and model tool-quality behavior use the previously recorded live
evidence rather than being repeated as a load metric. Native Windows, Linux live
inference, 4B, and models larger than 9B were not tested. These omissions remain
explicit compatibility limitations.
