# Changelog

## Unreleased

- Document that Hermes currently has no clean model-provider-local service
  lifecycle hook, so QVAC startup remains manual for v0.2.
- Add lifecycle limitation metadata and tests for the preserved QVAC lifecycle
  config defaults.

## v0.1.0-alpha.1

- Initial repository scaffold.
- Add minimal Hermes QVAC provider descriptor and OpenAI-compatible config helper.
- Add QVAC local server reachability detection with a clear unavailable-server message.
- Add a curated QVAC model catalog with user override support.
- Add streaming capability metadata for the OpenAI-compatible provider path.
- Add Hermes model-provider plugin metadata, install/doctor scripts, and the
  Python provider profile for local QVAC models.
