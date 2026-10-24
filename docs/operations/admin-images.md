# Admin image file or link

All image-bearing admin forms use `ImageField`: station logo/thumbnail, program
cover/thumbnail, episode cover, banners, campaign creative and notifications.
Other network/audio fields keep their existing controls. Existing URL values and
saved field names are unchanged. File uploads and URL paste are separate choices.

## Compression and storage

Accepted input: static JPEG/PNG/WebP, at most2MiB and16million pixels. Raster
signatures are checked before image decoding; SVG/GIF and PNG animation controls
are rejected. The server validates the actual bytes, rotates by orientation,
strips metadata and resizes inside the field bounds without enlarging images.
Adaptive quality/dimension passes enforce these stored-file budgets:

These budgets apply to uploaded files. Pasted URLs are saved as supplied and
their remotely hosted bytes are not downloaded, recompressed or migrated.

| Field | Maximum edge | Hard byte cap | Stored format |
|---|---|---|---|
| Thumbnail |480px|48KiB|WebP|
| Logo |720px|64KiB|WebP, transparency retained|
| Cover |1280px|160KiB|WebP|
| Banner/campaign image |1600px|160KiB|WebP|
| Notification image |1600px|160KiB|JPEG, white background for transparent input|

Detailed images may be reduced further to meet the cap. Flat images also try a
lossless WebP candidate and retain it when smaller. Originals and EXIF/GPS are
not stored; there is one processed object per successful operation. The UI shows
actual stored bytes/dimensions and the reduction when positive. Synthetic
compression measurements are in `/tmp/hudhud-admin-image-compression.json`;
fixture UI statistics are not a production storage benchmark.

JPEG is intentional for notifications: [FCM's format documentation](https://firebase.google.com/docs/reference/fcm/rest/v1/projects.messages#Notification)
says JPEG/PNG have full support while WebP support varies across platforms.
No real notification send or physical-device receipt is implied by an upload.

## Security and lifecycle

`adminUploadImage` is the only upload API. Storage Rules continue to deny all
client SDK reads/writes. The callable requires authenticated `admin=true` and
existing administrative role/scope rules. Station/program/episode parents,
current ownership/deletion markers and account-deletion barriers are checked
transactionally before encoding and again after storage completes. Global media
and station branding require super-admin privileges; station admins may upload
program/episode artwork only for their assigned stations.

Private records:

- `{root}/adminImages/images/{operationId}`: ownership, exact-input/context hash,
  storage path and upload/ready/failed/expired state; not client-readable.
- `{root}/adminImageUploadLimits/actors/{uidHash}`:5-second interval,30 new
  attempts/hour per account/root. Cached ready retries do not consume quota.
- Objects: `{root}/admin-images/{operationId}.webp`, or `.jpg` for notifications.
  Download links are public bearer image URLs suitable for the existing fields;
  do not put them in operational logs.

The idempotent operation ID is bound to the caller, root and exact file/context.
A ready retry returns the stored result without encoding/storing another file;
changed payload/owner cannot reuse the ID. Concurrent uploading work is explicit.
Successful storage is finalized with an atomic private record and server-attributed
`image-upload` audit. An uncertain database acknowledgement is checked before a
ready image can be marked failed.

Uploaded editorial media is a reusable asset independent of saving the form.
Removing a field or closing a draft does not delete an image potentially used
elsewhere. Cancellation means **stop waiting**, not cancellation of a server job
already accepted; generation guards ignore late responses. Retrying the same
selection can recover its ready URL. New drafts/context changes invalidate old
callbacks. Save/send is blocked while upload is pending; errors preserve values.

The existing hourly image collector processes at most25 due failed/interrupted
records per root after their one-hour settling window. It reserves deletion,
validates the root/UUID/path/format, retries storage failures and leaves an expired
private operation marker. Ready assets have no dueAt and are retained. There is
no automatic cleanup of reusable assets based only on an open form's state.

## Verification and rollout

Use Node22.23.4 and the repository commands. Actual evidence is recorded in
WORK_PROGRESS. Coverage includes compressed byte caps/alpha/metadata, format and
APNG rejection, current/foreign ownership, token/actor spoofing, root separation,
retry, cleanup, real Auth/Functions/Storage and denied direct SDK writes. Local
browser fixtures exercise file/link selection, invalid file, failure/retry,
pending save gate, cancel/late result, new draft and narrow keyboard behavior.

Deploy the callable/collector before publishing the updated admin UI, under the
existing deployment authorization. No new dependency, Storage-rule relaxation,
production upload, automatic content save or notification send is introduced by
local verification. Existing content save permission/counter/audit logic remains
in its original trusted server path.

Local acceptance completed2026-10-24: Functions152, admin76, native editorial41,
real callable17, Rules33 and avatar regression3 passed. Admin's17 emulator skips
were run separately in the real callable suite, including saving an uploaded URL
through adminSaveContent. Typecheck/lint/build/governance and strict UI audit
passed. Browser fixture screenshots: `/tmp/hudhud-admin-image-desktop.png`,
`/tmp/hudhud-admin-image-mobile.png`, and
`/tmp/hudhud-admin-image-mobile-200.png`. Logs and exact scope are in WORK_PROGRESS.
