# Firebase Functions instructions

Read root AGENTS.md, Firebase/security contracts and the affected feature contract.
Use Node 22 and the existing JavaScript ESM modules and built-in test runner.

- Preserve shared Auth identity, both explicit data roots, recent-auth deletion,
  trusted verification, idempotent retries and server-owned sensitive collections.
- Never print account data, OTPs, tokens, mail configuration or request payloads.
- Keep validation and authorization server-side. Inspect callers, Rules and emulator
  tests before changing callable contracts or account/UGC behavior.
- Run `npm run lint` and `npm test`. From the root, run the relevant account-deletion,
  email-verification or Rules emulator script when the affected behavior needs it.
- Keep deployment, real email delivery and production data mutations separate from
  local verification under the existing session authorization.

