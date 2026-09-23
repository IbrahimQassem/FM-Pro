# FCM Push Notification — Standard Release Announcement

* **Type**: General Product & Update Announcement
* **Purpose**: Broadcast version 3.0.4 availability, in-app update capabilities, Contact Us hub, and audio streaming enhancements to all registered listeners.

---

## Notification Specification

```yaml
Title: "تحديث هدهد FM الجديد (3.0.4) متوفر الآن! 📻✨"
Body: "تحديثات ذكية وفورية من داخل التطبيق، مركز اتصال مباشر للتواصل معنا، ومشاركة أنيقة مع تميمة هدهد!"
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
Title: "HudHud FM 3.0.4 is Here! 📻✨"
Body: "Enjoy seamless in-app updates, direct Contact Us hub, luxury mascot sharing, and enhanced audio streaming."
Deep Link: "hudhudfm://home"
```

---

## Technical Delivery Notes

* Target Topic: `/topics/hudhud_fm_announcements`
* Delivery Channel ID: `announcements`
* Android Priority: `high`
* iOS Badge: `1`
* Sound: `default`
