# Draft Hermes maintainer review packet

Status: prepared for user approval; not sent.

## Purpose and placement

`@localhost41/hermes-qvac-provider` is an independent user model-provider plugin.
It installs by copy beneath
`$HERMES_HOME/plugins/model-providers/qvac`, uses `kind: model-provider`, and
registers a real `ProviderProfile`. No Hermes-core special case is required and
the package does not claim Hermes endorsement.

Hermes currently exposes a declarative provider surface but no generic plugin
lifecycle hook for supervising a local model service. The `hermes-qvac`
companion CLI therefore owns setup/doctor/start/run/status/stop/uninstall while
the official QVAC managed provider owns the QVAC child. That boundary can be
retired if Hermes later provides a generic lifecycle surface.

## Provider and configuration mapping

- Name `qvac`; aliases `local-qvac` and `qvac-local`.
- `QVAC_BASE_URL` and `QVAC_API_KEY` are the environment boundary.
- Empty `models_url` preserves current Hermes local-model discovery behavior.
- Defaults: Qwen3.5 9B, Qwen3.5 2B auxiliary, 8,192 output tokens, 32,768
  context, vision enabled, and eight official fallback aliases.
- Optional profile constructor fields are filtered against the inspected
  Hermes signature; constructor/import failures remain visible in `doctor`.

## Host evidence

- Hermes 0.18.2 at `e361c5e2`: existing live baseline and packed acceptance.
- Hermes 0.19.0 release at `3ef6bbd`: packed discovery, profile import, doctor,
  mock transport, live QVAC inference, upgrade, uninstall, and cleanup passed.
- Hermes `main` snapshot at `3f9944ba`: same packed acceptance and live pass.
- Ten setup/upgrade and ten uninstall/reinstall cycles preserved an identical
  installed payload and removed discovery on final uninstall.

## Findings needing host guidance

- `--resume` combined with one-shot mode follows the one-shot dispatch path and
  is not a valid resume test. Interactive state restoration was observed, but a
  fully automated resumed turn remains provisional.
- HTTP 503, malformed SSE, premature close, delay, and non-stream responses
  required bounded harness termination on 0.18.2 rather than natural host exit.
- On macOS, process-group signaling can return `EPERM`; the companion CLI now
  snapshots verified descendants and signals them individually, with cleanup
  regression coverage.

Detailed evidence is in `docs/hermes-host-conformance.md`,
`docs/session-resume-investigation.md`, and `docs/adverse-stream-report.md`.

## Requested technical corrections

1. Is this `ProviderProfile` integration using the intended standalone plugin
   surface?
2. Is a companion lifecycle CLI appropriate while provider plugins remain
   declarative?
3. Is a generic lifecycle hook planned that this plugin should later adopt?

This asks for correction of technical assumptions, not endorsement.
