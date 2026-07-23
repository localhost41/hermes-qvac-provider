# Release readiness — 2026-07-22

## Recommendation

**GO AS ALPHA.** Do not promote the npm `latest` tag and do not describe the
project as production-ready.

The candidate is demonstrably usable on macOS arm64 with Hermes 0.18.2 and
QVAC 0.8.1. Clean copied installation, discovery, provider loading, basic live
inference, a real file-tool workflow, repeated requests, concurrent requests,
upgrade, and owned uninstall all passed. Linux and Windows live inference were
not performed. Hermes error-path and session-resume limitations remain and are
listed below.

## Tested system

| Component | Value |
| --- | --- |
| Host | macOS 26.2 (25C56), arm64, 16 GiB RAM |
| Node / pnpm | Node 26.3.0, pnpm 11.10.0 |
| Hermes | 0.18.2 (2026.7.7.2), Python 3.11.15, OpenAI SDK 2.24.0 |
| Candidate QVAC | locked `@qvac/cli` 0.8.1 |
| Separately installed QVAC | 0.8.0 |
| Candidate package | `@localhost41/hermes-qvac-provider@0.1.0-alpha.4` |

## Automated evidence

| Gate | Command | Result |
| --- | --- | --- |
| TypeScript, integration, lifecycle | `pnpm test` | PASS: 75 tests in 4 files |
| Python provider and scripts | `pnpm test:python` | PASS: 24 tests |
| Type checking and formatting | `pnpm lint` | PASS |
| Build | `pnpm build` | PASS |
| Release metadata | `pnpm verify:metadata` | PASS |
| Packed consumer install | `pnpm verify:package` | PASS; tarball installed into an isolated npm consumer and exercised setup/run/serve/status/stop/uninstall |
| Real Hermes transport | `pnpm smoke:transport` | PASS; installed Hermes returned exactly `pong` |
| Production dependency audit | `pnpm audit --prod` | PASS; no known vulnerabilities |
| Shell scripts | `shellcheck scripts/*.sh` and `bash -n scripts/*.sh` | PASS |
| Manifest parse | Hermes Python + PyYAML `safe_load(plugin.yaml)` | PASS |
| Diff hygiene | `git diff --check` | PASS |
| Hosted matrix | GitHub Actions PR #32 | PASS: macOS Node 22; Linux Node 22, 24, and 26 |

The real-Hermes adverse transport harness completed every case within its
deadline. Success streaming returned `pong`. HTTP failure, malformed SSE,
connection close, delayed response, and non-stream response required the
harness timeout and process termination rather than clean Hermes exits. This is
a bounded test result, not a claim that Hermes handles those server failures
gracefully.

## Clean-room installation matrix

Each local test used a new temporary `HERMES_HOME` and did not rely on the
normal Hermes configuration.

| Delivery path | Install/discovery | Doctor/live use | Upgrade | Removal |
| --- | --- | --- | --- | --- |
| Source candidate, copied install | PASS; enabled as user model-provider 0.1.0-alpha.3 at test time | PASS; real Hermes returned `pong` | PASS | PASS; ownership-aware uninstall removed discovery |
| Candidate npm tarball | PASS in isolated npm consumer | PASS with fake QVAC lifecycle and real Hermes transport | PASS | PASS |
| Published `@alpha` (0.1.0-alpha.3) | PASS; copied plugin discovered | PASS after explicitly enabling the plugin | Repeat copy PASS | Manual directory removal did not clear Hermes' remembered disabled listing |

The source clean-room test preceded the candidate version bump to alpha.4; the
same installed payload is covered after the bump by the packed-package tests.
The published alpha is useful baseline evidence but does not contain the
candidate lifecycle hardening. It must not be used as evidence that alpha.4
behavior is already published.

## Live QVAC and Hermes matrix

