# HudHud FM Codex workspace setup

Initialized: 2026-09-07. Scope: this repository and all its subprojects.

Gemini CLI shares the skills and contracts through the
[Gemini workspace setup](gemini-workspace-setup.md). Its configuration and hook
adapter are separate; the Codex configuration below remains unchanged.

Both clients follow the shared [AI workflow and evaluation](ai-performance.md).
Its context, handoff and learning guidance is routed through root `AGENTS.md`.

## What is configured

| Layer | Files / capability | Activation |
| --- | --- | --- |
| Shared rules | Root `AGENTS.md`, existing `docs/contracts/` and `.agents/roles/` | Repository instructions; contracts remain authoritative |
| Component rules | `web_admin/AGENTS.md`, `web_hudhud/AGENTS.md`, `functions/AGENTS.md`, `firebase_tests/AGENTS.md`, `tool/firebase_seed/AGENTS.md` | Apply when working in each component |
| Skills | `.agents/skills/`: component, media, ECC, implementation/review, playback diagnostics and release readiness workflows | Repository skill discovery in a new session |
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

- `$project-maestro-implementer`: authorized implementation with inspection,
  contract-based verification and final diff review across HudHud components.
- `$project-maestro-reviewer`: read-only review with prioritized findings,
  explicit comparison scope and verification limits.
- `$hudhud-flutter`: Flutter changes and verification.
- `$hudhud-web`: admin/public web changes and UI verification.
- `$hudhud-firebase`: Functions, Rules, auth, UGC, data and seed workflows.
- `$hudhud-playback-diagnostics`: audio incident reproduction, async/native traces
  and sanitized physical-device evidence.
- `$hudhud-release-readiness`: candidate provenance, release gates and verified
  Arabic/English release claims; preparation does not grant publication authority.
- `$hudhud-media`: official brand references and image generation/editing.
- `$hudhud-ecc-review`: scoped roadmap/flow acceptance review; see the
  [selective ECC pilot](ecc-pilot.md) for provenance, results and limitations.
- `hudhud-workspace-check` from the HudHud Workspace plugin: cross-component impact
  and verification. The plugin checks repository markers before applying HudHud guidance.

The two `project-maestro-*` skills adapt Groshe's implementer/reviewer workflows
to HudHud's existing contracts and component skills. They do not install or start
Maestro, enable delegation, or change permissions. Their invocation names are
project-local; start a new session rooted in `hudhud_fm` to discover them.

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

If a user-level `openaiDeveloperDocs` entry already targets the same documentation
endpoint, both entries may appear in the combined configuration. Keep this project's
portable entry unless deliberately consolidating your own setup; do not modify
global MCP configuration as a side effect of repository maintenance.

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

The project pins **Node 22.23.4** in `.nvmrc`: Functions requires Node 22, web
packages require at least 22.13, and root tooling excludes Node 25+. From the
repository root, use `nvm install` then `nvm use` if nvm is your version manager.
The pin alone does not change an already running shell or Codex process.

An alternative isolated install, without changing global Node or app dependencies:

```sh
npm install --prefix .tools/node --no-save --package-lock=false --no-audit --no-fund node@22.23.4
export PATH="$PWD/.tools/node/node_modules/node/bin:$PATH"
node --version
```

Use that PATH for the task shell and child commands; do not change a global default.
Review any package-manager script approval using its native approval mechanism.
`.tools/` is ignored. Keep the documented version aligned when updating `.nvmrc`.

### On-demand environment and skill checks

Prepare the isolated Python environment once from the repository root:

```sh
python3 -m venv .tools/skills
.tools/skills/bin/python -m pip install -r tool/codex/requirements.txt
.tools/skills/bin/python -B tool/codex/check_environment.py --scope all
.tools/skills/bin/python -B tool/codex/validate_skills.py
.tools/skills/bin/python -B -m unittest discover -s tool/codex -p 'test_*.py'
```

The environment check also supports `tooling` (default), `flutter`, `web`, and
`firebase` scopes. It runs bounded Node/Java version probes, checks Flutter/Dart
presence, PyYAML availability and the local Firebase CLI pin as applicable. Java
21+ is required by the pinned Firebase CLI. Missing/unsupported prerequisites exit
nonzero; a compatible Node 22 differing from the exact pin produces a warning.
It does not install anything, start emulators, read credentials, invoke Flutter,
prove SDK operation or test MCP trust. Runtime MCP/skill/hook discovery is checked
in the active client with `/mcp`, `/skills` and `/hooks`.

The skill validator checks repository and plugin skill frontmatter, optional UI
metadata, duplicate YAML keys/names, static file references and stale home paths.
Inline `docs/`, `.agents/`, `lib/`, `test/`, `tool/`, `assets/` and `plugins/` paths
are repository-relative; Markdown links are skill-relative. Dynamic examples and
external URLs are skipped. It does not check anchors, remote links, semantics or
agent behavior. When available, also run the installed skill-creator's
`scripts/quick_validate.py` with this Python interpreter for each changed skill.
These checks are on demand; existing lifecycle hooks are unchanged.

| Changed area | Working directory | Checks |
| --- | --- | --- |
| Docs / instructions | Repository root | `./tool/verify-governance.sh`; `git diff --check`; skill validator above for skill changes |
| Agent tooling / hooks | Repository root | Isolated-Python unittest command above; environment/skill checks for affected tooling |
| Flutter | Repository root | Dart format check, `flutter analyze`, `flutter test`, `flutter build apk --debug` per quality contract |
| iOS / platform impact | Repository root | Required iOS build and device checks from quality/playback contracts |
| Admin web | `web_admin` | `npm run test`; `npm run lint`; `VITE_FIRESTORE_ROOT=HudHudDev npm run build` |
| Public web | `web_hudhud` | `npm test`; `npm run lint`; `VITE_FIRESTORE_ROOT=HudHudDev npm run build` (includes typecheck); browser checks |
| Functions | `functions` | `npm run lint`; `npm test` |
| Rules / changed writes | Repository root | `npm run emulators:test` |
| Trusted editor/import saves | Repository root | `npm run emulators:editorial`; `npm run emulators:admin` (the latter uses isolated Auth/Firestore/Functions with only the production save/delete/moderation callables exported) |
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
