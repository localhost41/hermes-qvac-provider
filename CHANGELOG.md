# Changelog

## Unreleased

- Add the `hermes-qvac` lifecycle CLI with setup, layered config, managed and external runs, foreground serve controls, diagnostics, and exact-response smoke tests.
- Use the official QVAC catalog and managed provider to generate all eight friendly model aliases, preload Hermes' main and auxiliary models, and preserve upstream reuse and cleanup behavior.
- Add atomic ownership-aware install/upgrade/uninstall behavior and isolated Hermes enablement/profile verification.
- Add fake-QVAC lifecycle, port-collision, cleanup, status/stop, fake-Hermes environment/signal, real-Hermes transport, and installed-tarball tests.
- Add Linux Node 22–26 and macOS CI coverage plus scheduled current-QVAC compatibility checks.
- Document configuration, architecture, resource safety, host limitations, and evidence-based OpenClaw parity.
- Harden hostile-state and endpoint handling with bounded parsing, strict session schemas, corrupt-record isolation, recursive secret redaction, subprocess/output limits, and authenticated control health.
- Make setup transactional and serialized, including enablement rollback, interrupted-backup recovery, payload-hashed ownership markers, symlink refusal, and disable-before-delete uninstall safety.
- Harden release-candidate behavior with explicit-only saved configuration, dead-owner lock recovery, exact published-legacy hashes, unexpected-file preservation, symlinked control-directory refusal, process-group cleanup, auxiliary endpoint verification, strict `pong`, and captured-secret redaction.
- Isolate each Vitest run under a private temporary root and remove it during global teardown.
- Add command-specific help, version, config path/validation, model inspection, human diagnostics, exact Hermes exit propagation, and official SDK-constant normalization.
- Expand the release-candidate evidence with requirements traceability, a threat/failure model, test inventory, compatibility/security guidance, adverse real-Hermes transport verification, and packed-product command coverage.
- Accept server-advertised custom model aliases for external endpoints while keeping managed QVAC runs restricted to the official catalog.
- Add release metadata verification and record the macOS clean-room, live-inference, concurrency, tool-use, and known-limitation evidence.
- Add bounded QVAC protocol conformance and moderator clean-room acceptance harnesses.
- Record packed-plugin compatibility with Hermes 0.19.0 and current `main`, plus session-resume and adverse-stream ownership findings.

## v0.1.0-alpha.3 - 2026-07-19

- Add npm discovery keywords and a benefit-oriented package description.
- Clarify that this is an independent community project.
- Align the demo fallback URL with QVAC CLI's `127.0.0.1:11434` default.
- Upgrade npm in the release workflow to support OIDC trusted publishing.

## v0.1.0-alpha.2 - 2026-07-10

- Update `scripts/doctor.sh` to use the current `hermes plugins list` discovery
  surface and avoid removed provider-list commands.
- Add Python unittest coverage for install and doctor script behavior using
  fake local commands instead of a live QVAC server.
- Add package tarball verification for expected runtime assets.
- Add an MIT license and include it in the package.
- Document that Hermes currently has no clean model-provider-local service
  lifecycle hook, so QVAC startup remains manual for v0.2.
- Add lifecycle limitation metadata and tests for the preserved QVAC lifecycle
  config defaults.
- Add public scoped-package publish metadata, explicit Node 22-26 support,
  Node matrix CI, `verify:package` in CI, and a manual alpha publish workflow.
- Expand package verification to install the packed tarball into a clean npm
  consumer, smoke-test JS and Python imports from installed contents, and copy
  plugin assets into a clean `HERMES_HOME`.

## v0.1.0-alpha.1

- Initial repository scaffold.
- Add minimal Hermes QVAC provider descriptor and OpenAI-compatible config helper.
- Add QVAC local server reachability detection with a clear unavailable-server message.
- Add a curated QVAC model catalog with user override support.
- Add streaming capability metadata for the OpenAI-compatible provider path.
- Add Hermes model-provider plugin metadata, install/doctor scripts, and the
  Python provider profile for local QVAC models.
