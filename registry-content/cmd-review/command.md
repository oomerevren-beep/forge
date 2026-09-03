# /review — code review on demand

Invoke when the user wants the current changes reviewed.

## Steps

1. Collect the change: `git diff` + `git status` (+ the PR description if there is one).
2. Review correctness first (logic, edge cases, error paths), then security, then tests, then readability.
3. Run the tests yourself when possible; report the real result.

## Output

- **Verdict:** approve / request changes / comment.
- **Blockers:** file:line + concrete fix each.
- **Nits:** labeled non-blocking, grouped.

## Rules

- Cite file:line for every finding; no invented issues.
- Proportional: small diff, short review.
