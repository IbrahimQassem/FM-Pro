# FCM Push Notification — Short Heads-Up Alert

* **Type**: Concise Heads-Up / Lock Screen Alert
* **Purpose**: High-engagement short alert designed specifically for single-line lock screens, watches, and heads-up banners.

---

## Notification Specification

```yaml
Title: "تجربة راديو مطوّرة بانتظارك! ⚡"
Body: "تحديث هدهد FM 3.0.4 متاح الآن: سرعة أعلى، مركز تواصل متكامل، وتحديثات ذكية."
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
Title: "Faster, Smarter Radio Experience ⚡"
Body: "HudHud FM 3.0.4 is out: new Contact Hub, instant in-app updates, and smoother streaming."
Deep Link: "hudhudfm://home"
```
