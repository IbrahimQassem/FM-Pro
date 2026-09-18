# FCM Push Notification — Feature Highlight

* **Type**: Feature Campaign Announcement
* **Purpose**: Highlight on-demand radio programs, episode catch-up, and community discussions.

---

## Notification Specification

```yaml
Title: "فاتتك حلقة اليوم؟ استمع إليها الآن! 🎙️"
Body: "تصفح أرشيف البرامج الإذاعية وحلقاتك المفضلة، وشارك برأيك في مجتمع المستمعين."
Deep Link: "hudhudfm://episode"
Data Payload:
  version: "1"
  type: "episode"
  root: "HudHudOfficial"
  eventId: "HudHudOfficial:featured_showcase"
  stationId: "featured"
  programId: "featured_program"
  episodeId: "latest"
Audience: "Opted-in listeners engaged with station subscriptions and program catalogs"
Trigger: "Scheduled feature campaign 48 hours post-launch"
```

---

## English Equivalent (Fallback / English Devices)

```yaml
Title: "Catch Up on Missed Episodes! 🎙️"
Body: "Explore on-demand radio shows, archived episodes, and join the listener community discussion."
Deep Link: "hudhudfm://episode"
```

---

## Technical Routing Note

* Handled by the verified in-app routing parser: `EpisodeAlertTarget.parse(data, expectedRoot: 'HudHudOfficial')`.
* If the target station or episode record is archived or unavailable, the application gracefully routes to the Home Screen and shows a non-blocking `alertContentUnavailable` notice, preserving user flow without crashing.
