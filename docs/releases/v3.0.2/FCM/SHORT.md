# FCM Push Notification — Short Heads-Up Alert

* **Type**: Concise Heads-Up / Lock Screen Alert
* **Purpose**: High-engagement short alert designed specifically for single-line lock screens and watch notifications.

---

## Notification Specification

```yaml
Title: "إذاعاتك المفضلة تعمل بلا انقطاع! ⚡"
Body: "حدّث هدهد FM الآن لتجربة استماع أسرع وأكثر استقراراً في الخلفية."
Deep Link: "hudhudfm://home"
Data Payload:
  version: "1"
  type: "announcement"
  targetType: "general"
  root: "HudHudOfficial"
Audience: "All subscribed listeners on topic 'hudhud_fm_announcements'"
Trigger: "Mid-campaign re-engagement trigger"
```

---

## English Equivalent

```yaml
Title: "Non-stop Yemeni Radio ⚡"
Body: "Update HudHud FM now for rock-solid background streaming and episode alerts."
Deep Link: "hudhudfm://home"
```
