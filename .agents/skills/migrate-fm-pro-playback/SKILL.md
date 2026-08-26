---
name: migrate-fm-pro-playback
description: Migrate FM-Pro radio playback to a lifecycle-safe Media3 and MediaSession architecture with background, notification, focus, and network verification.
---

# Migrate FM-Pro playback

Read `AGENTS.md`, the architecture and quality contracts,
`.agents/roles/playback.md`, TD-009, and roadmap phase 5.

1. Inventory every service, controller, notification action, start path, stream
   source, and UI callback. Define parity before changing dependencies.
2. Introduce a `PlaybackController` consumed by UI and a Media3
   `MediaSessionService` that owns player state. Never pass Android Views to it.
3. Preserve flavor metadata and analytics semantics. Add bounded reconnect with
   backoff and distinguish offline, stream failure, and terminal errors.
4. Verify audio focus, noisy intent, calls, headset/Bluetooth, notification,
   process death, network switch, and foreground-service behavior.
5. Switch one production path, gather start-latency/error evidence, then delete
   the old service/controller/resources and dependency when unreferenced.

Do not leave two playback engines selected by an indefinite flag. A temporary
rollback flag needs a removal date and technical-debt entry.
