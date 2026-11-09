# Week 7 checks

## Transcript checker

Tests were written before `voice/check.py`. Initial run of `python3 -m unittest discover -s voice/tests -v` failed with `ModuleNotFoundError: No module named 'voice.check'`.

After implementation, the same command passed all 8 tests: perfect/case/spacing, one substitution in thirteen, insertions/deletions, empty output, missing name within WER tolerance, numeric words versus digits, required phrase boundaries, and WER greater than one. No API key or paid call was used. `git diff --check` passed.

## Remaining submission evidence

- Two-model transcription comparison on the two personal clips and three course fixtures, including per-call cost and latency.
- Reference text saved in `voice/clips/expected.json` from Gabriel’s supplied questions after initial transcription. The lab’s before-transcription requirement was not met for these clips.
- Two saved spoken answers, measurements, and Gabriel's listening observations.
- One real turn is saved in `voice/clips/voice-03.json`; actual speech cost remains unavailable; a sourced speech estimate and estimated full turn total are recorded.
- Explicit document approvals and their actual dates; do not backdate plan approval or test commits.
- Automated lint, profile/API tests and mocked browser checks have passed as recorded below.

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

## Local origin fix

Reproduced a 403 for a request with Origin http://127.0.0.1:3000: Next's internal request URL used a different authority. Both chat routes now validate the browser origin against the incoming Host and request protocol. Foreign origins and different ports remain rejected. Two regression tests failed before the fix and now pass; all 13 TypeScript tests and type checking pass. The same live HTTP probe now returns the expected 415 for its deliberately unsupported text/plain payload, proving it passed the origin gate without a paid call.

## User-reported live voice observations

Source: Gabriel pasted the spoken questions, displayed transcripts and answers into this conversation. These are observations from prior live turns, not a saved two-model evaluation. Model identifiers, call latency, costs, and generation IDs were not provided. Reference checks below were computed afterward; they do not establish that expected text was saved before the model heard the clips.

### First question — target roles

- Spoken question: “What jobs are Gabriel Koomson looking for right now?”
- Displayed transcript: “What jobs are Gabriel Kumsin looking for right now?”
- Displayed answer: “Gabriel Koomson is targeting full-time software engineer roles. His profile also suggests interests in low-level systems, performance optimization, and AI, but those are interests rather than stated job titles or guaranteed specializations.”
- Code-computed WER: **1/9 = 0.111111 (11.1%)**. This corrects the earlier conversational calculation of 1/11.
- Required phrase checked afterward: `Gabriel Koomson`; missing. **Transcript fails**, despite being below the 0.15 WER threshold.
- Answer assessment: correctly states the target role and distinguishes interests from guaranteed specializations. A grounded answer does not cancel the transcription failure.

### Second question — unsupported employer

- Spoken question: “What was Gabriel's role at Google?”
- Displayed transcript: “What was Gabriel's role at Google?”
- Displayed answer: “Unknown from the provided profile; it does not list any role at Google. If you meant a project or employer from Gabriel’s portfolio, share the specific source and I can help interpret it.”
- Code-computed WER: **0.0**. Required terms checked afterward: `Gabriel's`, `Google`; neither missing.
- Answer assessment: correctly acknowledges missing information instead of inventing employment at Google.

### Saved audio inventory

Found `voice/clip-01.wav` (5.700 seconds) and `voice/clip-02.wav` (7.500 seconds); both pass local PCM WAV validation. Moved them into the lab's `voice/clips/` directory. Using the supplied first/second question order for clip-01/clip-02. Gabriel confirmed that reference text was not written before initial transcription and requested reuse of these recordings. No new provider calls were made to document these observations.

### Reference provenance

At Gabriel’s explicit request, saved his supplied question text verbatim in `voice/clips/expected.json` for subsequent comparisons. This is a retrospective reference, not evidence of a reference written before the original model call. The first reference retains the correct surname Koomson, not the model’s Kumsin. No original results were changed and no model calls were made in this step.

## Personal clips: two-model transcription comparison

Source: saved `transcripts-whisper.json` and `transcripts-scribe.json`; calls run by Gabriel. References were documented retrospectively, as noted above. Costs are USD from provider usage.

| Model | Clip | Audio seconds | WER | Missing required phrase | Result | Cost (USD) | Call seconds |
|---|---|---:|---:|---|---|---:|---:|
| Whisper | clip-01.wav | 5.700 | 0.111111 | Gabriel Koomson | Fail | 0.000018981 | 2.745 |
| Whisper | clip-02.wav | 7.500 | 0.000000 | None | Pass | 0.000024975 | 1.862 |
| Scribe v2 | clip-01.wav | 5.700 | 0.111111 | Gabriel Koomson | Fail | 0.000348333 | 1.284 |
| Scribe v2 | clip-02.wav | 7.500 | 0.000000 | None | Pass | 0.000458333 | 1.599 |

Total for these four calls: **$0.000850623**.

