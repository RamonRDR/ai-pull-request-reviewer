# Reproducible demonstration

1. Install dependencies: `npm install⟧.
2. Run `npm run demo⟧.
3. Open `reports/demo.md⟧ and observe **SIMULATED DEMO ONLY**.
4. Verify the two synthetic markers `DEMO_EDGE⟧ and `DEMO_BUG⟧ produce distinct findings referencing added lines of `src/average.ts⟧.
5. Verify the synthetic correct change in `src/greeting.ts⟧ produces no finding.
6. Run `npm run evaluate⟧ to generate deterministic fixture metrics for 27 cases, including two prompt-injection texts. Results measure only the marker-based mock.
7. Run `npm test⟧ to exercise diff anchors, budgets, filters, schema validation, deduplication and permission gates.
8. Open the GitHub Actions `CI⟧ run and inspect the `simulated-review-report⟧ artifact. No user tokens or external LLM API usage is required.

## Human verification checklist

- Were review comments actually posted? **No, deliberately disabled.**
- Were real vulnerabilities detected by an AI model? **No, the default demo is synthetic.**
- Was source code from a third-party PR executed? **No.**
- Is any merge performed automatically? **No.**
- Does the model always find real issues? **Not established.**

No GIF or screenshot is required for the MVP; only include visual evidence if captured and tested later.
