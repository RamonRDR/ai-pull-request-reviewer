# Security model and operational limitations

This is a demonstrative developer tool, **not a certified security scanner**.

## Trust boundaries

1. GitHub metadata, file paths, patch text and PR descriptions are **untrusted input**.
2. Repository configuration is schema-checked. For privileged integrations, fetch configuration only from a trusted base branch, never from a PR head.
3. A remote LLM receives only prepared, redacted, **public repository** diff context when the operator explicitly enables it. This is still a data transfer to a third party.
4. LLM responses are untrusted output and are validated before appearing in the report or as review comments.
5. GitHub write operations need separate explicit user-level CLI, configuration and environment consent.

## Controls

- `pull_request⟧ CI with read-only `contents⟧ permission and no LLM credentials.
- No `pull_request_target⟧ or privileged checkout of fork code.
- No execution, dependency installation or shell interpretation of the **analyzed PR** by the review pipeline.
- Path filters for `.env⟧, private keys, generated/build/vendor files, lockfiles, binaries and large patches.
- Generic token/secret redaction before provider calls and before report generation.
- Max files, context characters, input/output tokens, comments and USD budget.
- System prompt states that patch content is data; malicious instructions in diffs must be ignored.
- Zod schema validation; every finding must map to a changed RIGHT-side line.
- Deduplication within a run and query-based fingerprints across published runs.
- No automatic approval, rejection, merge, deployment or modification of source code.
- Never publish simulated output, findings on forks or incomplete review results.

## Known residual risks

- **Prompt injection cannot be guaranteed prevented.** Models can still be misled by crafted diffs.
- **Secret detection is incomplete.** Unusual credential formats, encoded values, documentation and private business logic may leak if sent externally. Do not use external LLM mode for confidential code.
- Token estimates and external prices are approximations, not billing guarantees. Configure actual prices and conservative budgets.
- GitHub API truncates some large or binary diffs. Partial review must be disclosed, not silently treated as clean.
- New findings on the same changed line may be merged by coarse deduplication.
- An LLM can invent a plausible-sounding issue; it cannot validate runtime behavior without executed tests.
- No production GitHub App/webhook signature verification is implemented because the MVP uses an on-demand CLI/Action.
- Review publication was not enabled or tested against a real repository during initial development.

## Incident response

Disable publication by leaving `enablePublishing⟧ false and remove `ALLOW_GITHUB_COMMENTS⟧. Revoke any exposed GitHub/LLM tokens at their provider. Inspect GitHub Actions logs and audit trails. Rotate keys before running again. Report security issues privately to the repository owner rather than pasting secrets into public issues.

## Operational guidelines

Use fine-grained short-lived tokens; scope to one repository. For automated jobs use the GitHub Actions provided token, not personal tokens. Avoid fork PR writes. Never log raw request bodies, LLM responses or secrets. Validate newly adopted action and package versions during dependency updates.
