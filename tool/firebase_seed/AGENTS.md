# Firebase seed and maintenance instructions

Read root AGENTS.md, this directory's README, package scripts and the data contract.
These are administrative tools, not normal app startup or test side effects.

- Preserve canonical seed validation, relationship integrity, create-only atomic
  writes, development-root boundaries and dry-run defaults.
- Inspect the precise script before running it; `--apply`, claim grants and data
  migrations are live mutations when connected to a real project.
- Use synthetic data. Never display credentials, account identifiers or environment
  secrets. Do not copy legacy application data into this independent project.
- Use existing validation/test scripts listed in package.json. Record dry-run versus
  applied results accurately. Follow existing authorization for actual mutations;
  a workspace setup request alone is not a seed/apply instruction.

