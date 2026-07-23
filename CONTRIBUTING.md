# Contributing

Keep lifecycle work aligned with the official `@qvac/ai-sdk-provider`; do not add a second QVAC supervisor or copied TypeScript model catalog.

Before proposing a change:

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm test:python
pnpm verify:package
```

When a real local Hermes installation is available, also run:

```bash
pnpm smoke:transport
pnpm verify:hermes
```

Do not run the physical smoke merely as a routine test. It can download multiple gigabytes and requires explicit `--yes` consent.

Update the capability matrix, requirements traceability, threat model, test inventory, README, and changelog when behavior or claims change. Do not add unexplained test skips. Tests that launch processes must use bounded polling and prove cleanup.
