# Model experience — alpha.4

This is a small compatibility sample, not a quality leaderboard. All models
were already cached; no model was downloaded for this pass. The host was a
16 GiB Apple Silicon Mac with about 16 GiB free disk at the start.

| Model | Protocol | Hermes sample | Result |
| --- | --- | --- | --- |
| Qwen3.5 0.8B | 8/8 bounded conformance cases passed | Packed Hermes 0.19.0 release and `main` each returned exact `pong` | Integration pass; prior tool-quality failures still make it unsuitable as the recommended agent |
| Qwen3.5 2B | Previously verified transport | Three exact-`pong` trials | 3/3, 26–27 seconds each; prior file-write trial falsely claimed success |
| Qwen3.5 4B | Not run | Not run | Artifact was not cached; no download was justified with only about 16 GiB free |
| Qwen3.5 9B | 8/8 bounded conformance cases passed after a fresh restart | Earlier file read/write passed; current exact-response attempts did not finish inside a 75-second bound | Protocol pass, task evidence mixed; cancellation left the server busy until restart |

The 9B result does not invalidate the earlier successful file-tool evidence,
but it does show that an exact-answer smoke is not a model-quality guarantee.
The default remains the strongest physically tested model on this host, while
the documentation must preserve the latency, memory, and cancellation caveats.

Models above 9B were not loaded because their official artifact sizes exceed
the available disk or leave inadequate runtime headroom. No quality claim is
made for them.

Keep these classifications separate:

- Protocol pass: the server accepts and terminates a bounded request correctly.
- Plugin pass: Hermes discovers the provider and transports a response through it.
- Model task pass: the model actually performs the requested action and the
  filesystem result confirms it.

A textual claim of success without the requested filesystem change is a model
task failure even when protocol and plugin transport both passed.
