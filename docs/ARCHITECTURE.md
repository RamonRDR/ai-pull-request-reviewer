# Architecture (MVP)

```mermaid
flowchart TD
    A[GitHub REST / Octokit] --> B[PR metadata and paginated changed files]
    B --> C[Unified-diff parser / RIGHT-side line map]
    C --> D[Ignore filters, secret redaction, size limits]
    D --> E{Selected provider}
    E -->|mock: zero cost| F[Synthetic marker response]
    E -->|OpenAI: explicit external consent| G[Versioned system prompt + JSON response]
    F --> H[Zod validation]
    G --> H
    H --> I[Changed-line anchoring, severity filter, duplicate filter]
    I --> J[Markdown report]
    I --> K{Triple publishing consent}
    K -->|no| L[Stop without writes]
    K -->|yes, real only| M[Existing comment fingerprints + GitHub comment review]
```

## Module boundaries

| Module | Responsibility |
| --- | --- |
| `github.ts⟧ | REST authentication, PR metadata and pagination |
| `diff.ts⟧ | RIGHT-side added-line tracking |
| `context.ts⟧ | Ignore rules, source prioritization, safety filtering, limits |
| `config.ts⟧ | Strict repository configuration schema |
| `provider.ts⟧ | Mock and opt-in OpenAI adapters, cost and response validation |
| `review.ts⟧ | Quality gates, anchors, classifications and deduplication |
| `report.ts⟧ | Human-readable, clearly labeled Markdown |
| `publish.ts⟧ | Separately gated, deduplicated review comments |
| `cli.ts⟧ | Explicit CLI orchestration |
| `evaluate.ts⟧ | Synthetic, deterministic regression metrics |

An external GitHub App with webhook infrastructure is intentionally not used. Source code from PR heads is never evaluated inside the reviewer. Review results are advisory.
