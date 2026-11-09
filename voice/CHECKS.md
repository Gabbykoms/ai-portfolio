# Week 7 checks

## Transcript checker

Tests were written before `voice/check.py`. Initial run of `python3 -m unittest discover -s voice/tests -v` failed with `ModuleNotFoundError: No module named 'voice.check'`.

After implementation, the same command passed all 8 tests: perfect/case/spacing, one substitution in thirteen, insertions/deletions, empty output, missing name within WER tolerance, numeric words versus digits, required phrase boundaries, and WER greater than one. No API key or paid call was used. `git diff --check` passed.

## Remaining evidence

- Ruff lint run: pending.
- Profile and grounding tests: pending.
- Transcription comparisons and audio-duration/cost/latency records: pending real clips and adapter implementation.
- Two speech comparisons and Gabriel's listening observations: pending.
- Browser checks: pending server and UI implementation.
- One turn (transcription, answer, speech, total cost): pending real microphone run.
- Intent/spec/plan document approval: not yet recorded; authorization to begin implementation was given in chat.

## Portfolio foundation — November 9

- Added curated profile and JSON Schema, with cross-reference validation. BantamGo metrics are explicitly owner-reported; deployment discrepancies remain visible.
- Chat tests were created before `lib/chat.ts`; the initial run failed because that module was absent. After implementation, `npm test` passes 8 tests covering profile integrity, trusted/untrusted message boundaries, configuration, provider failures, missing cost, empty responses, request limits, and origins.
- `npm run typecheck` and `npm run build` pass. All 8 Python checker tests still pass. `git diff --check` passes.
- Production server HTTP smoke check: homepage 200 with both projects; unconfigured `/api/chat` returns 503 with a readable message.
- No live model calls or paid evaluations were made. Prompt-boundary tests do not prove real-model grounding. Visual browser QA and microphone checks have not been performed.
- `eval/questions.json` contains 12 unrun evaluation cases. `README.md` documents local startup and the development-only per-process limiter.

## Voice implementation — November 9

- Audio-adapter tests first failed with missing `voice.audio`; orchestration tests first failed with missing `lib/voice`. Both pass after implementation.
- 13 Python tests pass, including the real OpenRouter 1.3.144 SDK against an in-memory HTTP transport. Verified `input_audio.format` serialization, MP3 request shape, WAV completeness/duration, empty transcripts, non-audio responses and unknown costs. No network/model calls in these tests.
- 11 TypeScript tests pass, including the actual Node-to-Python validation subprocess, shared answer function wiring, empty-transcript short circuit and three-sentence plain speech formatting.
- TypeScript checking and production build pass. Ruff initially found import sorting, broad exception handling, nested context managers, and the course hook's repeated startswith calls. Imports/context handling were corrected; broad catches at provider boundaries are explicitly justified; hook condition was simplified without changing its behavior. `ruff check .` now passes.
- Browser recordings are converted locally to PCM WAV; the server validates frame length and <=30-second duration before billed calls. Speech bill may not be available immediately; unknown cost remains null and generation ID is retained. No speech estimate or total is fabricated.
- Actual model availability, prices, personal WAV recordings, human-written expected.json, billed comparisons, listening notes, and a real microphone turn remain pending. Automated fake-microphone tests do not count as Gabriel's recordings.

### Browser checks

`npm run test:browser` uses an isolated production server on port 3107, preserving Gabriel's existing development server. Initial automation needed a hydration wait and an error locator scoped away from Next.js's route announcer. Final Chromium run passes both tests: audio-file conversion/upload with visible transcript and answer plus audio ready for playback; synthetic microphone recording/stopping/upload and readable provider-error display. Requests are intercepted; no paid calls occur. These are integration checks, not real provider or human listening evidence.
