# Alpha.5 release readiness

Candidate package: `@localhost41/hermes-qvac-provider@0.1.0-alpha.5`.

Current recommendation: **GO AS ALPHA WITH EXPLICIT LIMITATIONS**.

Alpha.5 addresses independently reproduced lifecycle status, Hermes child working-directory propagation, outcome-based tool verification, model experience classification, and cold-start storage/readiness behavior. Authenticated external mode uses QVAC's supported CLI server authentication and is covered through the Hermes launch boundary. Native managed endpoint authentication remains unavailable because the official managed QVAC provider has no server-auth option; the bounded enhancement request is recorded in `qvac-managed-auth-request.md`.

No package publication, tag, dist-tag change, or upstream contact is authorized by this document.

## Local evidence

- TypeScript: 82/82 tests before final packaging pass.
- Python: 24/24 tests.
- Lint, type checking, metadata drift, and diff hygiene: pass.
- The committed candidate packed to 47,805 bytes (176,142 bytes unpacked, 25 entries) with SHA-256 `d28b57fac6edb396a33939fe33725848524f66b2440fbdc6007c39d0c1fc1384`.
- The packed tarball passed isolated Hermes 0.18.2 installation, copied setup, discovery, doctor, real transport smoke, idempotent upgrade, owned uninstall, and post-uninstall discovery/cleanup. The source checkout was not used at runtime.
- A fresh isolated Hermes home loaded the source candidate and completed managed 9B+2B outcome-verified tool smoke.
- Five additional warm-server 9B trials independently verified `qvac-proof.txt` with exact content `QVAC-HERMES-OK`: 5/5 pass, 148–152 seconds each.
- Visible reply adherence was 3/5 exact `DONE`; two replies were `DONEDONE`. Filesystem correctness, not model prose, is the release gate.
- The prior false-success reproduction is resolved by propagating configured `cwd` to the Hermes child.
- Authenticated external mode verifies the Bearer header on the model probe and propagates the same secret to the isolated Hermes child. Managed QVAC server authentication remains unavailable through the current official SDK, so alpha.5 does not claim bearer enforcement for managed inference.
