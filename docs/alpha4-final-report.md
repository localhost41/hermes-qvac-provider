# Alpha.4 final release-readiness report

## Recommendation

**GO AS ALPHA WITH EXPLICIT LIMITATIONS.** Do not promote `latest`, call the
plugin official/endorsed/stable/production-ready, or publish without the user's
separate approval.

The release candidate has strong evidence for a community alpha: clean packed
installation, real Hermes discovery/profile import, live Hermes-to-QVAC
inference, deterministic uninstall, bounded protocol suites, repeated request
and lifecycle soak, minimized artifact inventory, SBOM, production audit, and
cross-version automation. Remaining gaps affect scope and claims rather than the
demonstrated macOS alpha path.

## Frozen candidate

| Field | Value |
| --- | --- |
| Candidate payload commit | `7c39c0143f2ae31fab8c0cd9c31113f4cfa0a376` |
| Package | `@localhost41/hermes-qvac-provider@0.1.0-alpha.4` |
| Payload | 25 files; 44,988 bytes packed; 164,856 bytes unpacked |
| Tarball SHA-256 | `d21331ed56fa159056c6bd633837e4234c59e14c66c8454d92da087e4c889215` |
| npm shasum | `b0904a59aab4762d6a19cc7060e3463e804980e8` |
| npm integrity | `sha512-R1qRM7UoiKT9w6C9Zx39qB76huzYriJpbb02dkmeGo2GT70kzInnpTT1F2SjTOIXE9AR0PA376GjUFQxiPqQGA==` |
| SBOM | CycloneDX 1.6, 272 components, SHA-256 `17c056ec308f68598568a89586ef935b5db2a5898e23126bc88385a6a7ff7317` |
| Production audit | 0 info/low/moderate/high/critical findings |
| Licenses observed | Apache-2.0 122; MIT 128; ISC 11; BlueOak 5; BSD-3-Clause 3; Python-2.0 1; dual AFL-2.1/BSD-3-Clause 1 |

The provenance gate ran from a clean worktree after the last packaged
implementation change. This report and its moderator packets are excluded from
the npm allowlist, so recording the evidence does not alter the payload.

## Gates

- TypeScript: 77/77 tests.
- Python: 24/24 tests.
- Type/lint/build, metadata drift, packed consumer, shell syntax/ShellCheck,
  manifest parse, production audit, and diff hygiene: pass locally.
- Node 22/24/26 and Python 3.11/3.12/3.13: hosted matrix configured.
- CodeQL JavaScript/TypeScript and Python: pass on the first security run.
- Final hosted CI: macOS Node 22/Python 3.11 and Linux Node 22/24/26 with Python
  3.11/3.12/3.13 all pass; the macOS process-tree regression is green.
- Packed Hermes 0.19.0 release and `main`: discovery, profile, doctor, transport,
  live inference, upgrade, uninstall, and cleanup pass.
- Live QVAC protocol: 8/8 required cases on 0.8B and 9B; independent 0.8.0 lane
  also 8/8.
- Soak: 240/240 requests, ten QVAC restart cycles, ten setup/upgrade cycles, and
  ten uninstall/reinstall cycles.

## Explicit limitations

- Full live validation is macOS arm64 only. Linux x64 has hosted package gates
  but no recorded live model inference. Native Windows and WSL2 are untested and
  not claimed.
- Python 3.12/3.13 coverage is automated profile coverage; live Hermes used
  Python 3.11.
- QVAC #3384 and #3225 remain upstream limitations. The plugin does not hide
  them.
- Session resume restoration is provisional, not an advertised verified path.
- Five adverse Hermes response cases require enforced harness termination.
- Cancellation of a long 9B request did not immediately free QVAC; restart was
  required in the observed run.
- Model quality is not protocol correctness: 0.8B/2B showed tool limitations,
  and 9B exact-answer latency was inconsistent despite protocol conformance.
- 4B and models above 9B were not loaded in this pass because the artifacts were
  not cached or lacked safe disk/RAM headroom.
- The Hermes installer itself was not revalidated for the 0.19 source lanes; an
  existing compatible Python environment loaded each exact source revision.
- GitHub dependency review is unavailable while the repository dependency graph
  is disabled. The attempted action failed explicitly and was removed rather
  than left as a noisy or ignored check; enabling the graph is an owner decision.

## Protected actions not taken

No npm publish, tag, dist-tag change, PR merge, stable release, moderator
contact, upstream issue, or public endorsement request was performed.

## Prepared review material

- `docs/qvac-moderator-review-packet.md`
- `docs/hermes-moderator-review-packet.md`

Both packets request technical correction only and remain unsent pending user
approval.
