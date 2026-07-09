### Triage for Issue #1 — Inspect Hermes provider architecture

**Acceptance Criteria**

- Research Hermes provider/plugin architecture from public documentation and the repository.
- Author `docs/architecture-notes.md` containing:
  - Overview of the Hermes provider model (registration, configuration, lifecycle).
  - Relevant extension points and interfaces.
  - Current known providers (if any).
- Identify the cleanest integration path for a QVAC provider (e.g., implementing a known interface, registering a model catalog, providing OpenAI-compatible endpoint configuration).
- Deliverable: mergeable markdown document in `docs/` with practical guidance for subsequent implementation. No code changes.

**Risks**

- Public documentation may be incomplete or outdated; assumptions could drift from actual implementation.
- The “cleanest integration path” may change when the QVAC provider prototype is attempted.
- The note is research-only, but future work could uncover blockers (e.g., missing streaming support or non‑standard endpoint behaviour).
- Coordination with the upstream Hermes project may be needed if gaps are found.

**Recommended Labels**

- `documentation`
- `research`
- `qvac`
- `low‑complexity`

**Estimate**: 1‑2 days of research and writing (no coding). This is a documentation-only task suitable for an Async spike.
