# Alpha.5 release readiness

Candidate package: `@localhost41/hermes-qvac-provider@0.1.0-alpha.5`.

Current recommendation: **NO-GO pending the upstream managed-auth decision**.

Alpha.5 addresses independently reproduced lifecycle status, Hermes child working-directory propagation, outcome-based tool verification, model experience classification, and cold-start storage/readiness behavior. Managed endpoint authentication remains blocked by the absence of a server-auth option in the current official managed QVAC provider; the bounded request is recorded in `qvac-managed-auth-request.md`.

No package publication, tag, dist-tag change, or upstream contact is authorized by this document.

## Local evidence

- TypeScript: 82/82 tests before final packaging pass.
- Python: 24/24 tests.
- Lint, type checking, metadata drift, and diff hygiene: pass.
- The committed candidate packed to 47,646 bytes (175,651 bytes unpacked, 25 entries) with SHA-256 `7b1dccbacab773018128a16014a9495e14f23569e89d86eda39788e67652e2ef`.
- The packed tarball passed isolated Hermes 0.18.2 installation, copied setup, discovery, doctor, real transport smoke, idempotent upgrade, owned uninstall, and post-uninstall discovery/cleanup. The source checkout was not used at runtime.
- A fresh isolated Hermes home loaded the source candidate and completed managed 9B+2B outcome-verified tool smoke.
- Five additional warm-server 9B trials independently verified `qvac-proof.txt` with exact content `QVAC-HERMES-OK`: 5/5 pass, 148–152 seconds each.
- Visible reply adherence was 3/5 exact `DONE`; two replies were `DONEDONE`. Filesystem correctness, not model prose, is the release gate.
- The prior false-success reproduction is resolved by propagating configured `cwd` to the Hermes child.
- Managed QVAC server authentication remains unavailable through the current official SDK, so alpha.5 must not claim bearer enforcement for managed inference.
