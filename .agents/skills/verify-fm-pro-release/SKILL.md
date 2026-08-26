---
name: verify-fm-pro-release
description: Verify an FM-Pro change, phase, or release against contracts, affected flavors, tests, playback and UX matrices, security gates, and rollout evidence.
---

# Verify FM-Pro delivery

Read `AGENTS.md`, `docs/contracts/quality-release-contract.md`,
`docs/roadmap/definition-of-done.md`, `.agents/roles/quality-release.md`, and the
contracts changed by the work.

1. Inspect the diff and map its blast radius across flavors, data, permissions,
   navigation, playback, resources, and lifecycle.
2. Run governance first, then the smallest relevant unit/integration/UI suite and
   affected debug builds. Add the playback or accessibility matrix when triggered.
3. Report every check as pass, fail, or not run with command/environment. Build
   success alone does not prove behavior.
4. Confirm no replaced legacy path, duplicated source of truth, secret, sensitive
   log, raw `null`, unowned TODO, or undocumented adapter remains.
5. Compare measured release metrics to the baseline and require rollback evidence
   before recommending rollout expansion.

This skill verifies only. Do not fix findings, release, or mutate external systems
unless the user separately authorizes those actions.