| Scenario | Result | Evidence/notes |
| --- | --- | --- |
| QVAC `/v1/models` | PASS | Strict parsing rejects non-2xx, malformed JSON, wrong shapes, and missing configured models |
| Direct QVAC non-streamed completion | PASS | 1B validation model returned `Pong.` promptly |
| Real Hermes one-shot, explicit QVAC | PASS | Qwen3.5 9B returned `pong` through the plugin |
| External endpoint/custom model alias | PASS | `qvac-local` accepted only in external mode and returned `pong` |
| 50 sequential Hermes requests | PASS | 50/50, approximately 163 seconds total |
| 10 concurrent Hermes requests | PASS | 10/10 |
| Qwen3.5 9B file read/write tool task | PASS | Correctly read two fixture files and created the requested summary |
| Tool failure followed by recovery | PASS with caveat | Missing-file step recovered and produced the command result; response quality was terse |
| Qwen3.5 2B file read | PASS | Extracted the requested facts |
| Qwen3.5 2B file write | FAIL | Claimed completion but did not create the file; model capability limitation |
| Qwen3.5 0.8B basic Hermes response | FAIL | Repeated reasoning text exhausted output limits; not suitable as a default agent model |
| Context too small (2,048) | FAIL, bounded manually | Hermes' tool-bearing prompt plus requested output exceeded the context and exposed QVAC's known context-boundary hang |
| Context 32,768 | PASS | Same 1B transport path returned `pong`; candidate default is 32,768 |
| Interactive multi-turn/session resume | FAIL | Resume without explicit model produced HTTP 400 for an empty model; explicit retry did not complete within the observation window |

The verified friendly catalog contains eight aliases: `qwen3.5-0.8b`,
`qwen3.5-2b`, `qwen3.5-4b`, `qwen3.5-9b`, `qwen3.6-27b`,
`qwen3.6-35b-a3b`, `gpt-oss-20b`, and `gemma4-31b`. Qwen3.5 9B is the
smallest model in this run that completed a meaningful file-write workflow and
remains the defensible default. That is a measured result on this host, not a
general model-quality guarantee.

## Defects corrected in the candidate

- Replaced reachability checks that accepted any HTTP response with bounded,
  authenticated, successful, schema-validated `/v1/models` checks.
- Normalized endpoint URLs with or without `/v1` and trailing slashes.
- Matched the installed Hermes `ProviderProfile` and `kind: model-provider`
  discovery contract.
- Added safe, transactional copied setup; explicit enablement; ownership
  markers; upgrade recovery; refusal to replace unknown directories; and owned
  uninstall.
- Added managed QVAC lifecycle, external endpoint mode, authenticated session
  controls, process-group cleanup, state validation, and secret redaction.
- Used the official QVAC SDK catalog and constants instead of guessed aliases.
- Allowed server-advertised custom aliases for external endpoints while keeping
  managed mode restricted to official catalog IDs.
- Bounded physical smoke output with `HERMES_MAX_TOKENS=256` so a weak model
  cannot turn the release check into an unbounded generation.
- Added package, lifecycle, malformed endpoint, timeout, port collision,
  install-path, hostile-state, and real-Hermes transport coverage.
- Assigned the unreleased payload a new alpha.4 identity instead of reusing the
  already-published alpha.3 version.

## Platform status

| Platform/runtime | Status |
| --- | --- |
| macOS arm64, Node 26 | Full local automation and live inference performed |
| Linux x64, Node 22/24/26 | Full hosted automation passed; no physical live inference in this review |
| macOS, Node 22 | Full hosted automation passed; no separate local Node 22 live run |
| Windows x64 | Not tested and not claimed |
| Python 3.11/3.12/3.13 | Hosted test matrix configured; live Hermes used Python 3.11 |

## Known limitations and release conditions

- Hermes 0.18.2 model-provider plugins are declarative; managed lifecycle is
  provided by the `hermes-qvac` companion CLI, not an in-process Hermes hook.
- QVAC context-boundary termination can hang in the tested upstream server.
  The 32,768-token default avoids the reproduced tiny-context setup but is not
  a server-side fix.
- Hermes session resume was not reliable in this run and should not be
  advertised as verified.
- Small models may answer simple prompts but are not reliable tool-using
  agents. Qwen3.5 9B is the tested recommendation on a 16 GiB Apple Silicon
  host.
- Linux live inference and all Windows behavior remain unverified. README and
  release notes must preserve that limitation.
- No npm publish, git tag, stable dist-tag change, or `latest` promotion was
  performed by this review.

Before alpha.4 is published: inspect the final npm tarball, review this report
and the security/compatibility documents, and publish only through the existing
protected alpha workflow. PR #32's hosted matrix is green; the draft status is
retained for maintainer review, not because of a failing automated gate.
