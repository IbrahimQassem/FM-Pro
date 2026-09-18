# HudHud FM — Permanent Brand & Visual Identity Contract

* **Status**: Binding (عقد ملزم دائم)
* **Authority**: HudHud FM Release, Brand & Launch Authority
* **Effective Date**: 2026-09-18
* **Scope**: All client applications (Flutter mobile, web_hudhud, web_admin), marketing communications, social media, store listings, and launch collateral.

---

## 1. Brand Vision & Cultural Heritage

**HudHud FM (هدهد إف إم)** is an Arabic-first digital radio and audio community platform dedicated to unifying Yemeni radio stations, live broadcasts, and audio programs under a single, high-fidelity experience.

The visual identity is anchored in:
- **The Hoopoe (الهدهد)**: Historically recognized across South Arabian and Yemeni heritage (the Kingdom of Sheba / حضارة سبأ) as the trustworthy messenger of truthful news, wisdom, and knowledge. In HudHud FM, the Hoopoe evolves into the friendly digital audio guide and station companion.
- **Modern Audio Technology**: Seamlessly blending rich traditional heritage with modern broadcasting aesthetics — studio headphones, warm acoustic waves, high-clarity microphones, and streamlined digital interfaces.
- **Warm Yemeni Elegance**: Departing from generic tech blues and neon palettes in favor of a regal Yemeni plum/burgundy theme (`#8E3E63` / `#8B2648`) paired with warm cream surfaces and dark acoustic studio glassmorphism.

---

## 2. Official Brand Assets & Source of Truth

All production and promotional collateral must exclusively utilize the official project assets located in `assets/images/branding/` and `assets/images/mascot/`. **Never invent stock replacements or modify the core mascot anatomy.**

| Asset Name | Canonical Repository Path | Dimensions / Format | Verified Context |
| :--- | :--- | :--- | :--- |
| **Official Full Logo** | `assets/images/branding/logo.png` | 2400×2400 (PNG RGBA) | Primary brand header, splash screens, launch posters, promotional banners. |
| **Official App Icon Master** | `assets/images/branding/app_icon_1024.png` | 1024×1024 (PNG RGBA) | App stores, launcher configuration, lockup badges, favicon masters. |
| **Play Store Icon** | `design/store-listing/app-icon-512x512.png` | 512×512 (PNG RGBA) | Google Play Store listing asset. |
| **Store Feature Graphic (AR)** | `design/store-listing/feature-graphic-1024x500.png` | 1024×500 (PNG) | Google Play Arabic store header showcase. |
| **Store Feature Graphic (EN)** | `design/store-listing/feature-graphic-en-1024x500.png` | 1024×500 (PNG) | Google Play English store header showcase. |
| **Mascot: Default Avatar** | `assets/images/mascot/mascot_avatar_default.webp` | WebP RGBA | Default listener avatar in account screens. |
| **Mascot: Onboarding / Host** | `assets/images/mascot/mascot_onboarding.webp` | WebP RGBA | Welcome tour, host greetings, live broadcast key visual. |
| **Mascot: Empty Favorites** | `assets/images/mascot/mascot_empty_favorites.webp` | WebP RGBA | Empty state for starred stations/episodes. |
| **Mascot: Empty Search** | `assets/images/mascot/mascot_empty_search.webp` | WebP RGBA | Discovery and search zero-results state. |
| **Mascot: Empty Comments** | `assets/images/mascot/mascot_empty_comments.webp` | WebP RGBA | Episode discussions zero-comments state. |
| **Mascot: Offline Signal** | `assets/images/mascot/mascot_offline.webp` | WebP RGBA | Radio tuning offline / connectivity retry state. |
| **Mascot: UGC Guidelines** | `assets/images/mascot/mascot_ugc_guidelines.webp` | WebP RGBA | Community safety dialog & terms modal. |
| **Official Discovery Banner** | `assets/images/banners/hudhud-discovery-v1.jpg` | JPG | In-app discovery carousel and marketing backdrops. |

---

## 3. Official Color Palette & Design Tokens

The color system is derived directly from the application theme code (`lib/core/theme/app_colors.dart` and `app_theme.dart`):

### Primary Brand Palette
```css
--hudhud-primary: #8E3E63;              /* Royal Yemeni Plum / Burgundy */
--hudhud-hero-start: #8B2648;           /* Deep Crimson Maroon (Adaptive Icon Background) */
--hudhud-hero-end: #451222;             /* Acoustic Midnight Burgundy */
```

### Surfaces & Backgrounds
```css
/* Light Theme */
--hudhud-surface-light: #FCF8F8;        /* Warm Porcelain Cream */
--hudhud-container-light: #FFD8E4;      /* Soft Rose Tint */
--hudhud-on-container-light: #3B0021;   /* Deep Wine Text */
--hudhud-outline-light: #D5C2C6;        /* Subtle Rose Gray */

/* Dark Theme & Studio Glass */
--hudhud-surface-dark: #161215;         /* Deep Studio Charcoal */
--hudhud-scaffold-dark: #140F12;        /* Obsidian Wine Background */
--hudhud-card-dark: #1E171C;            /* Elevated Dark Glass Layer */
--hudhud-hero-start-dark: #6B1D37;      /* Dark Theme Hero Start */
--hudhud-hero-end-dark: #260A13;        /* Dark Theme Hero End */
```

