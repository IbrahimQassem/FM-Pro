# HudHud FM Release Contract — v3.0.3

```yaml
release:
  product: HudHud FM (هدهد إف إم)
  version: 3.0.3
  release_type: Production Maintenance & Visual Polish Release
  release_date: "2026-09-21"
  build: "33"
  platforms:
    - Android (target: Google Play, applicationId: com.sana.dev.fm)

summary: >
  HudHud FM v3.0.3 delivers comprehensive visual, branding, and UX refinements across the entire
  application. It replaces legacy generic icons with high-fidelity circular and square luxury brand
  emblems, eliminates white border artifacts and letterboxing on native Android adaptive launcher icons,
  introduces an official warm-amber mascot radio placeholder across all station cards and player surfaces,
  optimizes now playing typography with centered station titles, and implements smooth auto-sliding
  home banners.

highlights:
  - "Luxury App Branding & Icon Suite: Pixel-perfect high-resolution circular luxury emblem (`app_logo_circle.png`) and seamless square emblem (`app_logo_square.png`, `app_icon_1024.png`)."
  - "Seamless Adaptive Android Icons: Native Android adaptive icons (`ic_launcher_foreground.png`, `ic_launcher_monochrome.png`) with color-matched background (`#14090B`) in `colors.xml`, eliminating all white letterboxing."
  - "Warm-Amber Mascot Placeholder: Official luxury radio mascot placeholder (`station_placeholder.webp`) seamlessly integrated across `StationCard`, `StationDetailsScreen`, and `_MiniArtwork` in `MiniPlayer`."
  - "Artwork & Model Alignment: Replaced legacy `Icons.radio_rounded` and removed harsh white border artifacts in station details and player widgets."
  - "Now Playing Sheet UX: Centered station titles with balanced vertical rhythm, spacing, and gesture feedback."
  - "Home View Carousel: Smooth auto-sliding banner carousel transitions with safe timer lifecycle handling."
  - "Full Test Suite Validation: All 231 tests passing across widget, unit, and screen acceptance suites."
```
