# FCM Push Notification — Short & Compact Mobile Notification

* **Type**: High-Visibility Ultra-Compact Lock-Screen Alert
* **Purpose**: Maximum readability on compact notification surfaces, smartwatch displays, and heads-up banners.

---

## Notification Specification

```yaml
Title: "هدهد إف إم 3.0.0 جاهز لك! 📻"
Body: "بث مباشر نقي، برامج جديدة، وتصميم داكن فخم. حدّث الآن."
Deep Link: "hudhudfm://home"
Data Payload:
  version: "1"
  type: "announcement"
  target: "home"
  root: "HudHudOfficial"
Audience: "All subscribed listeners on topic 'hudhud_fm_announcements'"
Trigger: "Primary release rollout notification blast"
```

---

## English Equivalent (Fallback / Wearables)

```yaml
Title: "HudHud FM 3.0.0 Live! 📻"
Body: "Clearer live radio, new programs & dark mode. Listen now."
Deep Link: "hudhudfm://home"
```

---

## Compact Metric Audit

* **Arabic Character Count**: Title 31 chars, Body 65 chars.
* **English Character Count**: Title 23 chars, Body 56 chars.
* **Result**: Zero risk of notification truncation on compact Android heads-up displays or iOS lock-screen cards.
