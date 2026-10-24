# HudHud admin UI context

Arabic RTL product administration, using the existing React/Vite dashboard,
Tahoma/Arial type, theme tokens in app/globals.css and maintained ui/Button,
ui/Input and ui/Dialog primitives. Those runtime tokens own color, radius,
spacing and focus; this feature adds no palette/font or competing form system.

Canonical image selection: components/admin/image-field.tsx. Applies to station
logo/thumbnail, program/episode covers, banners, campaigns and notification images.
Existing content/editor permissions remain owned by the root contracts and the
server. The shared field owns file/link switching, preview, busy/error/retry and
stale completion handling. Parent forms own save/send; all block submit while
image upload is pending. Native file picker is intentional and keyboard labeled.

Use existing text-sm labels, rounded-lg previews and wrapping mode buttons.
Show accepted formats/2MiB before selection. Use one inline live status/error,
explicit cancel-wait wording (a callable cannot cancel an accepted server job),
and preserve the saved field on failure/cancel. Show actual output size and
reduction when available. Switching drafts invalidates old results. Existing
unsaved-change navigation policy remains in ContentEditor; do not copy its
legacy browser-confirm behavior into the image field.

Uploaded editorial files are reusable assets. Removing a field/draft does not
remove a file. Only failed/interrupted reservations expire server-side. The
stored URL schema stays unchanged; no direct browser Storage writes are enabled.
Verification: Node units, actual Auth/Storage/Firestore callables, synthetic
browser file/link/error/retry/cancel/draft/keyboard/narrow viewport evidence.
