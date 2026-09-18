# Engineering Architecture — FCM Deep Linking Resolution Roadmap

* **Document ID**: ARCH-OPERATIONS-ROUTER-001
* **Classification**: Technical Resolution Architecture (خطة المعالجة الهندسية لروابط التوجيه العميق)
* **Target Components**: Flutter Mobile (`lib/features/notifications/`), Cloud Functions, `web_admin`
* **Status**: Approved Resolution Specification

---

## 1. Problem Statement & Current Limitation

In the current release candidate (`v3.0.0`), in-app push notification deep linking is intentionally constrained by [episode_alert_navigation.dart](file:///Users/iq/AndroidStudioProjects/accelerate/hudhud_fm/lib/features/notifications/presentation/episode_alert_navigation.dart) and [episode_alert_target.dart](file:///Users/iq/AndroidStudioProjects/accelerate/hudhud_fm/lib/features/notifications/domain/models/episode_alert_target.dart):

```dart
// Current constraint: strictly rejects anything that isn't a structured episode target:
if (data['version'] != '1' ||
    data['type'] != 'episode' ||
    data['root'] != expectedRoot ||
    ...) {
  return null;
}
```

This restriction protected the initial release from untested URL injection or unhandled routing crashes. However, it prevents marketing campaigns, general radio promotions, and station spotlights from navigating directly to:
1. Specific Live Radio Stations (`stationId`).
2. Specific Radio Programs (`stationId`, `programId`).
3. General Announcement views or Home Screen tabs.

---

## 2. Target Unified Deep Link Architecture

To resolve this limitation without sacrificing stability or security, the navigation system will be unified under a typed `AppNotificationTarget` model:

```text
       FCM Push Payload (Data Message)
                      │
                      ▼
       ┌──────────────────────────────┐
       │   AppNotificationTarget      │
       │   .parse(data, root)         │
       └──────────────┬───────────────┘
                      │
      ┌───────────────┼───────────────┬────────────────┐
      ▼               ▼               ▼                ▼
 type: 'station'  type: 'program'  type: 'episode'  type: 'announcement'
      │               │               │                │
      ▼               ▼               ▼                ▼
 StationDetails  ProgramDetails   ProgramDetails   Home / Announcements
 + Auto-Play     + Episode List   + Highlighted    Session Tray
                                    Episode
```

---

## 3. Standardized Payload Schema Specification

All push notification payloads must adhere to the standardized schema across Android and iOS:

### A. Station Spotlight Payload (`type: 'station'`)
Navigates directly to station details and initiates live playback:
```json
{
  "version": "1",
  "type": "station",
  "root": "HudHudOfficial",
  "stationId": "adania_fm",
  "autoPlay": "true"
}
```

### B. Program Showcase Payload (`type: 'program'`)
Navigates directly to the program overview and episode list:
```json
{
  "version": "1",
  "type": "program",
  "root": "HudHudOfficial",
  "stationId": "adania_fm",
  "programId": "sabah_al_khair"
}
```

### C. Episode Alert Payload (`type: 'episode'`)
Preserves existing verified episode navigation and comment interaction:
```json
{
  "version": "1",
  "type": "episode",
  "root": "HudHudOfficial",
  "eventId": "HudHudOfficial:ep_456",
  "stationId": "adania_fm",
  "programId": "sabah_al_khair",
  "episodeId": "ep_456"
}
```

### D. General Announcement Payload (`type: 'announcement'`)
Navigates to the Home discovery view or displays the in-session notification tray:
```json
{
  "version": "1",
  "type": "announcement",
  "root": "HudHudOfficial",
  "target": "home"
}
```

---

## 4. Resilient Navigation Router & Graceful Fallbacks

### Safety Rules:
1. **Zero Route Crashes**:
   - If a `stationId` or `programId` cannot be found in the current Firestore directory (e.g. deleted or deactivated station), the router **must not crash or throw unhandled exceptions**.
   - Instead, it pops to the Home Screen and shows a non-blocking localized SnackBar:
     ```dart
     ScaffoldMessenger.of(context).showSnackBar(
       SnackBar(content: Text(AppLocalizations.of(context).alertContentUnavailable)),
     );
     ```
2. **Safe Navigation Guarding**:
   - Prevent multiple concurrent navigation pushes using a Riverpod navigation busy lock (`_alertNavigationBusyProvider`).
   - Pop existing modal dialogs and bottom sheets before navigating to ensure consistent stack state (`popUntil((route) => route.isFirst)`).
3. **No Arbitrary External URLs**:
   - Web URLs (`http://` / `https://`) in push payloads remain strictly prohibited from direct internal webview execution, protecting against phishing or open-redirect vulnerabilities. External resource links must use `url_launcher` with explicit user consent.

---

## 5. Engineering Implementation Tasks (Scheduled for v3.1.0)

1. **Domain Model**:
   - Create `lib/features/notifications/domain/models/app_notification_target.dart` supporting polymorphic payload resolution.
2. **Navigation Handler**:
   - Expand `openEpisodeAlert` into `openAppNotificationAlert` in `lib/features/notifications/presentation/app_notification_navigation.dart`.
3. **Background Handler Sync**:
   - Update `firebase_messaging_background.dart` to recognize the unified target types.
4. **Admin UI Selector**:
   - Connect the dropdown picker in `web_admin` notification broadcaster to generate these exact payload structures automatically.
