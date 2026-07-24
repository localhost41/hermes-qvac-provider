# Requirements traceability

This record maps the release-candidate requirements to implementation and evidence. Validation results are refreshed during the final release-candidate pass; commands are intentionally reproducible.

| Requirement area | Implementation | Primary tests/evidence | Validation | Remaining limitation |
|---|---|---|---|---|
| Authoritative baseline | package metadata, official imports, parity snapshot | exact catalog/golden tests; recorded source/tarball hashes | npm metadata, current QVAC and Hermes source inspection | Snapshot changes only through explicit dependency/compatibility work |
| ProviderProfile | `qvac_provider/__init__.py`, root entrypoint | Python profile, historical/current constructor, fetch, message tests | `pnpm test:python`, real doctor/smoke | Per-model modality unavailable in Hermes |
| CLI and help | `src/cli.ts` | parser, shape, child process, package tests | `pnpm test`, packaged executable commands | No shell completion: small command surface and no Hermes integration point |
| Configuration and precedence | `src/config.ts` | precedence, every boundary, malformed/unknown, permissions, concurrency tests | `config validate`, TS suite | Concurrent writes are atomic last-completer-wins, not field merging |
| Catalog/config synthesis | official model imports, `createManagedModels` | eight-entry mapping and generated-config golden | TS suite, captured fake QVAC config | Python fallback data is unavoidable but exact-order tested |
| Managed lifecycle | official `createQvac({mode:"managed"})` | readiness, early exit, reuse, incompatible fleets, collision, cleanup | fake-QVAC integration suite | Upstream cwd omission requires `reuse=false` |
| Session controls | runtime session inventory/control server | token, partial, stale, corrupt, symlink, PID safety tests | runtime/service integration | Loopback TCP chosen for portable macOS/Linux behavior |
| External endpoint | CLI/runtime bounded catalog validation | auth, malformed, large, missing model, no-spawn tests | integration suite | Server TLS policy belongs to configured HTTPS endpoint |
| Setup/upgrade/uninstall | transactional staging, ownership, lock, rollback/recovery | clean/repeat/concurrent/symlink/rollback/disable tests | TS, Python wrappers, package verifier | External processes ignoring the package lock remain a general filesystem race |
| Doctor/status | deep runtime checks and human/JSON output | fake doctor/service and real isolated doctor | real isolated workflow | Managed endpoint offline is intentionally a warning |
| Transport smoke | isolated home, mock OpenAI stream, real Hermes | fixture tests and real adverse suite | `pnpm smoke:transport`, `pnpm verify:hermes` | Requires locally installed Hermes |
| Physical smoke | managed/external path and explicit consent | estimate/guard/exact-output logic tests | guard command; 2026-07-21 resource review | No-go for this review without separate download consent: smallest preload is 1.69 GiB; host has 35 GiB free disk and 16 GiB RAM |
| Fake QVAC/Hermes rigor | integration fixtures | config/readiness/failure/reuse/signals/exits/timeouts | TS suite | Real inference is separate by design |
| npm artifact | package metadata and verifier | isolated consumer, bin, setup/run/serve/status/stop/doctor/smoke/uninstall | `pnpm verify:package` | None known |
| Cross-platform | Node 22–26, Python 3.11–3.13 CI on Linux/macOS | CI matrix | workflow plus local Node 26 run | Real Hermes currently verified with its Python 3.11 environment |
| Compatibility drift | scheduled official package/Hermes source workflow | no-save constraints assertion | compatibility workflow | Scheduled result depends on external registries/GitHub |
| Performance/resources | bounded I/O, probes, timeouts, cleanup | output/body/time/process tests | suites and timing observations | Model inference performance is hardware-dependent |
| Security/privacy | threat model, redaction, ownership, safe spawn, bounded network | adversarial TS/Python/package tests, dependency audit | `pnpm audit --prod` | Local user controlling HERMES_HOME already controls that tree |
| Documentation/UX | README and `docs/` | command/package checks and drift searches | manual final audit | — |
| Final adversarial review | complete diff and clean validation | exclusion/placeholder/secret/stale-claim scans | final command matrix | Physical inference only consent-gated item |
