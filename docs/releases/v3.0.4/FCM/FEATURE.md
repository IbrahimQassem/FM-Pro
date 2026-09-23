# FCM Push Notification — Rich Media Feature Announcement

* **Type**: Rich Media Feature Spotlight
* **Purpose**: Highlight the in-app update engine, interactive Contact Us hub, and mascot social sharing introduced in v3.0.4.

---

## Notification Specification

```yaml
Title: "تواصل معنا مباشرة وابقَ على أحدث إصدار 🎙️📬"
Body: "مركز اتصال متكامل عبر واتساب ووسائل التواصل، وتنبيهات تلقائية بالتحديثات لضمان أفضل أداء."
Image URL: "https://firebasestorage.googleapis.com/v0/b/sanadev-fm.appspot.com/o/HudHudDev%2Fbanners%2Fwelcome-v1%2Fhudhud-discovery-v1.jpg?alt=media"
Deep Link: "hudhudfm://home"
Data Payload:
  version: "1"
  type: "announcement"
  targetType: "general"
  root: "HudHudOfficial"
Audience: "All subscribed listeners on topic 'hudhud_fm_announcements'"
Trigger: "Feature launch campaign"
```

---

## English Equivalent

```yaml
Title: "Stay Connected & Always Updated 🎙️📬"
Body: "Access the new Contact Us hub and stay ahead with automated in-app updates for the smoothest radio streaming."
Deep Link: "hudhudfm://home"
```

---

## Technical Delivery Notes

* Target Topic: `/topics/hudhud_fm_announcements`
* Android Image Field: `android.notification.imageUrl`
* iOS Rich Media: `apns.fcmOptions.imageUrl`
* iOS Mutable Content: `apns.payload.aps['mutable-content'] = 1`
* Sound: `default`
* Priority: `high`
