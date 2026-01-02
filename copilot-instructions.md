# Copilot instructions

Context to provide:
- This repo has three main areas: `musicxml-singer-with-oddvoices` (active React/TS web app), `musicxml_python_helpers` (MusicXML parsing utilities), and `synthesize_with_sinsy` (Sinsy build scripts).
- The web app uses Oddvoices WASM; `npm run build-oddvoices` needs emcc/cmake and submodules initialized.

How to work:
- Start changes inside `musicxml-singer-with-oddvoices`; use `npm run dev:skip-oddvoices` for UI-only edits to avoid rebuilding WASM.
- Use `scripts/ai-dev-checks.sh` for quick validation. By default it runs lint + vitest; set `RUN_ALL_TESTS=1` to include all tests (see `BRANCH_TODOS.md` for current failures).
- If touching Oddvoices sources, run `git submodule update --init --recursive` first, then `npm run build-oddvoices`.
- Keep changes small and scoped; avoid committing build artifacts (`dist`, `voices`, `test_outputs/`).

Style/testing:
- TypeScript/React components follow MUI style; prefer existing patterns and hooks.
- Tests use Vitest and Testing Library; place new conversion fixtures under `src/oddVoiceJSON/tests`.
