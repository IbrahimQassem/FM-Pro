---
name: orchestrate-fm-pro-task
description: Execute one bounded FM-Pro roadmap task from a machine-readable contract through scoped implementation, independent verification, and a review-only pull request. Do not use for production writes, releases, secrets, signing, Firebase Rules, or binding contract changes.
---

# Orchestrate an FM-Pro task

Use only in the native `FM-Pro` repository after a task is selected from the
authoritative roadmap.

1. Read `AGENTS.md`, the task contract under `.agents/tasks/`, its owner role,
   implementation skill, roadmap item, and only the contracts named by them.
2. Run `python3 tools/agent-task.py preflight <task.json>`. Stop on any failure;
   do not widen the task to make preflight pass.
3. Implement only the objective and `allowed_paths`. Preserve unrelated user
   changes and do not modify a second work package in the same run.
4. Run the task's fixed verification gates with
   `python3 tools/agent-task.py run-gates <task.json>`. The script, not the JSON,
   owns executable commands.
5. Run `scope` against the task base branch and include the working tree when
   the changes are not committed. Any out-of-scope path is a failed task.
6. Hand the diff and gate report to a separate Quality release review. The
   implementer must not mark its own output approved or merge it.
7. End at a reviewable PR carrying the `agent-change` label. Never merge,
   release, deploy, publish Firebase changes, rotate secrets, or perform external
   writes without separate explicit authorization.

For a new task, copy `.agents/tasks/examples/example-task.json` to
`.agents/tasks/<task-id>-<slug>.json`, replace every example value, validate it,
and commit the contract with the implementation so CI can enforce its scope.

If risk becomes broader than the contract, stop and return the discovered scope,
evidence, and the smallest proposed contract change. Do not edit the contract
after implementation merely to legalize unexpected files.
