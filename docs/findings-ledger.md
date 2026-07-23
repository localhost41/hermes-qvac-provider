# Alpha.4 findings ledger

This ledger records only evidence-backed release findings. Public upstream
reports remain drafts until explicitly approved.

| Finding | Perspective | Severity | Evidence | Smallest defensible action | State | Remaining limitation |
| --- | --- | --- | --- | --- | --- | --- |
| Compatibility table retained Node 20 after the supported range moved to 22–26 | Community/Hermes | Medium | `package.json` and CI support 22/24/26; pnpm 11 does not run on Node 20 | Correct table and enforce cross-document metadata | Implemented | None after metadata gate passes |
| Hermes has a newer `v2026.7.20` release than the live-tested 0.18.2 host | Hermes | High | Current GitHub release metadata | Add release and current-main packed-plugin compatibility lanes before changing support claim | Validating | Live inference remains pinned to 0.18.2 until tested |
| QVAC context-boundary streaming can remain open | QVAC | High | Live reproduction and upstream #3384 | Preserve as bounded known-upstream-failure; do not patch server semantics here | Reproducible | Await upstream fix/decision |
| Structured JSON may continue beyond one complete value | QVAC | Medium | Upstream #3225 | Add an opt-in bounded conformance case and record current behavior | Queued | Product semantics belong upstream |
| Hermes session resume produced an empty-model 400 and an explicit retry did not complete | Hermes | High | Previous bounded live run | Reproduce against release/current source and compare another compatible provider | Queued | Ownership not yet isolated |
| Several adverse server responses require harness termination | Hermes | Medium | Real-Hermes adverse transport suite | Trace timeout/retry behavior and assert cleanup for every case | Queued | Graceful host exit not yet demonstrated |
| 0.8B and 2B transport works but agent file-write behavior is unreliable | Community/model | Medium | Previous physical trials | Repeat a fixed benchmark; separate model quality from plugin correctness | Queued | Hardware limits larger-model breadth |
