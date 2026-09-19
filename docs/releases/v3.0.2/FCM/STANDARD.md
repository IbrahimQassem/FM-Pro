# FCM Push Notification — Standard Release Announcement

* **Type**: General Product & Stability Announcement
* **Purpose**: Broadcast version 3.0.2 availability and background playback stability enhancements to all registered listeners.

---

## Notification Specification

```yaml
Title: "تحديث هدهد FM الجديد متوفر الآن! 📻"
Body: "استمع لإذاعاتك اليمنية المفضلة باستقرار تام في الخلفية، مع تنبيهات تفاعلية مصورة ومباشرة."
Deep Link: "hudhudfm://home"
Data Payload:
  version: "1"
  type: "announcement"
  targetType: "general"
  root: "HudHudOfficial"
Audience: "All subscribed listeners on topic 'hudhud_fm_announcements'"
Trigger: "Post-release production deployment verification sign-off"
```

---

## English Equivalent (Fallback / English Devices)

```yaml
Title: "HudHud FM 3.0.2 is Here! 📻"
Body: "Enjoy rock-solid background radio streaming and interactive visual notifications for new episodes."
Deep Link: "hudhudfm://home"
```

---

## Technical Delivery Notes

* Target Topic: `/topics/hudhud_fm_announcements`
* Delivery Channel ID: `announcements`
* Android Priority: `high`
* iOS Badge: `1`
* Sound: `default`
