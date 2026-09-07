# Gemini workspace entry

The project settings load `AGENTS.md` and `GEMINI.md`. Root and applicable nested
`AGENTS.md` files own the shared instructions; do not duplicate those rules here.
Read `docs/README.md` and only the contracts relevant to the requested change.

Gemini setup and activation: `docs/operations/gemini-workspace-setup.md`.
Reuse the three repository skills in `.agents/skills/`. The local
`hudhud-workspace` extension exposes the shared workspace-check skill.
Codex-specific slash commands and plugin instructions do not apply to Gemini;
use the Gemini setup guide for discovery and verification commands.

Start Gemini from `hudhud_fm`. Preserve the existing task authorization, unrelated
changes, and component boundaries. Available tools do not authorize deployment,
production writes, real messaging, or changes outside the user's task.
