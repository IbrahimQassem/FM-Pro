---
name: hudhud-flutter
description: Implement or review HudHud FM Flutter features in lib, test, Android or iOS while preserving Riverpod, playback, Firebase boundaries and Arabic RTL.
---

# HudHud Flutter workflow

Locate the HudHud repository from the task cwd. Read its AGENTS.md, docs/README.md,
the relevant contract, and the matching .agents/roles/ file. Existing source and
tests establish current behavior; report contract conflicts instead of guessing.

1. Inspect the feature's presentation/domain/data chain and callers before editing.
2. Preserve Riverpod and the app/providers.dart composition boundary. Keep Firebase
   in data sources and the shared player lifecycle intact.
3. Follow cache/server behavior and localized ARB messages. Check loading, empty,
   offline, error, RTL, large text and semantics for affected journeys.
   For changed controls, exercise Arabic/English, 200% text, focus order and
   semantic actions; compare small/large screen renders. Automated semantics
   checks do not substitute for TalkBack/VoiceOver evidence when required.
4. Add a focused regression test for a behavior fix when useful. Run relevant tests,
   then the Flutter quality gates required by the owning contract. For docs-only
   work, governance and diff checks suffice.
5. Report files, commands/results and unverified platform behavior. Build success
   is not proof of real-device background audio or notification delivery.

Use Dart MCP when available for analysis, tests, package lookup and runtime work.
Add only this repository as an MCP root; do not log account data or stream URLs.
CLI Flutter/Dart tools remain a valid fallback when MCP is unavailable.
