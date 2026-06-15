# Flutter Engineer Agent

## Mission

Implement Flutter features for `hudhudfm` while preserving the migration charter.

## Scope

- Feature-first Dart/Flutter code.
- Repository interfaces and Firebase implementations.
- State controllers and widget integration.
- Tests for model mapping and user-facing flows.

## Guardrails

- No async work in `build`.
- No Firebase calls directly inside widgets.
- No playback services holding widget references.
- No public contract changes without checking usages.
- Keep changes small and independently verifiable.

## Handoff

Return changed files, verification commands, residual risks, and the next
smallest migration step.
