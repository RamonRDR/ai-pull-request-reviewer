# Architecture decisions

## ADR-0001: GitHub Action and CLI before GitHub App

**Decision:** an on-demand TypeScript CLI, runnable in GitHub Actions.

**Why:** installation requires only a token with minimal read permissions and no webhook server, database, queue, hosting or App registration. It is easy to demonstrate and test offline. GitHub App installation, scoped permissions and signed webhook processing are future work, not claimed MVP features.

## ADR-0002: Read-only by default

**Decision:** no automatic GitHub review posting or merge. A local Markdown report is the normal outcome. Posting requires three independent opt-ins and rejects mock, fork and incomplete results. All GitHub Actions in this repo have read-only permissions.

**Tradeoff:** demonstration is safe but a live write path remains unproven until separately authorized.

## ADR-0003: Opt-in external LLM and conservative limits

**Decision:** mandatory checks use deterministic mock fixtures at zero cost. OpenAI adapter requires explicit authorization, API key, public repository, positive current model prices and budget checks.

**Tradeoff:** the mock cannot be represented as real AI review. Real-model accuracy requires independent evaluation, additional rate-limit and transient-failure analysis, and approved test budget.

## ADR-0004: Anchors and safe truncation

**Decision:** consume GitHub REST file patches, map added lines to RIGHT-side file line numbers, reject missing/incomplete patches and skip files exceeding context budget. Never invent line numbers from diff positions. Record skipped files.

**Tradeoff:** less coverage on very large diffs in return for precise citations and predictable resource use.

## ADR-0005: JSON configuration and Zod

**Decision:** version a single JSON file and strict schema; avoid YAML parsing dependencies, database or external state. The CLI keeps provider and reporting logic separate.

**Tradeoff:** advanced per-language rules and stateful cache are not in MVP.
