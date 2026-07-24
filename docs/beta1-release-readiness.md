# Beta.1 release readiness

Candidate package: `@localhost41/hermes-qvac-provider@0.1.0-beta.1`.

Current recommendation: **GO AS BETA WITH EXPLICIT UPSTREAM LIMITATIONS**.

## Completed gates

- Authenticated external OpenAI-compatible mode has positive, missing-key, wrong-key, Hermes environment, and redaction coverage.
- Managed macOS inference, 9B outcome-verified tool use, lifecycle cleanup, and bounded QVAC conformance pass.
- QVAC 0.8.1 context and structured-output probes remain bounded known-upstream failures rather than plugin workarounds.
- Session resume is outside the supported surface; fresh one-shot and interactive sessions are supported.
- Packed Hermes 0.19 transport acceptance passes on clean Linux x64, and the provider contract passes against Hermes 0.19 plus current main.
- The beta resilience rerun passed 100 sequential and 20 concurrent QVAC requests with zero failures; p50 was 103 ms, p95 1,414 ms, and maximum 2,021 ms for one-token responses.
- The production audit discovered `find-my-way` 9.6.0 through QVAC CLI and now resolves patched 9.7.0 through a lockfile override; the high-severity audit and full regression suite pass.
- The frozen tarball contains 25 files, is 48,734 bytes packed and 178,919 bytes unpacked, and has SHA-256 `e00c545209d6ee2e38f6ea3cb3c7d7c6057a6bcb4ac553d37c8eb744ff24ac63`.
- Packed macOS acceptance passed isolated install, copied setup, Hermes discovery, doctor, real OpenAI-compatible transport, idempotent upgrade, owned uninstall, and cleanup without using the source checkout at runtime.
- The reproducible CycloneDX 1.6 beta SBOM contains 272 components and has SHA-256 `e058827a3b778b9cc97fc2ec9ca09d6c164c5831cc0ef889bdb3dd6d85cbec97`.

## Explicit limitations

- A consented fresh Linux x64 physical run reached the QVAC HTTP listener but the server did not advertise Qwen3.5 0.8B within 15 minutes. Cleanup passed. Linux support is therefore limited to packed installation, real Hermes discovery/profile/transport, and cleanup; physical QVAC inference is not claimed.
- No Windows or WSL2 host was available, so neither is claimed.
- Managed QVAC remains loopback-only and does not enforce its client marker. Bearer enforcement uses QVAC `serve openai --api-key` with external mode.
- QVAC #3384 and #3225 remain upstream termination limitations.
- Model quality is not protocol correctness; 9B is the outcome-verified tool recommendation and smaller models have explicit capability warnings.

The beta workflow is manual, requires the protected npm environment, verifies a beta version, publishes only under the `beta` dist-tag with provenance, and does not change `latest`. No publication, tag, merge, or endorsement is performed by this report.
