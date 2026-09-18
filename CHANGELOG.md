# Changelog

All notable changes to **HudHud FM** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [3.0.1] - 2026-09-19

### Added
- **Confirm Password Verification**: Added confirm password field and real-time mismatch validation across all registration screens.
- **Legacy User Migration**: Automated backfill and migration of legacy users into official production Firestore root.
- **Admin User Management**: Added admin capabilities for setting user password, toggling account status, and assigning scoped station permissions.

### Fixed
- **Registration Flow Resiliency**: Decoupled account creation from transient OTP email delivery errors to eliminate account creation blocking.
- **UI Symmetry**: Centered `_socialDivider` across all authentication and account screens.
- **Profile Email Storage**: Ensured user email is persisted in Firestore document profiles on sign-up and authentication.

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
