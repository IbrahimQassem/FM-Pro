# FCM Push Notification — Rich Media Feature Announcement

* **Type**: Rich Media Feature Spotlight
* **Purpose**: Highlight the interactive visual notifications and episode direct deep-linking capabilities introduced in v3.0.2.

---

## Notification Specification

```yaml
Title: "تنبيهات مصورة ومباشرة لأحدث الحلقات 🎙️"
Body: "لا تفوّت برامجك المفضلة! يمكنك الآن متابعة جديد إذاعاتك لحظة بلحظة مع إمكانية فتح الحلقة مباشرة."
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

## Technical Delivery Notes

* Target Topic: `/topics/hudhud_fm_announcements`
* Android Image Field: `android.notification.imageUrl`
* iOS Rich Media: `apns.fcmOptions.imageUrl`
* iOS Mutable Content: `apns.payload.aps['mutable-content'] = 1`
* Sound: `default`
* Priority: `high`
