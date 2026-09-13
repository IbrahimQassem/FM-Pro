# ADR 0004 — Public web discovery and optional accounts

Date: 2026-09-13. Accepted for development by the request to complete all three
roadmap phases. Release, deployment and real notification sending are excluded.

Guest catalog/listening remains read-only. Station URLs use `?station=<id>`;
optional `program`/`episode` IDs are resolved against visible canonical content,
never interpreted as external URLs or autoplay commands. This extends ADR 0002's
previously deferred deep links for the public web only. The owning Hosting target
is `sanadev-fm`; share links use the current origin so development stays local.
Android uses AppConfig's package ID; iOS stays unavailable until its numeric ID is
provided. Policy/deletion links retain the existing admin-hosted routes.

Account UI loads on explicit navigation. Firebase Auth uses session persistence;
email/password registration and the existing server OTP verification, profile,
recent-auth deletion and subscription callables are reused unchanged. There are
no direct personal writes. One account-bound subscription listener is disposed on
identity/verification change. Generation checks discard old asynchronous results.
Guest local favorites/history contain bounded station IDs only (existing history
also retains its non-personal play timestamp). Follow and browser alerts are
separate opt-ins; new follows always start with alerts off.

Browser FCM uses a bundled service worker and an explicitly configured public
VAPID key. No prompt occurs on startup. Token values stay in SDK/private backend
and transient memory; the application stores only an opt-in boolean. Registration
is reconciled on account start/foreground, unregister precedes normal sign-out,
and failure blocks sign-out with retry. Notification navigation validates version,
root and all IDs; canonical content is refreshed and never autoplays. The worker
handles notification clicks before Firebase's handler. Foreground alerts remain
in a bounded in-memory list. Missing browser capability or VAPID configuration
shows an unavailable state while station following still works.

Both roots and owner/guest/disabled cases use existing emulator gates. Browser
checks use synthetic fixtures. Real provider configuration, VAPID provisioning,
Safari/device receipt and production timing remain external verification evidence;
local builds and emulator success do not prove them.

On restart with revoked permission or unavailable push configuration, an SDK token
may not be recoverable for the device callable. SDK token deletion then invalidates
delivery; any unreachable private ownership record remains subject to ADR 0003's
invalid-token removal/30-day expiry. Account deletion still cleans both roots.

## Google sign-in and profile parity — 2026-09-13

The public web also supports Google through Firebase Auth's popup flow, invoked
only by an explicit click. Cancellation, blocked popups, provider configuration
errors and account conflicts leave email sign-in available. No OAuth credentials
are copied to application storage or sent to profile callables. Email verification
continues to come only from Firebase Auth, including Google accounts.

The account hub separates guest login/registration, listener profile management,
and existing follows/alerts. The profile editor saves a name plus an optional
portable mascot path or JPEG image through `updateAccountProfile`. It preserves
the current avatar on a name-only change. Camera/gallery inputs are selected
explicitly and processed in memory, capped at 4 MB/16 million pixels, resized
to 512px and submitted within the existing 1 MB callable limit. Server validation,
metadata removal, root-scoped storage and cleanup remain unchanged (ADR 0002).

Password accounts reauthenticate with their password. Google-only accounts
reauthenticate through Google before device cleanup and account deletion. Any
reauthentication or cleanup failure prevents deletion; deletion failure prevents
sign-out. Unsupported provider-only accounts use the existing app deletion flow.
Provider badges describe linked methods without adding automatic linking or
creating a parallel identity. Account changes clear profile drafts and listeners.
