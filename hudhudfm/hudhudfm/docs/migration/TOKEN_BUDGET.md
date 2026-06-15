# Token Budget And Agent Protocol

Use this protocol to keep future agent work bounded.

## Default Budgets

| Work type | Budget |
| --- | ---: |
| Initial file discovery | 1,500 tokens |
| Single feature analysis | 2,500 tokens |
| Code review report | 2,000 tokens |
| Implementation plan | 1,500 tokens |
| Final handoff | 1,000 tokens |

## Agent Rules

- Read only the files needed for the assigned role.
- Report findings with file paths and line numbers when available.
- Do not duplicate findings already owned by another agent.
- Prefer a maximum of 10 findings per pass.
- Separate confirmed defects from risks and assumptions.
- Do not propose new dependencies without naming the feature that requires them.
- Do not edit files unless the main agent explicitly assigns implementation.

## Required Handoff Shape

```text
Scope:
- What was reviewed or changed.

Findings:
- Ordered by severity.

Files:
- Concrete file references.

Verification:
- Commands run or why not run.

Next:
- Smallest useful next step.
```
