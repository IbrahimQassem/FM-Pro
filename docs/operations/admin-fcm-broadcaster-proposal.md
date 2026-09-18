# Product Feature Proposal — Admin FCM Broadcaster

* **Document ID**: PROP-OPERATIONS-FCM-001
* **Classification**: Product Feature Proposal (مقترح ميزة للمنتج)
* **Target Interface**: `web_admin` (Admin Web Dashboard)
* **Status**: Proposed — Ready for Product Approval

---

## 1. Executive Summary & Purpose

Currently, broadcasting general announcements requires operations personnel to log directly into the Firebase Console. This creates operational friction, lacks workflow audit trails, risks accidental misconfigurations, and disconnects notification dispatching from the internal editorial station schedule.

The **Admin FCM Broadcaster** empowers authorized content administrators to draft, target, preview, test, and safely broadcast notifications directly from within the HudHud FM Admin Dashboard (`web_admin`), with mandatory multi-step confirmation and rigorous security boundaries.

---

## 2. End-to-End Operational Workflow

```text
       ┌─────────────────────────────┐
       │   Admin Web Dashboard       │
       └──────────────┬──────────────┘
                      │
                      ▼
       ┌─────────────────────────────┐
       │   Notifications Workspace   │
       └──────────────┬──────────────┘
                      │
                      ▼
       ┌─────────────────────────────┐
       │  Step 1: Create & Compose   │
       │  - Title (AR / EN)          │
       │  - Body (AR / EN)           │
       │  - Hero Image URL (optional)│
       └──────────────┬──────────────┘
                      │
                      ▼
       ┌─────────────────────────────┐
       │  Step 2: Target Audience    │
       │  - Topic (Announcements)    │
       │  - Station Followers        │
       │  - Custom User Segment      │
       └──────────────┬──────────────┘
                      │
                      ▼
       ┌─────────────────────────────┐
       │  Step 3: Deep Link Routing  │
       │  - Type: Home / Station /   │
       │          Program / Episode  │
       │  - Target Entity Picker     │
       └──────────────┬──────────────┘
                      │
                      ▼
       ┌─────────────────────────────┐
       │  Step 4: Interactive Preview│
       │  - Android Lock-Screen Mock │
       │  - iOS Banner Mock          │
       │  - RTL Layout Rendering     │
       └──────────────┬──────────────┘
                      │
                      ▼
       ┌─────────────────────────────┐
       │  Step 5: Test Send          │
       │  - Send to registered admin │
       │    device token             │
       └──────────────┬──────────────┘
                      │
                      ▼
       ┌─────────────────────────────┐
       │  Step 6: Confirm & Authorize│
       │  - 2-Admin or Re-auth Prompt│
       │  - Explicit Broadcast Action│
       └──────────────┬──────────────┘
                      │
                      ▼
       ┌─────────────────────────────┐
       │  Step 7: Cloud Execution    │
       │  - Firebase Cloud Function  │
       │  - FCM v1 Send API Batch    │
       └──────────────┬──────────────┘
                      │
                      ▼
       ┌─────────────────────────────┐
       │  Step 8: Delivery & Logs    │
       │  - Success / Failure Count  │
       │  - Permanent Audit Log Doc  │
       └─────────────────────────────┘
```

---

## 3. Core Functional Capabilities

1. **Draft Notification Management**:
   - Save notification drafts with state indicators (`DRAFT`, `SCHEDULED`, `DISPATCHED`, `CANCELLED`).
   - Revision history tracking creator ID and timestamp.
2. **Audience & Topic Segmentation**:
   - Primary Topic: `/topics/hudhud_fm_announcements` (Broad app-wide release notifications).
   - Station Topics: `/topics/station_{stationId}` (Targeted updates for followed stations).
   - Custom Segments: By language preference (`ar` vs. `en`) or platform (`android` vs. `ios`).
3. **Structured Deep Link Selector**:
   - Eliminates human typos by providing a dropdown entity picker connected to the Firestore Stations and Programs catalog:
     * Home / Feed
     * Specific Radio Station (`stationId`)
     * Specific Program (`stationId`, `programId`)
     * Specific Published Episode (`stationId`, `programId`, `episodeId`)
4. **Live Device Preview**:
   - Side-by-side interactive simulation of mobile notification cards displaying Arabic RTL rendering, character count indicators, and image thumbnails.
5. **Admin Test Device Dispatch**:
   - Dispatches a single test payload to designated admin FCM test tokens before broadcasting to the public audience.
6. **Scheduled Dispatch Engine**:
   - Immediate dispatch or scheduled execution via Google Cloud Tasks / Cloud Scheduler.
7. **Delivery & Error Auditing**:
   - Real-time logging of FCM API response status codes, recipient reach count, invalid tokens, and permanent audit entries in `system_logs/notifications`.

---

## 4. Security & Governance Requirements

> [!CAUTION]
> **Zero Exposure of Server Credentials**:
> Client-side code in `web_admin` must NEVER possess or expose Firebase Admin SDK credentials, service account keys, or FCM legacy server keys.

1. **Strict Server-Side Execution**:
   - All FCM broadcast requests must be dispatched through authenticated Firebase Cloud Functions (`broadcastFcmNotification` callable).
2. **Role-Based Access Control (RBAC)**:
   - Callable must verify that `context.auth.token.role === 'admin'` or `'super_admin'` from Firestore user claims.
3. **Confirmation & Anti-Accidental Broadcast**:
   - Mandatory modal confirmation displaying target audience size and exact payload text before firing.
4. **Rate Limiting**:
   - Hard server-side throttling allowing maximum 1 broad announcement blast every 6 hours per environment to protect listener goodwill and prevent spam.
5. **Immutable Audit Trail**:
   - Every broadcast persists an audit record capturing:
     ```json
     {
       "broadcastId": "fcm_20260918_01",
       "adminUid": "user_xyz",
       "adminEmail": "admin@hudhudfm.com",
       "targetTopic": "hudhud_fm_announcements",
       "payload": { "title": "...", "body": "..." },
       "recipientCountEstimate": 25000,
       "timestamp": "2026-09-18T20:30:00Z",
       "status": "COMPLETED"
     }
     ```

---

## 5. Implementation Roadmap

* **Phase 1 (v3.1.0)**: Cloud Function endpoint with RBAC check and basic topic broadcasting.
* **Phase 2 (v3.2.0)**: `web_admin` UI integration with live preview and test device dispatch.
* **Phase 3 (v3.3.0)**: Scheduled delivery, analytics integration (open rate tracking), and segment filters.
