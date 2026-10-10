---
name: hudhud-media
description: >-
  Generate marketing images, social posts, posters, and promotional collateral
  for HudHud FM. Ensures official mascot, logo, and brand assets are always
  used as reference images — never invented. Covers Glassmorphism, Neumorphism,
  banners, and store assets.
---

# HudHud FM Media Generation Workflow

Use this skill whenever generating any marketing image, poster, social post,
or promotional asset for the HudHud FM project.

## 1. Read Brand Docs First
Before generating, always read the brand contract for colors, typography, mascot rules:
- `docs/brand/brand-contract.md` — official color palette, glassmorphism spec, mascot governance
- `docs/contracts/mascot-brand-identity-contract.md` — approved mascot states and strict boundaries

## 2. Official Brand Assets (Source of Truth)
All generations MUST use these exact files as references — never invent or substitute:

| Asset | Path |
|---|---|
| Full logo | `assets/images/branding/logo.png` |
| App icon (circle) | `assets/images/branding/app_logo_circle.png` |
| Mascot — Onboarding/Host | `assets/images/mascot/mascot_onboarding.webp` |
| Mascot — Avatar default | `assets/images/mascot/mascot_avatar_default.webp` |
| Mascot — Offline | `assets/images/mascot/mascot_offline.webp` |
| Mascot — Empty search | `assets/images/mascot/mascot_empty_search.webp` |

## 3. Required Pre-Generation Steps
**Always do this before calling the image-generator subagent:**

```bash
ARTIFACT_DIR="<conversation artifact dir>"
SRC="/Users/iq/AndroidStudioProjects/accelerate/hudhud_fm"

cp "$SRC/assets/images/mascot/mascot_onboarding.webp"      "$ARTIFACT_DIR/mascot_onboarding.webp"
cp "$SRC/assets/images/mascot/mascot_avatar_default.webp"  "$ARTIFACT_DIR/mascot_avatar_default.webp"
cp "$SRC/assets/images/branding/logo.png"                  "$ARTIFACT_DIR/logo.png"
cp "$SRC/assets/images/branding/app_logo_circle.png"       "$ARTIFACT_DIR/app_logo_circle.png"
```

## 4. Image Generator Brief — Mandatory Instructions
When briefing the image-generator subagent, ALWAYS include:
- The **absolute path** to each copied reference image
- An explicit instruction: *"Read this reference file first and faithfully reproduce the mascot's EXACT appearance — same species, same crown crest, same beak, same plumage, same headphones. Do NOT invent a different design."*

## 5. Output Destination
The image-generator saves to its own artifact dir. After generation, always copy:
```bash
cp "<artifact_dir>/<generated_file>.jpg" \
   "docs/releases/<version>/media/<target_name>.jpg"
```
Canonical location is always `docs/releases/<version>/media/`.

## 6. Brand Color Quick Reference
```css
--hudhud-primary:    #8E3E63;   /* Royal Yemeni Plum */
--hudhud-hero-start: #8B2648;   /* Deep Crimson Maroon */
--hudhud-hero-end:   #451222;   /* Acoustic Midnight */
--hudhud-bg:         #140F12;   /* Obsidian Wine Background */
--hudhud-card:       #1E171C;   /* Elevated Dark Glass Layer */
--hudhud-gold:       #D4AF37;   /* Warm Yemeni Gold */
--hudhud-gold-light: #E6B04C;   /* Soft Gold Accent */
--hudhud-online:     #34D399;   /* Broadcast Green */
--hudhud-live:       #E53935;   /* ON-AIR Red */
--hudhud-episode:    #F472B6;   /* Episode Rose Magenta */
```

## 7. Style Specs

### Glassmorphism (from brand contract)
- Background: `#140F12` → `#260A13` with ambient `#8B2648` glow
- Glass panels: `backdrop-filter: blur(20px)`
- Glass border: `1px solid rgba(255,255,255,0.12)`
- Drop shadow: `0 16px 40px rgba(0,0,0,0.5)`
- Wave gradient: `#8B2648` → `#C2185B` → `#34D399`

### Neumorphism (dark variant)
- Base: `#1A0A10`
- Light shadow (top-left): `#3A1628` ~20% opacity
- Dark shadow (bottom-right): `#060205` ~80% opacity
- Surfaces: softly raised convex style

## 8. Output Naming Convention
| Type | Filename Pattern |
|---|---|
| Neumorphism square 1:1 | `poster_neumorphism_<variant>.jpg` |
| Glassmorphism portrait 4:5 | `poster_glassmorphism_<variant>.jpg` |
| Banner 16:9 | `banner_<number>_<description>.jpg` |
| Store feature graphic | `feature_graphic_<lang>_1024x500.jpg` |
| Social post square | `social_<number>_<description>.jpg` |
