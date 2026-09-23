# Changelog

All notable changes to **HudHud FM** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.4] - 2026-09-23

### Added
- **In-App Update System**: Dynamic version checking with Firestore app update document (`app_update/config`), blocking screen for required updates (`isForceUpdate`), and non-intrusive dialog with 48h cooldown for optional updates (`isOptionalUpdate`).
- **Official Contact Us Hub**: Accessible dialog in Settings with 1-tap links for direct WhatsApp messaging, phone calls, email, Facebook, Twitter/X, and Instagram.
- **Universal HTTP Stream & Audio Support**: Permitted HTTP Shoutcast and Icecast radio streams and episode recordings across iOS App Transport Security (`NSAllowsArbitraryLoadsForMedia`), Android manifest network schemes, Web Admin validators, and Web Player discovery.
- **Rich Social Sharing**: Enhanced app sharing with localized Arabic message templates, store/web links, and automatic Hoopoe mascot image attachment.
- **Interactive Home User Navigation**: Interactive mascot avatar and user greeting in Home view header, along with a prominent 1-tap "دخول ➔" button for guests navigating straight to sign-in.
- **Google Sign-In Infrastructure**: Configured iOS OAuth reversed client ID schemes and added `serverClientId` for Credential Manager token exchange on Android.
- **Web Admin User Visibility**: Displays active logged-in user name, email address, role badge, and fast sign-out action in the dashboard header and sidebar.

### Changed
- **Android 15 Edge-to-Edge Migration**: Modernized native window insets handling using `WindowCompat.setDecorFitsSystemWindows(window, false)` and `androidx.core:core-ktx:1.15.0`, replacing deprecated status and navigation bar color APIs.
- **Legal & Compliance Pages**: Modernized standalone Arabic web pages for Account Deletion (`/account-deletion.html`), Privacy Policy (`/privacy.html`), and Terms of Service (`/terms.html`).

### Fixed
- **Status Bar Icon Inversion**: Fixed dark icon visibility on dark status bar backgrounds in older Android OS versions.
- **Audio Notification Intent Queries**: Declared explicit HTTP intents in Android Manifest to ensure uninterrupted audio streaming.

---

## [3.0.3] - 2026-09-21

### Added
- **Luxury App Branding & Icon Suite**: Pixel-perfect high-resolution circular luxury emblem (`app_logo_circle.png`) and seamless square emblem (`app_logo_square.png`, `app_icon_1024.png`).
- **Seamless Adaptive Android Icons**: Native Android adaptive icons (`ic_launcher_foreground.png`, `ic_launcher_monochrome.png`) with color-matched background (`#14090B`) in `colors.xml`, eliminating all white letterboxing.
- **Warm-Amber Mascot Placeholder**: Created and integrated official luxury radio mascot placeholder (`station_placeholder.webp`) across all station and player widgets.

### Changed
- **Artwork & Placeholder Consistency**: Replaced legacy `Icons.radio_rounded` and removed harsh white border artifacts in `StationDetailsScreen`, `StationCard`, and `_MiniArtwork` in `MiniPlayer`.
- **Artwork Model Alignment**: Unified artwork resolution in `StationDetailsScreen` with `StationPlayerController` and `StationCard` to strictly prefer verified station logos before graceful fallback.

### Improved
- **Now Playing Sheet UX**: Centered station titles and enhanced vertical rhythm, spacing, and gesture feedback.
- **Home View Carousel**: Added smooth auto-sliding banner carousel transitions with safe timer lifecycle handling.
- **Full Test Suite Validation**: All 231 tests passing across widget, unit, and screen acceptance suites.

---

## [3.0.2] - 2026-09-20

### Added
- **Web Admin Notifications Manager**: Broadcasting console with iPhone preview, action destination pickers, and FCM image support.
- **Rich Media Push Notifications**: Full HTTPS image banner support in FCM alerts (`android.notification.imageUrl`, `apns.fcmOptions.imageUrl`).
- **Episode Deep Linking**: Automated server-side metadata resolution for direct player navigation on push notification tap.

### Fixed
- **Audio Notification Stability**: Monochrome vector drawable `ic_notification.xml` to eliminate `IllegalArgumentException` on Android 12+.
- **Terrestrial FM Fallback**: Dedicated badge indicators and reconnection handling for broadcast-only stations.

---

## [3.0.0] - 2026-09-18

### Added
- **Live Radio Streaming Engine**: Reliable streaming audio service built with `just_audio`, background audio notification service, lock screen controls, and automatic fallback stream support.
- **Station Programs & Episode Catalog**: On-demand repository of radio series, broadcast schedules, presenter details, and episode playback.
- **Episode Community Discussions**: Interactive commenting system on radio episodes with real-time updates and strict input validation.
- **UGC Safety & Community Protection**: Mandatory user agreement gate, per-comment reporting, user reporting, and personal author blocking with immediate undo.
- **Station Follow & Notifications**: Capability to follow favorite stations and opt-in to alerts when new episodes are released.
- **Grouped Settings & Account Hub**: Redesigned settings center supporting profile photo selection from camera, gallery, or official Hoopoe mascot avatars.
- **Multi-Provider Authentication**: Support for Google, Facebook, Apple, and Email authentication with 6-digit server-side verification code (OTP).
- **In-App Preferences**: Persistent language selection (Arabic / English) and theme selection (Light, Dark, System).
- **Search & Discovery**: Multi-field search supporting Arabic diacritic normalization, English matching, city filters, and grid/list view toggles.

### Changed
- **Package Identity**: Android Application ID updated to `com.sana.dev.fm` for Google Play Store publication.
- **Production Data Binding**: Configured release packaging to target official production root `FIRESTORE_ROOT=HudHudOfficial`.
- **UI & Design Architecture**: Implemented modern 22px card curvature, dark acoustic glassmorphism styling, and the official `#8E3E63` / `#8B2648` brand theme.

### Improved
- **RTL & Localization**: Full bidirectional layout alignment across all screens, modals, and sheets.
- **Accessibility & Font Scaling**: Verified layout resilience up to 200% text scale without truncation or overflow.
- **Asset Footprint**: Compressed official mascot illustrations to WebP format, totaling 1.13 MB and respecting application bundle limits.
- **Background Playback**: Optimized audio session handling for phone call interruptions and audio focus transitions.

### Fixed
- **Navigation Icon Direction**: Fixed chevron direction in station program tabs for RTL reading order.
- **Profile Data Synchronization**: Resolved profile repair and display name synchronization on initial social authentication.
- **Player State Race Conditions**: Prevented desynchronization when switching rapidly between audio streams.
- **Notification Tray Dismissal**: Eliminated transient UI glitches when clearing recent notifications.

### Deprecated
- Legacy Android FM-Pro Java codebase compatibility layers (completely superseded by modern Flutter implementation).

### Removed
- Unverified notification experimental payload formats.

### Security
- Server-side email verification codes (OTP) expiring strictly after 10 minutes with rate limiting.
- Audited Firestore security rules enforcing user data isolation, admin RBAC, and verified UGC submission.
- Zero-logging policy for audio stream URLs, Firebase credentials, and user credentials.

### Known Issues
- Radio stations lacking digital web stream URLs in the national registry are labeled as offline until official station digitization.
- FCM deep linking currently navigates to allowlisted structured episode targets (`EpisodeAlertTarget`), with generalized station deep linking scheduled for v3.1.0.
