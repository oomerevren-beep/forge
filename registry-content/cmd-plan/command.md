# /plan — structured planning before code

Invoke when the user wants a plan for non-trivial work. No code until the plan is approved.

## Steps

1. Clarify the goal: restate the task in one sentence and confirm unknowns (ask, don't assume).
2. Explore: read the relevant code/docs first — plans based on guessing are banned.
3. Write the plan: goal, non-goals, step-by-step approach, files to touch, how to verify each step, risks.
4. Present in digestible chunks and wait for approval. Only then implement.

## Rules

- Plans are cheap, rewrites are expensive — front-load the thinking.
- Every step names its verification (`npm test`, a repro command, a manual check).
- If the user says "go", execute the approved plan without re-asking.
