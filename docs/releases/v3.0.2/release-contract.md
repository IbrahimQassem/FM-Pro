# HudHud FM Release Contract — v3.0.2

```yaml
release:
  product: HudHud FM (هدهد إف إم)
  version: 3.0.2
  release_type: Production Maintenance & Feature Release
  release_date: "2026-09-20"
  build: "32"
  platforms:
    - Android (target: Google Play, applicationId: com.sana.dev.fm)
    - Web Admin (web_admin, internal operations)
    - Cloud Functions (us-central1, Node.js 22)
    - Web Public (sanadev-fm, live portal)

summary: >
  HudHud FM v3.0.2 is an essential maintenance and operational enhancement release for the
  Arabic-first digital radio and audio community platform. It resolves critical background
  notification crashes on Android 12+ devices, introduces an interactive Notifications Manager
  in the Web Admin console with rich image URL support and real-time iPhone mockup previews,
  implements server-side episode metadata resolution for push notification deep-linking, supports
  terrestrial-only FM stations with visual indicators, and aligns administrative roles with official
  RBAC security boundaries.

highlights:
  - "Audio Notification Stability: Completely fixed IllegalArgumentException crashes in AudioService.updateNotification on Android 12+ (Oppo, Huawei, Samsung) by introducing monochrome vector play icon ic_notification.xml."
  - "Web Admin Notifications Manager: Interactive broadcasting console featuring title/body counters, action destination pickers, and real-time iPhone mockup previews (lock screen & heads-up banner modes)."
  - "Rich Media Push Notifications: Full support for HTTPS image URLs in FCM broadcast notifications (android.notification.imageUrl, apns.fcmOptions.imageUrl, and mutable-content: 1)."
  - "Episode Alert Deep Linking: Server-side Cloud Function automatically resolves episode metadata (stationId, programId, eventId) to navigate listeners directly to the audio player on tap."
  - "Role & Scope (الصلاحية والنطاق) Alignment: Full migration from legacy roles to official system roles (super_admin, station_admin, moderator, listener) across filters, badges, and user tables."
  - "Terrestrial-Only Radio Stations: Clear UI indicators and auto-reconnect fallback handling for broadcast-only FM stations lacking 24/7 web stream endpoints."

features:
  - id: FEAT-NOTIF-MANAGER
    name: "Notifications Manager Console"
    description: "Web Admin broadcasting hub with quick templates, destination selectors (station/episode/url), live phone preview, confirmation dialog, and broadcast history."
  - id: FEAT-RICH-PUSH
    name: "Rich Media Push Notifications"
    description: "Broadcast FCM announcements with optional high-resolution HTTPS image banners rendered across Android and iOS notification centers."
  - id: FEAT-EPISODE-DEEPLINK
    name: "Episode Notification Deep Linking"
    description: "Server-side lookup of episode program and station associations allowing one-tap navigation from push alerts directly to program episodes."
  - id: FEAT-TERRESTRIAL-FM
    name: "Terrestrial FM Radio Handling"
    description: "Visual badges and dedicated playback fallback logic for traditional terrestrial radio stations without active digital streams."
  - id: FEAT-RBAC-REALIGNMENT
    name: "System Role & Scope Alignment"
    description: "Unified admin RBAC representation: super_admin (مدير عام), station_admin (مدير محطة + scope), moderator (مشرف), and listener (مستمع)."

improvements:
  - "Integrated ic_notification.xml monochrome white vector icon preventing Android OS system tray color-inversion crashes."
  - "Optimized mobile card and table views in Web Admin to display assigned station scopes and user registration dates."
  - "Streamlined Cloud Functions broadcastNotification to gracefully handle missing episode metadata without dropping notifications."
  - "Cleaned all unused declarations and imports, achieving 0 warnings across flutter analyze and oxlint."

bug_fixes:
  - "Fixed java.lang.IllegalArgumentException in com.ryanheise.audioservice.AudioService.updateNotification."
  - "Fixed drop behavior where episode-targeted broadcast notifications were discarded by EpisodeAlertTarget.parse."
  - "Fixed legacy 'admin' and 'editor' string filters in Web Admin user management."
  - "Fixed accessible label associations (htmlFor) in notifications composer."

breaking_changes:
  - "None. Fully backward-compatible with v3.0.0 and v3.0.1 clients and schemas."

technical_changes:
  - "Bumped pubspec.yaml version to 3.0.2+32."
  - "Updated functions/lib/user-management.js with dynamic episode lookup and FCM image payload construction."
  - "Added comprehensive test cases in functions/test/user-management.test.js and web_admin/test/notifications.test.ts."
  - "Generated versioned Android release bundle: hudhud-fm-v3.0.2-b32-release.aab (56 MB)."

store_release_notes:
  google_play:
    ar: "STORE/GOOGLE_PLAY_AR.md"
    en: "STORE/GOOGLE_PLAY_EN.md"
  app_store:
    ar: "STORE/APP_STORE_AR.md"
    en: "STORE/APP_STORE_EN.md"

social_campaign:
  post_ar: "SOCIAL/POST_AR.md"
  post_en: "SOCIAL/POST_EN.md"
  campaign: "SOCIAL/POST_CAMPAIGN.md"

fcm_notifications:
  standard: "FCM/STANDARD.md"
  feature: "FCM/FEATURE.md"
  short: "FCM/SHORT.md"

visual_assets:
  poster_01: "POSTERS/POSTER_01_NOTIFICATIONS.md"
  poster_02: "POSTERS/POSTER_02_AUDIO_STABILITY.md"
  poster_03: "POSTERS/POSTER_03_TERRESTRIAL_RADIO.md"

validation:
  version: PASS (3.0.2+32 verified across pubspec.yaml, changelog, and AAB output)
  flutter_analyze: PASS (0 issues found)
  flutter_tests: PASS (217 of 217 tests passed)
  web_admin_lint: PASS (0 oxlint errors or warnings)
  web_admin_tests: PASS (40 of 40 active tests passed)
  functions_tests: PASS (20 of 20 tests passed, node --check passed)
  android_aab: PASS (Signed with production keystore, size 56 MB)
  firebase_deploy: PASS (Rules, 5 Cloud Functions, and 2 Hosting sites deployed)
```
