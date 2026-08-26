---
name: modernize-fm-pro-feature
description: Modernize one native FM-Pro feature incrementally by adding testable boundaries, preserving flavors, and removing the replaced legacy path.
---

# Modernize an FM-Pro feature

Read `AGENTS.md`, `docs/contracts/architecture-contract.md`, the feature's
product/data contract, and `.agents/roles/android-modernization.md`.

## Workflow

1. Map entry points, callers, XML/Manifest resources, Firebase access, player
   coupling, and flavor overrides. Record current observable behavior.
2. Add a characterization test or the smallest seam that makes behavior testable.
3. Define one canonical model/state and repository interface. Adapt legacy data
   at the boundary; do not copy the model under a new suffix.
4. Move one vertical flow through ViewModel/state/use case/repository.
5. Switch the existing UI to the new flow, verify all affected flavors, then
   remove the replaced code and unused resources in the same change.
6. If an adapter must remain, add a technical-debt ID with owner and removal gate.
7. Update roadmap/debt/ADR only where their authoritative state changes.

Do not introduce direct Firebase calls in UI, a Service-to-View reference, a
module split, or Compose without the decision required by the architecture contract.
