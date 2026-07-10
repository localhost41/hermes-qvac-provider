# Changelog

## Unreleased

- No unreleased changes.

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
