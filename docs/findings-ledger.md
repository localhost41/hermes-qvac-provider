# Alpha.4 findings ledger

This ledger records only evidence-backed release findings. Public upstream
reports remain drafts until explicitly approved.

| Finding | Perspective | Severity | Evidence | Smallest defensible action | State | Remaining limitation |
| --- | --- | --- | --- | --- | --- | --- |
| Compatibility table retained Node 20 after the supported range moved to 22–26 | Community/Hermes | Medium | `package.json` and CI support 22/24/26; pnpm 11 does not run on Node 20 | Correct table and enforce cross-document metadata | Implemented | None after metadata gate passes |
| Hermes has a newer `v2026.7.20` release than the live-tested 0.18.2 host | Hermes | High | Packed acceptance passed at release `3ef6bbd` and main `3f9944ba` | Record exact scope without promoting it to live support | Implemented | Live inference remains pinned to 0.18.2 until tested |
| QVAC context-boundary streaming can remain open | QVAC | High | Live reproduction and upstream #3384 | Preserve as bounded known-upstream-failure; do not patch server semantics here | Reproducible | Await upstream fix/decision |
| Structured JSON may continue beyond one complete value | QVAC | Medium | Upstream #3225 | Add an opt-in bounded conformance case and record current behavior | Queued | Product semantics belong upstream |
| Hermes session resume produced an empty-model 400 and an explicit retry did not complete | Hermes | High | Source dispatch and bounded PTY reproduction | Remove invalid one-shot-resume interpretation; keep interactive resume provisional | Needs maintainer decision | Automated second resumed turn remains unproven |
| Several adverse server responses require harness termination | Hermes | Medium | Real-Hermes suite with explicit termination reason | Preserve bounded enforcement and prepare a host-owned report | Reproducible | Graceful host exit not demonstrated for five adverse cases |
| 0.8B and 2B transport works but agent file-write behavior is unreliable | Community/model | Medium | Previous physical trials | Repeat a fixed benchmark; separate model quality from plugin correctness | Queued | Hardware limits larger-model breadth |