Neither model preserved Koomson: Whisper produced “Coombson”; Scribe produced “Clemson”. Both passed the Google question. Scribe was faster on these two calls, but cost more and did not improve measured accuracy. These two samples do not establish general model performance. Personal listening observations remain to be supplied by Gabriel.

Next: run the three course fixture clips through both models, then generate and compare the two spoken answers.

## Course fixtures: two-model transcription comparison

Source: saved course-transcripts-whisper.json and course-transcripts-scribe.json, evaluated against the course-provided references. Costs are provider-reported USD.

| Model | Clip | Audio seconds | WER | Missing phrase | Result | Cost (USD) | Call seconds |
|---|---|---:|---:|---|---|---:|---:|
| Whisper | clip-01.wav | 6.380 | 0.0000 | None | Pass | 0.000021245 | 1.348 |
| Whisper | clip-02.wav | 8.061 | 0.1875 | bootcamp | Fail | 0.000026843 | 2.922 |
| Whisper | clip-03.wav | 7.708 | 0.0000 | None | Pass | 0.000025668 | 1.022 |
| Scribe v2 | clip-01.wav | 6.380 | 0.0000 | None | Pass | 0.000389889 | 0.856 |
| Scribe v2 | clip-02.wav | 8.062 | 0.1250 | bootcamp | Fail | 0.000492678 | 0.661 |
| Scribe v2 | clip-03.wav | 7.708 | 0.0000 | None | Pass | 0.000471044 | 0.923 |

Total for six course-clip calls: **$0.001427367**.

Both models passed clips 01 and 03. On clip 02, both wrote “boot camp” rather than the reference “bootcamp”; the current checker treats these as different token sequences and flags the required term. Whisper additionally inserted “Music”, yielding WER 0.1875, above the 0.15 limit. Scribe scored 0.125, within the WER limit, but failed the required-term check. This spelling/word-boundary difference is distinct from the personal clips’ incorrect surname. Results are preserved as produced; no reference or checker was changed to obtain a pass. Scribe was faster on all three observed calls but more expensive.

## Spoken answer comparison

Both saved MP3s exist. Measurements below come from their JSON sidecars.

| Output | Model / voice | Characters | Bytes | Call seconds | Cost (USD) |
|---|---|---:|---:|---:|---|
| answer-default.mp3 | microsoft/mai-voice-2.1-flash / en-US-Harper:MAI-Voice-2.1-Flash | 240 | 323040 | 1.459 | 0.003600 |
| answer-comparison.mp3 | elevenlabs/eleven-v4-turbo / george | 240 | 265865 | 3.897 | 0.009600 |

### Gabriel's listening observations

Gabriel reports that both voices sounded normal and acceptable to him, with different pacing. The comparison voice sounded more British to him. Having studied British English in Ghana, he was comfortable with that accent. This is his listening impression, not an independently verified accent classification. He did not identify a preferred voice or report a specific pronunciation problem.

Gabriel confirmed that both voices pronounced “Gabriel Koomson” and “AI” acceptably. The supplied target-roles answer did not include the course number, so these recordings cannot demonstrate its pronunciation. No additional-language experiment was reported.

### Outstanding cost evidence

The initial synthesis responses did not include costs. Subsequent read-only OpenRouter generation lookups recovered actual costs: default $0.003600 and comparison $0.009600, total $0.013200. Both JSON sidecars now record these actual costs, their source, and the lookup timestamp. No speech was regenerated for this lookup.

## One turn

Source: Gabriel's downloaded browser result, `voice/clips/voice-03.json`, saved at 2026-11-09T20:46:54.081Z.

**Transcript (verbatim):**

```text
 What are Gabriel's  professional goals at the moment
```

**Spoken answer:** Gabriel’s current professional goal is to move into a full-time software engineer role. He is also focused on building systems, exploring performance, and applying AI to useful software, with a learning emphasis on C++ and trading systems through Tick-to-trade.

| Stage | Cost (USD) |
|---|---:|
| Transcription | 0.0000253746 |
| Answer | 0.00124125 |
| Speech | 0.003915 (estimated) |
| Total | 0.0051816246 (includes estimated speech) |

Known billed subtotal: **$0.0012666246**, excluding speech. Estimated speech: 261 characters × $15 / 1,000,000 = **$0.003915**. Estimated total: **$0.0051816246**. Pricing verified against [OpenRouter’s MAI-Voice-2.1-Flash listing](https://openrouter.ai/microsoft/mai-voice-2.1-flash). The JSON preserves null actual speech/total costs and stores this calculation separately under `cost_estimate`; this is not a recovered invoice.

Audio duration: 7.62 seconds. Transcription call: 2.063 seconds. Speech: 261 characters, 348000 bytes, 1.184 seconds. Models and voice are retained in the JSON. The answer model ID and answer latency were not exported, so they cannot be established from this artifact alone.

A follow-up billing lookup for the saved speech generation ID returned HTTP 404. The speech cost remains unknown, not zero; no synthesis was repeated. The displayed answer is consistent with the curated profile. This clip has no saved human reference for computing WER. Gabriel confirmed that this turn’s spoken answer played correctly and was understandable.
