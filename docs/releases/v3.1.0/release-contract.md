# HudHud FM Release Contract — v3.1.0

```yaml
release:
  product: HudHud FM (هدهد إف إم)
  version: 3.1.0
  release_type: Production Feature & Intelligence Release
  release_date: "2026-10-10"
  build: "36"
  platforms:
    - Android (target: Google Play, applicationId: com.sana.dev.fm)
    - iOS (target: App Store, bundleId: com.sana.dev.fm)
    - Web Admin (hudhud-fm-admin-sanadev, internal operations)
    - Web Public (sanadev-fm, live portal)

summary: >
  HudHud FM v3.1.0 expands station discovery and operations with direct social media and official website connectivity
  for listeners, enterprise-grade radio station management with reference contact intelligence, comprehensive digital
  streaming and FM broadcast engineering specifications, and a native 44-column RTL Excel export restricted strictly
  to Super Administrators.

highlights:
  - "Station Social Connectivity: Direct in-app links to station website, Facebook, Instagram, YouTube, Twitter/X, and WhatsApp."
  - "Station Management Intelligence: Structured reference contact metadata (owner, address, contact person, phone, email) for station governance."
  - "Broadcast & Streaming Engineering Specs: Comprehensive technical parameters covering stream protocols, hosts, ports, server types (Icecast/Shoutcast/HLS), audio codecs, bitrates, sample rates, transmitter power, tower locations, coverage areas, and RDS telemetry."
  - "Super Admin Excel Export: High-fidelity 44-column RTL Excel workbook generation (.xlsx) strictly gated for Super Admins in Web Admin."
  - "Clean Separation of Concerns: Strict contract enforcement where listener-facing Flutter clients receive only public links, while internal reference and technical infrastructure remain exclusive to administrative operations."

features:
  - id: FEAT-STATION-SOCIAL-LINKS
    name: "Station Social Connectivity & Web Links"
    description: "Interactive public action chips in station details view enabling listeners to visit station websites and social profiles (Facebook, Instagram, YouTube, Twitter/X, WhatsApp) via secure url_launcher."
  - id: FEAT-STATION-MANAGEMENT-REFS
    name: "Station Management Reference Intelligence"
    description: "Internal reference contact metadata model for radio ownership entities, physical studio addresses, authorized contact managers, official hotlines, and direct emails."
  - id: FEAT-BROADCAST-TECH-SPECS
    name: "Broadcast & Streaming Technical Specifications"
    description: "Engineering and telemetry metadata capturing stream server architecture, codecs, bitrates, sample rates, FM transmission power, broadcast tower coordinates, coverage zones, and RDS station identifiers."
  - id: FEAT-SUPER-ADMIN-EXCEL-EXPORT
    name: "Super Admin 44-Column RTL Excel Export"
    description: "Native .xlsx export engine in Web Admin providing comprehensive 44-column tabular auditing with auto-sized columns and Arabic headers, exclusively accessible to isSuperAdmin accounts."

improvements:
  - "Enriched Firestore Station schema contracts and fixtures while preserving non-breaking forward compatibility."
  - "Enhanced Web Admin station editing form with intuitive grouped inputs for social links, management contacts, and engineering telemetry."
  - "Strict type safety and zero-warning oxlint and flutter analyze governance verification."

governance_and_verification:
  flutter_tests: "250 passed (0 failed)"
  flutter_analyze: "0 issues found"
  web_admin_tests: "54 passed (0 failed)"
  web_admin_lint: "0 errors, 0 warnings (oxlint)"
  deployment_status: "Verified live on GitHub (hudhud_fm) and Firebase Hosting (sanadev-fm & hudhud-fm-admin-sanadev)"
```
