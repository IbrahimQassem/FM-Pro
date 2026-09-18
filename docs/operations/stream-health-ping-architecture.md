# Operational & Product Architecture — Stream Health Verification System

* **Document ID**: ARCH-OPERATIONS-AUDIO-001
* **Classification**: Operational / Product Capability
* **Scope**: Automated radio stream auditing, real-time health probing, and listener UI indicators
* **Status**: Active Operational Specification (المواصفة التشغيلية المعتمدة)

---

## 1. Executive Summary & Purpose

A significant challenge in digital radio curation is that audio stream endpoints frequently change, suffer server downtime, undergo domain expiry, or return valid HTTP 200 responses containing an HTML error page rather than actual audio frames.

A simple ICMP ping or basic HTTP GET status code is **completely insufficient** to certify an audio stream as playable. The **HudHud FM Stream Health System** defines a multi-stage validation probe to verify actual stream reachability, protocol compatibility, audio header negotiation, and continuous chunk delivery before exposing stations to listeners.

---

## 2. Multi-Stage Stream Health Verification Pipeline

```text
       ┌───────────────────────────────┐
       │       Station Stream URL      │
       └───────────────┬───────────────┘
                       │
                       ▼
       ┌───────────────────────────────┐
       │ Stage 1: URL & Scheme Syntax  │
       │ - Check http:// or https://   │
       │ - Malformed / Empty check     │
       └───────────────┬───────────────┘
                       │ Valid Scheme
                       ▼
       ┌───────────────────────────────┐
       │ Stage 2: DNS & Network Probe  │
       │ - Host resolution             │
       │ - TCP Handshake (port 80/443/ │
       │   8000/8080/custom Icecast)   │
       └───────────────┬───────────────┘
                       │ Connection OK
                       ▼
       ┌───────────────────────────────┐
       │ Stage 3: HTTP & Audio Headers │
       │ - Follow safe 301/302/307     │
       │ - Send Icy-MetaData: 1        │
       │ - Inspect Content-Type        │
       └───────────────┬───────────────┘
                       │ Audio MIME Match
                       ▼
       ┌───────────────────────────────┐
       │ Stage 4: Continuous Chunk Test│
       │ - Stream 32 KB audio buffer   │
       │ - Measure bitrate & stability │
       │ - Check continuous delivery   │
       └───────────────┬───────────────┘
                       │ Stream Delivered
                       ▼
       ┌───────────────────────────────┐
       │     Final Health Verdict      │
       │    HEALTHY / UNREACHABLE /    │
       │    TIMEOUT / UNSUPPORTED      │
       └───────────────────────────────┘
```

---

## 3. Health States & Operational Classification

The system classifies every stream into one of six canonical states:

| Health State | Definition | Root Cause / Verification Signature | Operational Action |
| :--- | :--- | :--- | :--- |
| **`HEALTHY`** | Verified playable digital stream. | HTTP 200, valid audio MIME (`audio/mpeg`, `audio/aacp`, `audio/ogg`, `application/ogg`), positive Icecast headers (`icy-br`, `icy-name`), first 32 KB chunk received within 3.5s. | Stream active in public directory with green indicator. |
| **`UNREACHABLE`** | Server offline or refusing connections. | DNS resolution failure (`ENOTFOUND`), connection refused (`ECONNREFUSED`), or HTTP 404/500/502/503. | Automatic fallback to `backupStreamUrl`. If none, mark station offline. |
| **`INVALID_URL`** | Malformed or non-audio URI. | Missing protocol scheme, empty string, or URL pointing to a website homepage rather than an audio stream. | Flagged in Admin Content Editor for URL correction. |
| **`TIMEOUT`** | Server unresponsive under load. | TCP connection or initial buffer chunk exceeds 5.0 seconds. | Retry scheduled with exponential backoff (after 60s). |
| **`UNSUPPORTED`** | Incompatible codec or container. | Stream delivers unsupported legacy formats (e.g. WMA, proprietary RTSP, Flash RTMP) not decodable by modern mobile codecs. | Flagged for station proxy transcoding. |
| **`UNKNOWN`** | Unprobed or pending verification. | Newly added station awaiting the first automated health cycle. | Gray indicator in admin preview. |

---

## 4. Why Basic HTTP GET Fails: Real-World Audio Caveats

> [!IMPORTANT]
> **Audio Engineering Principles for Radio Validation**:
> 1. **False Positives from HTML 200 Pages**: Many radio hosting providers return an HTTP 200 status code with `Content-Type: text/html` displaying a "Station Suspended" or "Account Overdue" banner. A simple ping marks this as healthy, but the player immediately throws an error.
> 2. **Icecast Metadata Demultiplexing**: Radio streams interleave audio data with metadata (`Icy-MetaData: 1`). The probe must parse the `icy-metaint` header to verify genuine stream synchronization.
> 3. **Chunked Transfer Encoding**: Audio streams are infinite streams (`Transfer-Encoding: chunked`) without a `Content-Length`. The probe must read a minimum buffer window (typically 32 to 64 KB) before gracefully terminating the socket.

---

## 5. User Interface Indicator System

### In Admin Web Dashboard (`web_admin`)
```text
● Stream Healthy (320 kbps, audio/mpeg, Icecast v2.4)
● Stream Unreachable (HTTP 502 Bad Gateway)
● Invalid Stream URL (Malformed URI scheme)
● Stream Timeout (No chunks received within 5s)
```

### In Mobile Listener Application (`lib/features/player/`)
- **Seamless Fallback**: When a `streamUrl` throws an unavailable error, the audio player automatically cycles to `backupStreamUrl` without exposing raw URLs or disturbing the listener.
- **Friendly Mascot State**: If both primary and backup fail, the player transitions gracefully to the friendly Hoopoe offline state (`assets/images/mascot/mascot_offline.webp`) with an actionable "إعادة المحاولة" (Retry) button.
- **Privacy Zero-Log Rule**: In accordance with project security rules, stream URLs are never printed in plaintext in client-side crash logs or analytics.

---

## 6. Real-World Station Audit Analysis

Based on auditing `stations_HudHudFmGooglePlay.csv`:
* **Category 1: Live Digital Streams (Playable)**: Stations utilizing active ZenoFM or Icecast endpoints (e.g., `Adania FM`, `Sayun Radio`, `Noor Al Eman`).
* **Category 2: Terrestrial FM Inventory Only (No Digital Stream)**: Stations operating purely on terrestrial frequencies (e.g., `88.3 MHz`, `105.0 MHz`) without an existing public streaming server.
  - *Product Handling*: Marked as `isLive: false` / `isActive: true` with frequency data clearly displayed (`105.0 MHz`), informing the listener that terrestrial coverage exists while awaiting station digital broadcast enablement.
