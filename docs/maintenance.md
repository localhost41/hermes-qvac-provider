# Maintenance contract

This is an independent community integration. Compatibility is maintained
against the pinned supported Hermes/QVAC versions and observed weekly against
current official QVAC packages and Hermes `main`. Scheduled checks report drift;
they never change constraints, commit, open pull requests, publish, or download
models.

- Supported Node: 22, 24, and 26.
- Provider profile: Python 3.11–3.13 checks; live evidence currently uses 3.11.
- Operating systems: macOS arm64 live; Linux x64 automated package gates but no
  recorded live inference; native Windows is not claimed.
- Hermes: 0.18.2, 0.19.0 release, and the recorded `main` snapshot have live or
  packed evidence described in the compatibility matrix.
- QVAC: locked CLI 0.8.1 and AI SDK provider 0.3.0; current official packages
  are observed by the non-mutating drift lane.

Compatibility-affecting dependency updates require a focused pull request,
clean-room package test, and updated evidence. A deprecated alias or option
should remain through at least one alpha with a migration note unless keeping it
would be unsafe. Stable compatibility and deprecation promises will be defined
only if the project reaches a stable release.

For defects, attach sanitized `hermes-qvac doctor --json` output and classify
the failing boundary when possible:

- Plugin: install, discovery, generated configuration, lifecycle, redaction, or
  environment propagation.
- Hermes: ProviderProfile loading, session behavior, tool loop, host timeout, or
  response consumption.
- QVAC: model loading, OpenAI-compatible protocol, inference termination, model
  registry, or native runtime.

Security-sensitive reports should not include credentials, full home paths, or
private prompts. Follow the repository's existing security guidance and use a
private GitHub security advisory when disclosure should not be public.
