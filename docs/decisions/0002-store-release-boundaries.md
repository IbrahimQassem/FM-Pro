# ADR 0002 — release environment and account boundaries

Date: 2026-09-06  
Status: adopted for local implementation of the authorized release plan.

## Decision

Preserve the existing Firebase project architecture: `HudHudDev` and
`HudHudOfficial` partition application data but share Firebase Auth. They are not
independent security tenants. Do not create or migrate a production project as a
side effect of these fixes.

- Mobile release uses `HudHudOfficial`; reject unknown roots and Development in
  production. Admin builds require an explicit root. Root-local account/profile
  and verification calls carry a validated canonical root; omitted roots in older
  clients mean Development only for compatibility, never unknown-value fallback.
- Deleting an account means deleting that shared identity and its data in BOTH
  canonical roots. Disable both profiles, persist root-qualified cleanup work,
  remove owned/inbound records only in canonical path shapes, reconcile both
  roots, and delete Auth last. Unknown collections/roots are outside the cleanup
  boundary. After deletion, retain a private minimal status/expiry marker keyed
  by UID for 24 hours; the daily sweep removes it after confirming Auth absence.
  Normal cleanup is within the following daily sweep, not an unconditional
  deadline if the scheduler fails. This prevents stale-token/in-flight request
  resurrection and must be disclosed in privacy copy. Scheduled unverified-account
  cleanup must inspect both roots.
- Only trusted Firebase Auth email verification permits personal writes. A social
  provider or linked provider alone must not set or substitute for email proof.
  Missing/unverified email follows the existing server OTP flow.
- OTP acceptance atomically consumes a single active proof. Failed downstream
  work resumes from the immutable server reservation; it never makes a consumed
  code reusable or lets resend replace unfinished work.
- The confirmed scope includes camera/gallery uploads alongside the four bundled
  mascot avatars and validated HTTPS provider images. Profile updates remain
  server-mediated. JPEG/PNG uploads are capped at 1 MB and 16 million input pixels,
  re-encoded without EXIF metadata and stored under owner/root-scoped paths.
  Direct client Storage reads/writes are denied; the profile receives an unguessable
  bearer download URL. Replacement removes the old object. Durable private jobs
  retry interrupted cleanup hourly. Account deletion removes images in both roots
  and retains cleanup tombstones for at least one hour to catch in-flight saves;
  the next successful collector removes those tombstones and any late objects.
  Local filesystem paths are never persisted as avatars.
- Share actions use platform store destinations and content names. Canonical
  content deep links remain deferred; raw audio URLs are not shared.
- Android release fails without complete non-debug signing configuration. iOS
  requires its numeric store ID, Apple/APNs capabilities and distribution proof.
  No placeholder numeric store ID or credentials may be invented.

## Delivery and external evidence

The user's instruction to execute the release plan authorizes local code,
configuration, Rules, tests and documentation fixes. Production mutation, signing
credentials and store operations still follow the concrete release gates and any
existing action-specific authorization; do not duplicate permission requests.

First-publication versus update status, numeric Apple ID, signing/provider setup,
legal/content ownership, physical-device testing and live moderation/monitoring
remain evidence requirements, not assumptions of success. Prepare their artifacts
while independent implementation continues.

Rollout and forward recovery follow the platform-specific process and official
sources in the [dated review](../release/store-release-readiness-review-2026-09-06.md#7-rollout-and-recovery-corrections).
An old app binary cannot be treated as an instant downgrade of installed clients.

## Verification

Regression tests must cover both canonical roots, unknown-root sentinels,
unverified social tokens, OTP lockout/concurrency/recovery, complete deletion and
profile validation. Verify the actual signed candidate and all required device
journeys before declaring store readiness. Record results in the
[execution tracker](../release/store-release-execution-plan.md).
