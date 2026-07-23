# Artifact and supply-chain evidence

The alpha package is intentionally smaller than the repository. It contains
the built library and companion CLI, Python provider profile, Hermes manifest,
three compatibility shell wrappers, demo, license/readme/changelog, and the
user-facing architecture, configuration, compatibility, host-conformance, and
security documents. Test suites, findings ledgers, internal release reports,
workflows, conformance harnesses, caches, logs, and model artifacts are rejected
by the package gate.

Run the provenance gate only from a clean candidate commit:

```console
pnpm verify:artifact --output-dir /absolute/empty/output-directory \
  > alpha4-provenance.json
```

The JSON records the commit, dirty state, package identity, SHA-256, npm shasum
and integrity, packed/unpacked sizes, complete file inventory, modes, and direct
production dependency tree. It fails on a dirty worktree by default and rejects
recognizable machine home paths and repository-only payloads. `--allow-dirty`
exists only for rehearsal and leaves `dirty: true` in the evidence.

`artifacts/alpha4.cdx.json` is a reproducible CycloneDX 1.6 SBOM generated from
an isolated npm installation of the candidate tarball. It contains 272
components and has SHA-256
`17c056ec308f68598568a89586ef935b5db2a5898e23126bc88385a6a7ff7317`.
The final tarball checksum is recorded only after user-facing payload files are
frozen, avoiding a self-referential checksum inside the artifact.

The protected publish workflow is manual, accepts an explicit ref, targets the
`npm-publish` environment, requires an alpha version, publishes with npm trusted
publishing/provenance, and uses the `alpha` dist-tag. It has no stable publish
path and does not modify `latest`.

Repository secret scanning and push protection are enabled. CI and drift
workflows have read-only repository permission, actions are pinned to exact
revisions, dependency review checks pull requests, CodeQL covers JavaScript/
TypeScript and Python, and production dependencies are audited at high severity.
These controls do not replace review of native QVAC dependencies or upstream
release provenance.
