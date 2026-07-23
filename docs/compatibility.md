# Compatibility

## Tested baseline

| Component | Tested |
|---|---|
| Hermes Agent | 0.18.2 (`e361c5e20402375c74a65ca52810c6a380461226`) |
| `@qvac/openclaw-plugin` reference | 0.1.1 plus QVAC source HEAD `af187820621943a77912867c32e44ab493a36556` |
| `@qvac/ai-sdk-provider` | 0.3.0 |
| `@qvac/cli` | 0.8.1 |
| Node | 22, 24, 26 |
| Python profile | 3.11–3.13 CI matrix; real Hermes Python 3.11 |
| OS | macOS and Linux CI targets; local release-candidate validation on macOS arm64 |

Hermes currently has no stable third-party ProviderProfile version contract published independently of Hermes releases. The profile filters optional constructor fields by the inspected signature, but it does not suppress constructor failures. Hermes 0.18.2 is the original fully verified live-inference host version. Hermes `v2026.7.20` (0.19.0) and the recorded `main` snapshot also pass packed-plugin discovery, profile import, diagnostics, lifecycle, real-host transport smoke, and live QVAC 0.8.1 inference. `doctor` performs an actual subclass import so an incompatible future host fails visibly. Exact revisions and scope are in [Hermes host conformance](hermes-host-conformance.md).

The package engine range is Node `>=22 <27`, matching the current pnpm toolchain and the versions exercised by CI. The Python source and current Hermes host require Python 3.11 or newer; CI covers 3.11–3.13.

## Scheduled drift check

Every pull request verifies the real provider contract against the supported Hermes 0.19.0 tag and current Hermes main. The weekly/manual compatibility workflow installs the locked project, updates official QVAC packages to their latest versions with `--no-save`, asserts `package.json` did not change, and reruns TypeScript, Python, and packed-consumer verification on Linux and macOS. It also clones current Hermes source and verifies that the packaged profile remains an actual `ProviderProfile`.

This workflow diagnoses compatibility; it never changes dependency constraints, commits files, publishes packages, or downloads a model.
