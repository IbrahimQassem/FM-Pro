# HudHud FM Codex workspace setup

Initialized: 2026-09-07. Scope: this repository and all its subprojects.

Gemini CLI shares the skills and contracts through the
[Gemini workspace setup](gemini-workspace-setup.md). Its configuration and hook
adapter are separate; the Codex configuration below remains unchanged.

## What is configured

| Layer | Files / capability | Activation |
| --- | --- | --- |
| Shared rules | Root `AGENTS.md`, existing `docs/contracts/` and `.agents/roles/` | Repository instructions; contracts remain authoritative |
| Component rules | `web_admin/AGENTS.md`, `web_hudhud/AGENTS.md`, `functions/AGENTS.md`, `firebase_tests/AGENTS.md`, `tool/firebase_seed/AGENTS.md` | Apply when working in each component |
| Skills | `.agents/skills/hudhud-flutter`, `hudhud-web`, `hudhud-firebase` | Repository skill discovery in a new session |
| Plugin | `plugins/hudhud-workspace` | Installed from the local `hudhud-local` marketplace; exposes `hudhud-workspace-check` |
| MCP | `.codex/config.toml` | Official OpenAI docs and installed Dart/Flutter SDK server; project trust required |
| Command rules | `.codex/rules/workspace.rules` | Narrow Git inspection permissions; no mutation/deploy allowlist |
| Hooks | `.codex/hooks.json` and `.codex/hooks/workspace.py` | Review/trust through `/hooks`; start context and nonblocking turn-end checks |

Open Codex with `hudhud_fm` as the project root, or start the CLI inside it. Opening
only the parent `acceleration` folder does not guarantee discovery of this child
repository's configuration. Preserve existing user-level model, sandbox, approval,
plugins and MCP settings; this setup does not replace them.

## Skills and plugin

Use the focused repository skills automatically for matching work, or invoke:

- `$hudhud-flutter`: Flutter changes and verification.
- `$hudhud-web`: admin/public web changes and UI verification.
- `$hudhud-firebase`: Functions, Rules, auth, UGC, data and seed workflows.
- `hudhud-workspace-check` from the HudHud Workspace plugin: cross-component impact
  and verification. The plugin checks repository markers before applying HudHud guidance.

The plugin is a local development package with no external account dependencies.
Its source lives in the repository; installation registers/caches it in the local
Codex user configuration. Existing Product Design, security, Atlas Scout and fallow
plugins remain optional task-specific tools. Their skill listing alone does not
prove a callable MCP server is connected; use CLI/source inspection fallbacks.

For another checkout, register and install from the repository root:

```sh
codex plugin marketplace add .
codex plugin add hudhud-workspace@hudhud-local
```

After editing plugin source, follow the plugin-creator cachebuster/reinstall workflow
and start a new thread. Repository skills outside the plugin do not require plugin
reinstallation. Do not copy all installed global plugins into this repository.

## MCP

- `hudhud_openai_docs`: `https://developers.openai.com/mcp`; documentation only, no
  app account or API key required. Network reachability is required.
- `hudhud_dart`: `dart mcp-server` from PATH. Add this repository as the tool root
  when needed. Supports analysis/tests and app/runtime tools; operations that modify
  code or start apps still follow the user's task and applicable permissions.

Use `/mcp` in a new Codex CLI session to verify live connections. `codex mcp list`
shows configuration, not a successful tool handshake. If the Dart SDK is not on the
Codex process PATH, fix the local launcher environment; do not commit a developer's
absolute SDK path. Restart Codex after changing its launch environment.

Firebase uses the existing pinned CLI and emulator scripts. No unrestricted live
Firebase MCP or new cloud credentials are installed. Web inspection uses the already
available browser tools; no duplicate browser server is required.

## Hooks and trust

