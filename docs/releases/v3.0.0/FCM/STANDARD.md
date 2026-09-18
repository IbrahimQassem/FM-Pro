# FCM Push Notification — Standard Release Announcement

* **Type**: General Product Announcement
* **Purpose**: Broadcast new version availability and overall experience enhancements to all registered listeners.

---

## Notification Specification

```yaml
Title: "تحديث جديد لهدهد إف إم متوفر الآن! 📻"
Body: "استمتع بتجربة بث مباشر أكثر نقاءً وسرعة، مع برامج إذاعية جديدة وتصميم داكن فخم."
Deep Link: "hudhudfm://home"
Data Payload:
  version: "1"
  type: "announcement"
  target: "home"
  root: "HudHudOfficial"
Audience: "All subscribed listeners on topic 'hudhud_fm_announcements'"
Trigger: "Post-release production deployment verification sign-off"
```

---

## English Equivalent (Fallback / English Devices)

```yaml
Title: "HudHud FM 3.0.0 is Here! 📻"
Body: "Enjoy smoother live radio streaming, on-demand programs, and our sleek new dark mode."
Deep Link: "hudhudfm://home"
```

---

## Technical Delivery Notes

* Target Topic: `/topics/hudhud_fm_announcements`
* Delivery Channel ID: `hudhud_fm_general_announcements`
* Sound: `default`
* Priority: `high` (displays immediately in system notification tray)
