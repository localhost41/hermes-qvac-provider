# Threat and failure model

## Trust boundaries

- The local user and explicitly selected `HERMES_HOME`, QVAC binary, cwd, and external endpoint are trusted configuration inputs after validation.
- Endpoint responses, saved JSON, session files, existing plugin paths, inherited environment, and process IDs are treated as potentially stale or malformed.
- Official QVAC packages own managed serve processes. This package owns only its CLI process, Hermes child, private plugin copy, configuration, and session records.

| Threat/failure | Control | Verification/residual risk |
|---|---|---|
| Arbitrary PID termination / PID reuse | stop never signals recorded PIDs; random-token authenticated loopback request asks the owner to signal itself | live unrelated-PID and unreachable-control tests; denial of service by deleting a state file remains possible to the same user |
| Stale/corrupt session record | strict bounded regular-file parsing; filename/PID match; invalid records isolated; dead valid records pruned | stale, corrupt, oversized/symlink, partial-stop tests |
| Control-token disclosure | 256-bit random token, private `0600` state, recursive output redaction, constant-time compare | token/JSON status tests; same OS user can normally read its own process files |
| Malicious saved config | bounded regular non-symlink file, object-only JSON, exact keys, full type/range/cross-field validation, catalog normalization | malformed/oversized/symlink/unknown/boundary tests |
| Secret leakage | marker passed via child environment and Bearer header, never process arguments; recursive structured redaction; bounded errors | redaction/auth tests and final secret scans; child Hermes can inspect its own environment by design |
| Command injection | all process launches use executable plus argument arrays; model IDs constrained to official catalog | parser/model/path tests |
| URL abuse | only HTTP(S), `/v1` suffix, no embedded credentials/query/fragment; bounded timeout/body/schema | URL and hostile endpoint tests; HTTPS certificate policy is Node/Hermes default |
| Response memory exhaustion | one-MiB `/models` limit, ten-thousand-entry limit, 200-character IDs; fixture request limit | oversized/invalid response tests |
| Child output/process hang | two-MiB captured-output cap, bounded captured process with TERM-to-KILL escalation, bounded version/plugin probes, signal forwarding | signal-resistant hang/output/signal tests |
| Port collision/race | preflight bind refuses occupied pinned ports; official startup reports post-release TOCTOU collisions | occupant remains alive test; normal bind-close-spawn race cannot be eliminated without passing a bound socket upstream |
| Unrelated plugin overwrite/delete | schema/package/plugin marker plus exact payload hashes and an exact managed layout are required for deletion; only exact core-file hashes from the two published pre-marker alphas are upgradeable; symlink targets/parents and unexpected files are refused | forged marker, tampered payload, extra-file, unowned, symlink, package tests |
| Partial/interrupted upgrade | adjacent staging, atomic rename, retained backup until Hermes enable succeeds, rollback, recognized backup recovery; a replacement unrecognized target prevents backup deletion | rollback, interrupted-backup, and unrelated-target preservation tests; abrupt power loss during filesystem rename follows filesystem guarantees |
| Concurrent setup/uninstall | private exclusive lock with bounded wait, dead-owner recovery, inode-checked release, and unique staging names | concurrent and stale-owner setup tests; unrelated tools do not honor this lock |
| Enable/disable failure | enable failure rolls back installation; disable failure leaves installed files intact | explicit failure tests |
| Unsafe recursive removal | recursive removal applies only to validated owned real directories with no unexpected entries or package-created staging/backup paths; symbolic targets and control directories are refused | ownership/extra-file/symlink tests |
| Inherited environment contamination | deliberate child environment merge with QVAC endpoint/key/timeout overwritten last; isolated smoke supplies isolated home | fake-Hermes environment and isolated smoke tests; other ordinary user environment variables remain intentionally inherited |
| Shared QVAC termination | provider consumers close through official manager; CLI never directly kills shared QVAC | fleet reuse/detach tests |
| Incompatible session reuse | official fleet key includes model config, host, binary, pinned port; cwd forces no reuse | compatible/incompatible and cwd tests |
| QVAC crash/orphan | official detached runner, health checks, registry sweep and process-group shutdown | official source/tests plus fake early-exit/reap tests; upstream behavior remains an external dependency |
| Dependency compromise/drift | locked dependencies, production audit, scheduled current-package compatibility without manifest mutation | frozen install, audit, scheduled workflow |
| Unexpected tarball layout | explicit allow/deny content checks and isolated consumer execution | package verifier |

## Design decision: loopback control instead of Unix sockets

Authenticated loopback TCP is used because the supported targets are macOS and Linux and Node’s TCP semantics are uniform across both. Unix sockets improve filesystem-addressability but introduce stale socket paths, path-length limits, permissions differences, and platform-specific cleanup. The control endpoint accepts only authenticated `GET /health` and `POST /stop`, binds `127.0.0.1`, and carries no general command surface.
