# HudHud FM Release Contract — v3.0.4

```yaml
release:
  product: HudHud FM (هدهد إف إم)
  version: 3.0.4
  release_type: Production Feature & Compatibility Release
  release_date: "2026-09-23"
  build: "34"
  platforms:
    - Android (target: Google Play, applicationId: com.sana.dev.fm)
    - Web Admin (web_admin, internal operations)
    - Web Public (sanadev-fm, live portal)

summary: >
  HudHud FM v3.0.4 delivers official in-app updates (force update and optional update with 48-hour cooldown),
  an integrated Contact Us hub, Android 15 edge-to-edge support via WindowCompat, universal HTTP streaming
  support across iOS, Android, Web Admin, and Web Player, rich social sharing with luxury mascot attachments,
  intuitive guest sign-in CTA in the Home header, verified Google Sign-In, and Web Admin user identity visibility.

highlights:
  - "In-App Update Engine: Remote Firestore-driven version checking with blocking force update and 48-hour cooldown optional update dialogs."
  - "Contact Us Hub: Integrated communication modal for WhatsApp, Phone, Email, Facebook, Twitter/X, and Instagram."
  - "Android 15 Edge-to-Edge: Clean migration to WindowCompat.setDecorFitsSystemWindows(window, false) with androidx.core:core-ktx:1.15.0."
  - "Universal HTTP Streaming: Permitted HTTP radio stream and audio URL playback on iOS, Android, Web Admin, and Web Player."
  - "Mascot App Sharing: Localized Arabic share text templates with high-resolution mascot image file attachment."
  - "Home User Navigation: Interactive header avatar, user greeting, and 1-tap 'دخول ➔' button for guest users."
  - "Google Sign-In Resolution: Added serverClientId and iOS OAuth scheme configurations for reliable token exchange."
  - "Web Admin User Visibility: Display active administrator name, email, and quick sign-out in header and sidebar."

features:
  - id: FEAT-IN-APP-UPDATE
    name: "In-App Update Engine"
    description: "Automatic check against Firestore appConfig with blocking modal for required updates and dismissible prompt with 48-hour cooldown for optional updates."
  - id: FEAT-CONTACT-HUB
    name: "Contact Us Hub"
    description: "Comprehensive contact dialogue connecting listeners directly to support channels: WhatsApp, phone hotline, email, and social networks."
  - id: FEAT-ANDROID15-E2E
    name: "Android 15 Edge-to-Edge"
    description: "Modern edge-to-edge rendering removing deprecated window color calls and ensuring compliance with Google Play Android 15 requirements."
  - id: FEAT-UNIVERSAL-HTTP-STREAM
    name: "Universal HTTP Stream Support"
    description: "Support for HTTP and HTTPS audio streams across iOS Info.plist, Android network security, Web Admin forms, and Web Player."
  - id: FEAT-MASCOT-SHARE
    name: "Rich Mascot Social Sharing"
    description: "Multi-platform app and station sharing bundling localized Arabic invitation copy with high-resolution Hoopoe mascot graphics."
  - id: FEAT-HOME-ACCOUNT-CTA
    name: "Home Header Guest Sign-In"
    description: "Direct guest user entry in Home header with one-tap navigation to login, along with logged-in user avatar and greeting."

improvements:
  - "Web Admin header and sidebar display authenticated user name and email with clear sign-out action."
  - "Updated Google Sign-In configuration with explicit Web Client ID for reliable credential exchange."
  - "Ensured 0 flutter analyze issues across all app sources and 0 lint warnings in web admin."

bug_fixes:
  - "Fixed Android 15 WindowManager edge-to-edge crash on launch."
  - "Fixed stream URL validation rejecting valid HTTP broadcast streams in Web Admin."
  - "Fixed guest user inability to easily locate the login/account portal from the main Home screen."

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
  media_kit: "media/README.md"
  poster_01:
    spec: "POSTERS/POSTER_01_IN_APP_UPDATES.md"
    master_png: "media/poster_01_in_app_updates.png"
    web_jpg: "media/poster_01_in_app_updates.jpg"
    square_jpg: "media/poster_01_in_app_updates_square.jpg"
  poster_02:
    spec: "POSTERS/POSTER_02_CONTACT_HUB.md"
    master_png: "media/poster_02_contact_hub.png"
    web_jpg: "media/poster_02_contact_hub.jpg"
    square_jpg: "media/poster_02_contact_hub_square.jpg"
  poster_03:
    spec: "POSTERS/POSTER_03_MASCOT_SHARING.md"
    master_png: "media/poster_03_mascot_sharing.png"
    web_jpg: "media/poster_03_mascot_sharing.jpg"
    square_jpg: "media/poster_03_mascot_sharing_square.jpg"

validation:
  version: PASS (3.0.4+34 verified across pubspec.yaml, app_config.dart, changelog, and AAB output)
  flutter_analyze: PASS (0 issues found)
  flutter_tests: PASS (248 of 248 tests passed)
  web_admin_lint: PASS (0 oxlint errors or warnings)
  web_admin_tests: PASS (41 of 41 active tests passed)
  web_player_tests: PASS (36 of 36 active tests passed)
  android_aab: PASS (Signed production bundle hudhud-fm-v3.0.4-b34-release.aab, size 56 MB)
  firebase_deploy: PASS (Rules, Cloud Functions, and Hosting sites deployed)
```
