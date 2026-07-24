# Hermes host conformance

These results exercise the packed alpha.4 candidate, not files imported from the
developer checkout. Each run used a fresh `HOME` and `HERMES_HOME`, copied the
plugin through its public setup command, checked real Hermes discovery, imported
the real `ProviderProfile`, ran `doctor`, performed a real Hermes transport smoke
against the bounded QVAC fixture, repeated setup, uninstalled, and verified that
discovery disappeared.

| Hermes lane | Source revision | Python | Result | Scope |
| --- | --- | --- | --- | --- |
| 0.18.2 | `e361c5e20402375c74a65ca52810c6a380461226` | 3.11.15 | Pass | Existing live-inference baseline plus packed acceptance |
| v2026.7.20 / 0.19.0 | `3ef6bbd201263d354fd83ec55b3c306ded2eb72a` | 3.11.15 | Pass | Packed acceptance, transport smoke, and live QVAC 0.8.1 inference |
| `main` snapshot | `3f9944bad92ed00f9116cfbad6326cceecb39151` | 3.11.15 | Pass | Packed acceptance, transport smoke, and live QVAC 0.8.1 inference |

The release and `main` lanes reused an already installed compatible Hermes
Python environment while loading the exact checked-out Hermes source through
`PYTHONPATH`. They therefore prove source/profile compatibility, discovery, and
transport behavior, but are not claims that Hermes' installer itself was tested.
The two newer lanes each returned exact `pong` through a packed plugin and a
cached Qwen3.5 0.8B model. Hermes itself was loaded from each exact source
revision; the plugin was loaded only from the tarball installation.

The acceptance runner is:

```console
node scripts/moderator-acceptance.mjs \
  --tarball /absolute/path/to/localhost41-hermes-qvac-provider-0.1.0-alpha.4.tgz \
  --hermes-source /absolute/path/to/hermes-agent \
  --hermes-python /absolute/path/to/python \
  --live-base-url http://127.0.0.1:11434/v1 \
  --live-model qwen3.5-0.8b
```

It emits a sanitized JSON report and never reads the user's existing Hermes
configuration. The optional live pair connects only to an already running QVAC
endpoint; the runner never downloads a model or starts QVAC itself.

## Adverse transport boundary

Success and a semantically wrong response exit naturally. HTTP 503, malformed
SSE, premature close, delay, and non-stream responses required bounded harness
termination on Hermes 0.18.2. See [Adverse stream behavior](adverse-stream-report.md).
The plugin does not mask those host behaviors with an unofficial retry or parser.

## Session resume boundary

`--resume` combined with one-shot mode is not a valid resume test because Hermes
dispatches the one-shot path first. Interactive restoration with explicit QVAC
provider and model was observed, but a complete automated resumed turn remains
provisional. See [Session resume investigation](session-resume-investigation.md).
