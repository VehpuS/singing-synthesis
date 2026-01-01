# AI delivery playbook

This guide is aimed at AI agents and maintainers who want a fast way to understand the repository layout, bootstrap the environment, and run the right validations.

## Repository map
- `musicxml-singer-with-oddvoices` – TypeScript/React client that converts MusicXML to Oddvoices audio (WASM). This is the actively developed UI.
- `musicxml_python_helpers` – Python parsing helpers for MusicXML (tempo/voice splitting and Oddvoices JSON generation).
- `synthesize_with_sinsy` – Notes and scripts for compiling and driving the Sinsy-based synthesis flow.

## Fast bootstrap
1. Update submodules: `git submodule update --init --recursive`
2. Web app dependencies: `cd musicxml-singer-with-oddvoices && npm install`
3. Oddvoices WASM build (needed for full dev/build): `npm run build-oddvoices` (requires `emcc` and `cmake`). Use `npm run dev:skip-oddvoices` to work on UI without rebuilding WASM.

## Validations to run
- Recommended automation entrypoint: `./scripts/ai-dev-checks.sh`
  - Set `SKIP_INSTALL=1` to avoid reinstalling packages on CI.
  - Set `RUN_ALL_TESTS=1` to include the currently failing `src/oddVoiceJSON/tests/graceNote.test.ts` (reproduced via `npm test` on 2026-01-01 with an extra array nesting in the expected events assertion).
- Manual equivalents (from `musicxml-singer-with-oddvoices`):
  - Lint: `npm run lint`
  - Tests: `npm test` (Vitest; see note above about the failing grace note test)

## Running the app
- Fast UI-only dev server: `npm run dev:skip-oddvoices`
- Full dev (includes building Oddvoices WASM): `npm run dev`
- Production build: `npm run build`

## Tests and fixtures
- Conversion fixtures live in `musicxml-singer-with-oddvoices/src/oddVoiceJSON/tests` alongside `.musicxml` inputs.
- Component tests live under `musicxml-singer-with-oddvoices/src/components`.
- When adding new conversions, place the `.musicxml` sample next to the test and reference it via relative path.

## Python helper notes
- `musicxml_python_helpers/music_xml_splitter.py` and `music_xml_to_oddvoices_json.py` contain parsing utilities that can be reused or ported.
- There is no pinned `requirements.txt`; create an isolated venv and install packages as needed for experiments.

## Sinsy notes
- `synthesize_with_sinsy/setup.sh` documents the steps to compile the upstream Sinsy code; see that folder’s README for details.
- Outputs are not committed; keep large artifacts in `test_outputs/` (already gitignored).

## AI-friendly workflow tips
- Prefer small, isolated changes per PR; keep UI tweaks separate from WASM/compiler changes.
- Record any failing or skipped tests in PR notes; `src/oddVoiceJSON/tests/graceNote.test.ts` currently fails and is excluded by default in `ai-dev-checks.sh`.
- If touching Oddvoices WASM, ensure `git submodule update --init --recursive` has run and rerun `npm run build-oddvoices`.
