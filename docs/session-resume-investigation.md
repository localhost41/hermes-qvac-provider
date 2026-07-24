# Hermes session-resume investigation

## Outcome

The previously observed empty-model request is not evidence of a QVAC plugin
defect. Hermes 0.18.2 routes any invocation containing `-z/--oneshot` through
its one-shot fast path before its interactive resume path. That fast path calls
`run_oneshot()` with only the command-line model/provider values; `--resume`
is not applied. Combining `--resume SESSION -z PROMPT` without repeating a
model therefore produced a request with no usable model.

This combination is not advertised by this project and must not be used as a
session-resume test.

## Evidence

- A first isolated one-shot QVAC transport turn completed and created a Hermes
  session with the expected user and assistant messages.
- `hermes sessions list` returned the new session ID.
- `hermes --resume ID -z ...` did not restore the interactive session path and
  hit the bounded process timeout.
- Source inspection of both the 0.18.2 checkout and Hermes `v2026.7.20` shows
  one-shot dispatch before interactive `cmd_chat()` resume handling.
- A PTY launch of `hermes --resume ID --provider qvac -m qwen3.5-9b --cli`
  visibly restored the correct session ID, prior conversation, and model. The
  automated prompt injection used during this audit did not reliably drive
  `prompt_toolkit`, so a second interactive turn remains unverified rather than
  being reported as a failure.

## Ownership and next action

No plugin patch is justified. The plugin already passes explicit provider and
model values for its launched Hermes process. Interactive resume is **outside
the supported plugin surface** for alpha.5 and the planned beta. A future
release may add it only after a stable PTY harness or a human-driven live
session completes a second turn while preserving the stored provider and model.
If Hermes intends one-shot resume to work, that is a generic Hermes feature
request; no QVAC-specific workaround should be added.
