# HudHud FM Gemini CLI setup

Added 2026-09-07 alongside Codex. Installed CLI inspected: Gemini 0.46.0.

## Shared sources and Gemini adapters

| Capability | Configuration | Scope |
| --- | --- | --- |
| Instructions | `.gemini/settings.json` loads `AGENTS.md` and `GEMINI.md` | Root and applicable component instructions; no duplicate architecture contracts |
| Skills | Existing `.agents/skills/hudhud-flutter`, `hudhud-web`, `hudhud-firebase` | Shared repository skills, discovered by both clients |
| Extension | `plugins/hudhud-workspace/gemini-extension.json` | Shares the existing `skills/hudhud-workspace-check/SKILL.md` with the Codex plugin |
| MCP | `hudhud-dart` and `hudhud-openai-docs` in `.gemini/settings.json` | Dart SDK stdio and official documentation Streamable HTTP |
| Hooks | `.gemini/hooks/workspace.py` | Adapts SessionStart and AfterAgent to existing advisory checks |
| Permission rules | Gemini's native policy engine and existing user/system settings | Codex `.rules` files are not loaded or translated into broad tool approvals |

The extension is linked locally and enabled for this workspace, with its user-wide
enablement disabled. Its skill also verifies HudHud repository markers before use.
Other Gemini extensions, credentials, model selection and approval settings are preserved.

Start Gemini **from `hudhud_fm`**. The shared contracts cover Flutter, both web apps,
Functions, emulator tests and seed tools. Project settings are cwd-specific; start
at the root before working on a component, rather than assuming a nested launch
will load the same settings.

## Start and inspect

```sh
cd /path/to/hudhud_fm
gemini
```

In the interactive session:

- `/memory show`: verify shared root instructions loaded. Follow the applicable
  nested `AGENTS.md` when entering a component.
- `/skills list`: confirm the three repository skills and the extension skill.
- `/mcp`: inspect connection status for `hudhud-dart` and `hudhud-openai-docs`.
- `/hooks panel`: inspect hook status; respect native trust/activation prompts.

Use existing Gemini authentication. No login tokens or API keys were added to the
repository. A trusted-folder or skill-consent prompt is handled through Gemini's
normal UI; this setup does not edit trust records or enable YOLO/automatic approval.

For another checkout or machine, after reviewing the local extension:

```sh
gemini extensions link ./plugins/hudhud-workspace
gemini extensions disable hudhud-workspace --scope user
gemini extensions enable hudhud-workspace --scope workspace
```

The link points to local source, so extension source updates are picked up by a new
Gemini session. Codex's plugin cache/reinstall workflow remains separate. Keep the
two manifest versions aligned when releasing changes to the shared skill.

## MCP behavior

Gemini aliases use hyphens because its policy parser treats underscores specially.
These aliases address the same server command/endpoint as the Codex entries; they
do not share a live process. Both clients can therefore start their own Dart server.
Use one active client per edit task to avoid concurrent file changes.

`httpUrl` selects Streamable HTTP for the documentation endpoint. Timeouts are in
milliseconds in Gemini, unlike Codex's seconds. No `trust: true`, credential headers,
unrestricted Firebase connection or production commands are configured.

If Dart cannot start, check that the Gemini process has the installed Flutter/Dart SDK
on PATH. Follow the common Node 22 requirements and component verification matrix in
the [Codex workspace guide](codex-workspace-setup.md); these are repository requirements,
not client-specific requirements. The setup does not change the active Node version.

## Hooks

The adapter forwards only cwd and a mapped event name to the existing
`.codex/hooks/workspace.py`. Prompt/response text and transcript paths are not
forwarded or logged. SessionStart returns Gemini-compatible context;
AfterAgent maps to Stop and runs governance plus staged/unstaged diff checks.

Results are advisory. A failure displays a safe message; it cannot force a model
retry, reject a response or grant permissions. Missing or invalid input produces
an empty JSON object. Events outside HudHud are ignored. The adapter discards
blocking/decision fields even if a future shared hook returns them.

The Gemini adapter currently depends on the shared script at its existing Codex
path. If that script moves, update both clients and tests together. No Git hooks,
dependency installation, formatting or application builds run automatically.

## Verification and maintenance

From the repository root:

```sh
python3 -B -m unittest discover -s tool/codex -p 'test_*.py'
./tool/verify-governance.sh
git diff --check
gemini skills list
gemini extensions list
gemini mcp list
```

Hook tests exercise event mapping, cwd restrictions, privacy filtering, malformed
input, failure reporting and nonblocking behavior. CLI discovery and MCP connection
checks do not require asking a Gemini model to edit the repository. Application
builds/tests are needed only when actual application code changes.

To disable the extension here: `gemini extensions disable hudhud-workspace --scope workspace`.
Use Gemini's hook management UI for hook activation. Remove only the Gemini-specific
settings/adapter/manifest to undo this integration; retain shared skills/contracts
and the Codex setup. Avoid disabling unrelated global extensions or MCP servers.

## Initialization results

- Gemini CLI 0.46.0 linked `hudhud-workspace`; user scope disabled and workspace
  scope enabled successfully.
- `gemini skills list` discovered `hudhud-flutter`, `hudhud-web`,
  `hudhud-firebase`, and `hudhud-workspace-check`, all enabled.
- `gemini mcp list` reported both `hudhud-dart` and `hudhud-openai-docs` Connected.
- All 11 shared/adapter hook tests passed. Direct SessionStart and AfterAgent runs
  returned valid advisory JSON. Governance, JSON parsing and diff checks passed.
- Restricted CLI skill discovery initially timed out; rerunning with the required
  SDK/network permissions succeeded. No model prompt or application/data tool call
  was used. Application tests/builds were not run for this tooling-only change.

## Official references

- [Project configuration and context filenames](https://geminicli.com/docs/reference/configuration/)
- [Shared .agents skill discovery](https://geminicli.com/docs/cli/using-agent-skills/)
- [Gemini lifecycle hook schema](https://geminicli.com/docs/hooks/reference/)
- [Local extensions and workspace enablement](https://geminicli.com/docs/extensions/reference/)
- [Gemini permission-policy engine](https://geminicli.com/docs/reference/policy-engine/)