### Functional & Signal Accents
```css
--hudhud-status-online: #1A8F5A;        /* Live Stream Broadcast Green (Dark: #34D399) */
--hudhud-live-red: #E53935;             /* ON-AIR Studio Indicator */
--hudhud-episode-accent: #C2185B;       /* Episode Play Accent (Dark: #F472B6) */
```

### Gradients
* **Hero Gradient (Light & Marketing)**: `LinearGradient(from: #8B2648, to: #451222, angle: 135deg)`
* **Dark Studio Glass Gradient**: `LinearGradient(from: rgba(139, 38, 72, 0.35), to: rgba(69, 18, 34, 0.15))` with `backdrop-filter: blur(20px)`

---

## 4. Typography & Language Direction

* **Primary Language**: Arabic (العربية) — RTL First.
* **Secondary Language**: English (International / Diaspora) — LTR.
* **Typographic Hierarchy**:
  - **Display / Headers (Arabic)**: Modern geometric Kufi or Neo-Naskh (Cairo / Alexandria / IBM Plex Sans Arabic). Bold, legible at high contrast, dignified letterforms.
  - **Body / Content**: Balanced, high-x-height Naskh with open counters for effortless readability on mobile screens under various lighting conditions.
  - **English Text**: Clean geometric sans-serif (Inter / Roboto / Outfit) matching the visual weight of the Arabic type.
* **Text Scaling**: Full compliance with up to 200% text scale without truncation or UI overflow.

---

## 5. Visual Style & Poster Composition

### A. 3D Dark Glassmorphism
For live broadcasting and premium campaigns:
* **Background**: Deep burgundy obsidian tones (`#140F12` to `#260A13`) with subtle spherical ambient backlighting (`#8B2648`).
* **Glass Surfaces**: Frosted glass cards with multi-layered specular highlights (`border: 1px solid rgba(255, 255, 255, 0.12)`), subtle inner glow, and deep soft drop shadows (`box-shadow: 0 16px 40px rgba(0,0,0,0.5)`).
* **Atmosphere**: Acoustic studio vibe, floating neon ON-AIR badge, subtle particle waves, physical studio condenser microphone with metallic bronze or silver mesh.

### B. Dynamic Audio Waveform Language
* Sound waves must feel responsive, rhythmic, and alive — smooth sinusoidal ribbons or gradient audio bars rather than harsh jagged spikes.
* Wave colors: Transitioning smoothly from `#8B2648` (hero crimson) through `#C2185B` (rose magenta) to `#34D399` / `#1A8F5A` (frequency resonance).

### C. Map & Geographic Cartography
* When visualizing Yemeni coverage, use an elegant minimalist topographic map of Yemen with smooth golden/burgundy illuminated station nodes (Sana'a, Aden, Mukalla, Taiz, Seiyun, Hodeidah, Marib, etc.).
* Connected broadcast arcs radiating outward, symbolizing unity and connection.

---

## 6. Mascot Governance & Usage Rules

1. **Role**: The Hoopoe is the listener's friendly guide, narrator, and studio host.
2. **Approved Expressions**:
   - *Host / Welcome*: Wearing modern studio headphones, gesturing warmly to the listener.
   - *Exploration*: Holding a vintage frequency dial or looking through binoculars with curiosity.
   - *Empty Discussion*: Resting beside a studio microphone waiting for the first word.
   - *Offline / Weak Signal*: Checking an antenna thoughtfully, inviting a gentle retry.
3. **Strict Prohibitions**:
   - **Never obscure active audio controls**: The mascot must never overlap the Now-Playing bar or playback controls.
   - **No baked-in raster text**: All mascot dialogue or labels must be rendered dynamically via localization (`AppLocalizations`).
   - **No anatomy mutilation**: The Hoopoe's characteristic crown feathers, slender beak, and distinctive wing markings must remain intact and recognizable.
   - **No comedic degradation**: The mascot maintains cultural respect, friendliness, and dignity at all times.

---

## 7. App UI Integration & Social Media Consistency

* **App UI**:
  - Consistent 22px card corner radii (`BorderRadius.circular(22)`).
  - 18px input fields and dialog buttons.
  - Generous 48×48 minimum tap targets.
  - Smooth micro-interactions for play/pause state transitions.
* **Social Media & Marketing**:
  - Every asset must carry the official HudHud FM logo mark in the primary focal hierarchy.
  - Visual posts must pair realistic modern smartphone mockups showcasing actual in-app screens with thematic 3D storytelling.
  - The permanent brand slogan for live radio campaigns is:
    **«استمع. اكتشف. شارك.» (Listen. Discover. Share.)**
