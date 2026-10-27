# B16 wire proposal revision handoff

Proposal only. No repository source, tests or documents changed; no B16 execution,
E/F, messaging, production, migration or deployment performed. Parent I integrates
only after a separate independent re-review and B16 remains blocked by B15.

Revision addresses independent B16-W01/W02 in B16-wire-contract-review.md:

- Exact ordered legacy state matrix preserves unexpired claimed ownership and
  expired safe prepared reclaim, sending ambiguity, terminal sent/unknown,
  retryable failures before/after original retryAt, nonretryable/expired outcomes
  and malformed state. Missing legacy fingerprint alone is valid V1. Safe carry
  requires actual quiescence/drain, exact source CAS, absent V2 and unambiguous
  mapping; it copies original attempts/clocks/state. Runtime claim increments
  the carried counter once and cannot refresh expiry or bypass backoff. A fresh
  V2 key is not an escape from legacy policy. Terminal evidence dominates, while
  ambiguous multi-source carry is a preview blocker, not guessed state merging.
- Both mapped source versions and carried constraints are reread at actual start.
  The new inline lineage must survive the existing reclaim set without adding
  a claim argument, generic metadata service or changing other sender defaults.
- Dates alone are sorted/deduplicated. Each hash stays at the corresponding date
  index and is validated as H([programId,date]); hashes are never separately
  sorted. The provided wire-review-4 reversed-hash counterexample is retained.
- Existing fixed-offset/same-local-day0..10 policy, key/fingerprint tuples,
  native commit identity vs ms leases, private job/receipt shapes, bounded25
  occurrence/31day operations, frozen SDK/AEAD checkpoint controls, receipt
  retention, separate bounded broadcast cleanup and non-erasing rollback stay.
- Explicitly reject calendar endpoints outside native years0001..9999 and avoid
  year0..99 coercion. Record commit identity separately from copied receipt clocks.

Exact fresh baseline/candidate hashes and superseded proposal hash are in
/tmp/hudhud-b16-wire-provenance.json. Revised patch is
/tmp/hudhud-b16-wire-contracts.patch; git apply --check passed. No new policy
choice is requested. Actual live cutoff, key custody and independently proven
notifier/collector quiescence remain later operational inputs; production
apply/restore is unsupported without real isolation, never enabled by a flag.
