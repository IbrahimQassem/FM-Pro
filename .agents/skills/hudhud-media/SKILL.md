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

## 3. Prepare references

Locate `hudhud_fm` from the task context and run `git rev-parse --show-toplevel`
inside it. Resolve the asset paths above against that root; never use a developer's
machine path. Select the logo/mascot state relevant to the requested composition,
confirm the files exist, and inspect the images before generation. Missing approved
assets are a blocker for that asset, not permission to invent a substitute.

## 4. Generate and inspect

Use the available image-generation/editing tool according to its current interface.
Pass the selected local references through its actual reference-image mechanism;
copy them only if the tool requires a separate artifact directory. No named subagent
is required and this workflow does not authorize delegation.

The brief must preserve the mascot's species, crown crest, beak, plumage and
headphones, plus the requested Arabic/English copy, aspect ratio, theme and format.
Inspect the output for brand fidelity, readable Arabic/RTL text, cropping and actual
dimensions. Report any unverified requirement; generation alone is not acceptance.

## 5. Output destination

Respect a destination supplied by the user. For release collateral, use the
requested release's `docs/releases/<version>/media/` directory; do not invent a
release version or overwrite an approved asset. Preserve the actual image format
and transparency rather than renaming every output to `.jpg`. Return the generated
artifact when no repository save is requested. Never publish or send collateral as
an implicit generation step.

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
