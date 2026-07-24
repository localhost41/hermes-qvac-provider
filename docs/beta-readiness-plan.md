# Beta readiness plan

Alpha.5 is the evidence baseline. A beta version is justified only when the
supported user paths below are repeatable from a packed artifact and every
remaining upstream or platform boundary is detected, bounded, and described.
Beta does not require this plugin to replace Hermes or QVAC behavior.

## Gates

| Area | Beta acceptance gate | Ownership | Current state |
|---|---|---|---|
| Authenticated inference | QVAC `serve openai --api-key` plus external mode passes correct, missing, and wrong-key probes and a real Hermes request without exposing the secret | Plugin/QVAC supported surface | Automated positive/negative conformance and Hermes launch-boundary coverage pass |
| Managed local inference | Loopback-only managed start, readiness, reuse, stop, and cleanup pass; documentation never describes the client marker as server authentication | Plugin | Passed in alpha.5 |
| Tool outcomes | Packed-plugin test verifies an exact filesystem side effect; model prose alone never passes the gate | Plugin/model | Passed 5/5 with 9B on macOS |
| Context and structured output | Conformance probes complete inside a hard timeout and classify current QVAC behavior as pass or known-upstream failure | QVAC | QVAC 0.8.1 beta rerun bounded both cases as known-upstream failures |
| Adverse streams | Every advertised CLI path exits or is forcibly terminated within its documented bound, with no child, port, secret, or configuration leak | Plugin/Hermes | Bounded smoke/conformance paths pass; interactive run is explicitly host-owned rather than a health gate |
| Session resume | A real second interactive turn preserves provider and model, or resume is explicitly excluded from beta support | Hermes | Excluded from the supported beta surface; fresh one-shot and interactive sessions remain supported |
| Linux x64 | Packed install, real Hermes discovery, physical QVAC inference, and cleanup pass on a fresh Linux x64 host | Platform | Packed real-Hermes transport/cleanup passes; physical run reached the listener but no model was advertised within 15 minutes, so live inference is not claimed |
| macOS arm64 | Repeat the full authenticated external and managed acceptance lanes from the frozen beta artifact | Platform | Frozen packed beta acceptance passes; live managed/tool evidence is inherited from the same implementation line |
| Windows | WSL2 is tested and documented, or all Windows claims remain absent | Platform | No Windows/WSL host is available; all Windows claims remain absent |
| Runtime matrix | Node 22, 24, 26 and Python 3.11, 3.12, 3.13 package/profile gates pass; the real ProviderProfile contract passes against Hermes 0.19.0 and current main | Plugin/Hermes | Hosted runtime matrix passes; release/main contract lanes added |
| Supply chain | Frozen tarball inventory, SHA-256, SBOM, production audit, CodeQL, minimal workflow permissions, and provenance rehearsal pass | Plugin | Frozen beta tarball, checksum, 272-component SBOM, patched production audit, CodeQL, and protected beta workflow pass |
| Resilience | 100 sequential requests, bounded concurrency, restart/reinstall cycles, cancellation, and unavailable/malformed endpoint cases show no leaks or state drift | Plugin/upstream | Beta rerun passed 100 sequential plus 20 concurrent requests; earlier restart/reinstall and adverse-case evidence remains valid |

## Execution order

1. Make authenticated external OpenAI compatibility a first-class automated
   acceptance lane, including negative authentication and redaction.
2. Re-run and strengthen context, structured-output, adverse-stream, cancellation,
   and resume probes against the pinned Hermes/QVAC versions and current upstream.
3. Run packed live acceptance on macOS and Linux. Use WSL2 only if an appropriate
   host is available; otherwise preserve the explicit unsupported claim.
4. Re-run model outcome trials with fixed parameters. Recommend only models that
   meet the measured task gate.
5. Run soak, security, artifact, and clean-room release rehearsal from one commit.
6. Change metadata to beta only after every required gate is passed, bounded as an
   upstream limitation, or removed from the supported beta surface.

## Promotion rule

The beta recommendation is one of `GO AS BETA`, `GO AS BETA WITH EXPLICIT
UPSTREAM LIMITATIONS`, or `NO-GO`. Missing live evidence may narrow platform or
feature support; it must never be converted into an untested compatibility claim.
