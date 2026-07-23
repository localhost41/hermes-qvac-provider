# Security and privacy

QVAC inference is local by default, but this integration still crosses process, filesystem, and HTTP boundaries. The detailed analysis is in [threat-model.md](threat-model.md).

Key properties:

- Managed QVAC binds only to `127.0.0.1` or `localhost`.
- External endpoints must be HTTP(S), end in `/v1`, and cannot embed credentials, queries, or fragments.
- API markers are passed through environment variables and HTTP headers, never command arguments.
- Structured output recursively redacts keys, authorization values, tokens, passwords, and secrets.
- Configuration, session records, ownership markers, and locks are private to the user.
- Endpoint and captured-process data are bounded.
- Setup refuses symbolic or unrecognized plugin targets and rolls back if Hermes enablement fails.
- Uninstall disables first, then removes only a real directory whose schema-qualified ownership marker has matching SHA-256 digests for every runtime asset. Package-name-only markers and tampered payloads are refused.
- Authenticated endpoint probes reject redirects, preventing credentials from being forwarded beyond the configured endpoint.
- `stop` uses a random authenticated loopback endpoint and never signals a recorded PID directly.
- QVAC process ownership and shared cleanup remain with the official managed provider.
- The npm package has no install/postinstall script.

Do not put a production remote API credential in examples, issue reports, command output, or diagnostic attachments. `config show` redacts a configured non-placeholder key, but the saved configuration file necessarily contains the value supplied by the user and is mode `0600`.

For a security-sensitive deployment, keep `HERMES_HOME` on a local user-owned filesystem, inspect any custom `--bin`, prefer HTTPS for remote external endpoints, and run `pnpm audit --prod` before packaging.
