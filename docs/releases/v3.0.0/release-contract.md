# HudHud FM Release Contract — v3.0.0

```yaml
release:
  product: HudHud FM (هدهد إف إم)
  version: 3.0.0
  release_type: Major Production Release
  release_date: "2026-09-18"
  build: "30"
  platforms:
    - Android (target: Google Play, applicationId: com.sana.dev.fm)
    - iOS (development ready, bundleId: com.sana.dev.fm)
    - Web Admin (web_admin, internal operations)

summary: >
  HudHud FM v3.0.0 is the definitive production-ready major release of the Arabic-first
  digital radio and audio community platform. It delivers live streaming for Yemeni radio stations,
  on-demand station programs and episodes, community discussions with safety and moderation controls,
  station follow preferences with episode alerts, full light/dark theme switching, language preferences,
  and comprehensive account management across Google, Facebook, Apple, and Email OTP verification.

highlights:
  - "Live Radio Streaming: Instant, reliable live broadcast playback for Yemeni national and local radio stations with robust background playback controls."
  - "Station Programs & Episodes: On-demand browsing of radio talk shows, cultural broadcasts, and recorded episodes with episode-level community comments."
  - "Social Accounts & OTP Verification: Frictionless listener sign-in with Google, Facebook, Apple, and 6-digit email verification code (OTP)."
  - "Grouped Settings & Account Hub: Seamless profile personalization including photo upload, camera capture, or choosing from official Hoopoe mascot avatars."
  - "Appearance & Language: In-app customization supporting Arabic and English, plus Light, Dark, and System theme modes."
  - "Community Safety & UGC Gate: Comprehensive reporting, blocking, and audited terms of participation protecting discussions."

features:
  - id: FEAT-LIVE-PLAY
    name: "Live Audio Streaming Engine"
    description: "Multi-stream audio player built on just_audio, just_audio_background, and audio_session with seamless fallback stream support."
  - id: FEAT-PROGRAMS
    name: "Station Programs & Episode Catalog"
    description: "Browse radio programs by station, view broadcast schedules, presenter info, and listen to archived episodes."
  - id: FEAT-COMMENTS
    name: "Episode Discussions & UGC"
    description: "Engage in civil listener discussions on published episodes with strict character validation (1-1000 chars)."
  - id: FEAT-SAFETY
    name: "UGC Moderation & Listener Protection"
    description: "Mandatory participation agreement, per-comment reporting, user reporting, personal comment blocking with instant undo."
  - id: FEAT-FOLLOW
    name: "Station Subscriptions & Alerts"
    description: "Follow favorite radio stations with opt-in private push alerts when new episodes are published."
  - id: FEAT-ACCOUNT
    name: "Account Management & Authentication"
    description: "Grouped account hub with profile photo customization (Camera, Gallery, Mascot), linked social providers, and compliant account deletion."
  - id: FEAT-SETTINGS
    name: "Application Preferences"
    description: "Persistent theme selection (Light/Dark/System) and interface language toggling (Arabic/English) stored in local preferences."
  - id: FEAT-SEARCH
    name: "Multi-field Arabic Search & City Filters"
    description: "Real-time search matching Arabic and English names, cities, and frequencies with diacritic normalization and city chips."

improvements:
  - "Enhanced UI cards with modern 22px rounded corners and acoustic glassmorphism styling."
  - "Smooth transition and background playback stability during device lock and screen rotation."
  - "Full RTL directional alignment across all widgets, navigation stacks, and dialogs."
  - "Full accessibility compliance supporting text scaling up to 200% without layout overflow."
  - "Optimized mascot asset package size (1.13 MB total) meeting strict app bundle budget."

bug_fixes:
  - "Resolved chevron icon directionality in station program listings for Arabic RTL layouts."
  - "Fixed profile repair and displayName synchronization for newly verified social accounts."
  - "Eliminated audio player state desynchronization during rapid source replacement."
  - "Fixed race conditions when dismissing notifications session tray."

breaking_changes:
  - "Updated Android package name and application ID to com.sana.dev.fm for Google Play compliance."
  - "Bound official production data operations strictly to FIRESTORE_ROOT=HudHudOfficial."

known_issues:
  - "Certain regional radio streams in the national inventory lack 24/7 web stream endpoints and remain tagged as offline until broad station digitization."
  - "FCM deep linking is currently scoped to structured episode alerts (EpisodeAlertTarget); broader station/program deep linking roadmap established for v3.1.0."

deprecated:
  - "Legacy Android FM-Pro Java codebase compatibility layers (completely replaced by modern Flutter architecture)."

removed:
  - "Unverified experimental notification payloads lacking cryptographic or root attestation."

technical_changes:
  - "Flutter SDK 3.44.0 / Dart 3.12.0 baseline."
  - "State management standardized strictly on Riverpod (StateNotifier / AsyncNotifier)."
  - "Layered architecture: Presentation -> Domain <- Data with isolated repositories."
  - "Automated versioned Android App Bundle generation (hudhud-fm-v3.0.0-b30-release.aab)."
  - "Firebase Crashlytics, Cloud Functions, and App Check security posture integration."

user_impact:
  - "Listeners gain a unified, beautifully designed hub to access Yemeni radio from anywhere in the world."
  - "Uninterrupted background listening while using other applications or with the phone locked."
  - "Safe, moderated community interaction around favorite cultural and talk programs."

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
  poster_01: "POSTERS/POSTER_01_LIVE_RADIO.md"
  poster_02: "POSTERS/POSTER_02_AUDIO_SPEED.md"
  poster_03: "POSTERS/POSTER_03_YEMEN_RADIO.md"

operational_changes:
  - "Admin Web Dashboard refactored with enhanced resource filtering and moderation queue."
  - "Secure OTP email delivery via Cloud Functions with 10-minute expiry and rate limiting."

validation:
  version: PASS (3.0.0+30 confirmed in pubspec.yaml, build.gradle.kts, and release scripts)
  features: PASS (All core features verified in lib/ and unit/widget test suites)
  branding: PASS (Official logo, mascot, and #8E3E63 theme tokens adhered to strictly)
  communication: PASS (All copy localized, culturally aligned, and under store character limits)
  links: PASS (In-app routing verified against episode_alert_target and safe router)
  assets: PASS (All referenced mascot and branding images verified in repository)
```
