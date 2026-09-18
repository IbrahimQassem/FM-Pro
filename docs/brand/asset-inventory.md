# HudHud FM — Brand Asset Inventory & Verification Catalog

* **Status**: Verified Source of Truth (سجل جرد الأصول المعتمدة)
* **Last Verified**: 2026-09-18
* **Scope**: Repository asset auditing across `assets/images/` and `design/`

---

## 1. Verified Asset Catalog

All assets listed below have been verified directly in the active repository. No placeholders or external unverified files are permitted.

### A. Core Branding (`hudhud_fm/assets/images/branding/`)

| File Name | Absolute/Relative Path | Format | Size | Description & Approved Usage |
| :--- | :--- | :--- | :--- | :--- |
| `logo.png` | `assets/images/branding/logo.png` | PNG (RGBA) | ~2.46 MB | **Official Full Master Logo**. High-resolution logo mark for marketing hero backdrops, splash screens, launch posters, and vector master derivations. |
| `app_icon_1024.png` | `assets/images/branding/app_icon_1024.png` | PNG (RGBA) | ~1.36 MB | **Official 1024×1024 App Store & Launcher Master**. Master artwork used by `flutter_launcher_icons` with adaptive background `#8B2648`. |

---

### B. Mascot Illustrations (`hudhud_fm/assets/images/mascot/`)

| File Name | Relative Path | Format | Size | Purpose / In-App Context |
| :--- | :--- | :--- | :--- | :--- |
| `mascot_avatar_default.webp` | `assets/images/mascot/mascot_avatar_default.webp` | WebP | ~175 KB | Default user profile avatar prior to custom photo upload. |
| `mascot_onboarding.webp` | `assets/images/mascot/mascot_onboarding.webp` | WebP | ~262 KB | Welcome screen, application tour, live broadcast greeting. |
| `mascot_empty_favorites.webp` | `assets/images/mascot/mascot_empty_favorites.webp` | WebP | ~134 KB | Empty favorites screen encouraging station discovery. |
| `mascot_empty_search.webp` | `assets/images/mascot/mascot_empty_search.webp` | WebP | ~132 KB | Empty search / filter results inviting new keywords. |
| `mascot_empty_comments.webp` | `assets/images/mascot/mascot_empty_comments.webp` | WebP | ~157 KB | Empty episode discussion encouraging first comment. |
| `mascot_offline.webp` | `assets/images/mascot/mascot_offline.webp` | WebP | ~135 KB | Network disconnection or radio buffering fallback. |
| `mascot_ugc_guidelines.webp` | `assets/images/mascot/mascot_ugc_guidelines.webp` | WebP | ~136 KB | Community safety guidelines and UGC terms dialog. |

*Total Mascot Package Size*: **~1.13 MB** (Strictly within the 1.2 MB app package budget defined in the Mascot Contract).

---

### C. Promotional & Store Listing Assets (`hudhud_fm/design/store-listing/`)

| File Name | Relative Path | Format | Dimensions | Purpose / Store Placement |
| :--- | :--- | :--- | :--- | :--- |
| `app-icon-512x512.png` | `design/store-listing/app-icon-512x512.png` | PNG | 512×512 px | Google Play Store icon. |
| `feature-graphic-1024x500.png` | `design/store-listing/feature-graphic-1024x500.png` | PNG | 1024×500 px | Arabic Google Play Store Feature Graphic header. |
| `feature-graphic-en-1024x500.png` | `design/store-listing/feature-graphic-en-1024x500.png` | PNG | 1024×500 px | English Google Play Store Feature Graphic header. |

---

### D. In-App Banners (`hudhud_fm/assets/images/banners/`)

| File Name | Relative Path | Format | Size | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `hudhud-discovery-v1.jpg` | `assets/images/banners/hudhud-discovery-v1.jpg` | JPG | ~226 KB | Home screen discovery carousel feature graphic. |

---

## 2. Asset Integrity & Governance Rules

1. **Zero Silent Substitutions**:
   - Never replace the official Hoopoe mascot with generic cartoon birds or third-party stock vectors.
   - If an asset variant is required that does not exist in this inventory, the agent must report:
     ```text
     ASSET_REQUIRED: <description_of_needed_asset>
     ```
2. **Composite Over Regeneration**:
   - For marketing posters and social media banners, the actual high-resolution logo (`assets/images/branding/logo.png`) and verified mascot render (`assets/images/mascot/mascot_onboarding.webp`) must be composited onto generated 3D backgrounds rather than hallucinated or re-imagined from scratch.
3. **Format & Performance Integrity**:
   - In-app raster assets must remain optimized WebP or compressed PNG to maintain rapid app startup and minimize memory footprint.