The SessionStart hook adds a short map of existing instructions. The Stop hook runs
governance plus staged/unstaged whitespace checks, discards raw command output and
reports only failing check names. It does not block completion, modify files, run
builds, access the network, log hook payloads or claim application tests passed.
Both scripts ignore events outside this repository. These are Codex lifecycle hooks;
Git `core.hooksPath` is unchanged.

Codex requires review of the exact hook definition before execution. In a new CLI
session, use `/hooks` to inspect and trust these two definitions. Do not bypass trust
or edit Codex trust records programmatically. Editing a hook may require review again.
Project configuration must also be trusted; this setup does not self-grant trust.

## Toolchain and verification matrix

Use Node **22.13 or newer within Node 22** for a common compatible baseline: Functions
requires Node 22, web packages require at least 22.13, and root tooling excludes Node
25+. Initialization found Node 26.6 on PATH; a supported Node 22 environment is needed
before treating application checks as supported. No global Node version was changed.

| Changed area | Working directory | Checks |
| --- | --- | --- |
| Docs / instructions | Repository root | `./tool/verify-governance.sh`; `git diff --check` |
| Hooks | Repository root | `python3 -B -m unittest discover -s tool/codex -p 'test_*.py'` |
| Flutter | Repository root | Dart format check, `flutter analyze`, `flutter test`, `flutter build apk --debug` per quality contract |
| iOS / platform impact | Repository root | Required iOS build and device checks from quality/playback contracts |
| Admin web | `web_admin` | `npm run test`; `npm run lint`; `VITE_FIRESTORE_ROOT=HudHudDev npm run build` |
| Public web | `web_hudhud` | `npm run lint`; `VITE_FIRESTORE_ROOT=HudHudDev npm run build`; browser checks |
| Functions | `functions` | `npm run lint`; `npm test` |
| Rules / changed writes | Repository root | `npm run emulators:test` |
| Account deletion | Repository root | `npm run emulators:account-deletion` plus affected Functions/web/app checks |
| Email verification | Repository root | `npm run emulators:email-verification` plus affected Functions/app checks |
| Seed tooling | `tool/firebase_seed` | Inspect current README/package scripts; use validation/dry-run within authorized scope |

Never interpret hook success as a substitute for this matrix. Choose checks by actual
impact and report unavailable tooling. No application code, dependencies, signing,
Firebase configuration or production state is changed by this setup.

## Maintenance and rollback

Keep contract decisions in `docs/contracts/`; skills link to them instead of copying
the entire specification. Add a hook only for a demonstrated repeated need. Do not
auto-format, install dependencies or run an entire Flutter build on every tool call.

To disable a hook, use `/hooks`. To disable one project MCP server, set `enabled = false`
in its config table. Remove the plugin with `codex plugin remove` using its installed
identifier; inspect `--help` first. Preserve other plugins/marketplaces and existing
user configuration. Revert only these setup files if the whole setup is unwanted.

## Initialization verification

- Codex CLI 0.153.4 confirmed `hudhud-workspace@hudhud-local` installed and enabled.
- Official validators passed for all three repository skills, the plugin skill,
  and the plugin manifest. PyYAML was installed only in a temporary validation venv.
- Five hook behavior tests passed; governance, JSON/TOML parsing and diff checks passed.
- Direct MCP initialization/tool-list smoke checks passed: Dart advertised 13 tools;
  official OpenAI docs advertised 5. No app/data tool was invoked.
- These direct handshakes verify the server commands/endpoints, not automatic loading
  in the current conversation. The current CLI did not expose the project entries
  through `mcp get`; open a new trusted project session and confirm `/mcp` and `/hooks`.
- App tests/builds were not run because this change only adds agent tooling and
  documentation. Node 26 remains an application-toolchain mismatch as noted above.

## Official configuration references

- [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)
- [Official documentation MCP](https://developers.openai.com/learn/docs-mcp)
- [Lifecycle hooks and trust](https://learn.chatgpt.com/docs/hooks)
- [Project command rules](https://learn.chatgpt.com/docs/agent-configuration/rules)
