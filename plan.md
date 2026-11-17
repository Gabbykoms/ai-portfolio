# Portfolio implementation plan

## Week 8

Status: implementation authorized in chat; detailed plan review pending.
Approved by: not yet recorded.

### Order of work

1. Tests first for tools/recent-commits.ts: schema validation, repository policy,
   normalized successful results, HTTP/network/response errors. Run red, then green.
2. Tests first for tools/loop.ts and tools/check.ts: scripted single call, bad
   arguments, unknown tool, endless caller, held side effect, unsupported claim.
   Keep registration/dispatch separate from model transport. Test parallel calls,
   malformed JSON, missing costs and the maximum tool calls per reply too.
3. Integrate through lib/chat.ts and lib/voice.ts. Preserve existing error handling,
   add a total deadline, return traces from both routes, and prevent flagged prose
   from being spoken. Run existing tests, type checking, and production build.
4. Add tools/eval.ts and tools/CHECKS.md. Verify model support and prices before paid
   execution. Questions cover recent commits, a nonexistent owner repository, a
   profile-only answer, an invitation to invent yesterday's work, and two repo calls.
5. Record findings and remaining human review; submission tagging/publishing follows
   completion of the evidence, not just passing mocked tests.

### Risks and concrete decisions

- Wrong argument name: return `{error:{code:"invalid_arguments",message:...}}` as
  JSON in a tool message with the original ID. Assert no handler ran and that the
  scripted model receives the error and can correct its next request.
- Repeated requests: stop after four model calls and return the program's cap
  sentence. Bound calls within a reply so a step cap also bounds GitHub traffic.
- Invented commits after a 404: tools/check.ts must reject commit identifiers absent
  from successful results. An invented prose description with no identifier may
  evade this check; document that limit rather than claiming semantic verification.
- Recent results cover a sample on the default branch. Do not infer total history,
  lack of work yesterday, personal authorship, or deployed behavior from that sample.
- Use public requests without a token to avoid accidentally retrieving private data.
  Rate limits are recoverable tool errors. Unknown cost is never silently zero.

### Proof

No-key tests ($0): mocked GitHub proves validation and error boundaries; scripted
model tests prove the six required misuse behaviors, matching call IDs, caps,
pending effects and claim flags. Integration tests prove both routes share the loop
and preserve trace/cost. These tests do not establish real model grounding.

Billed eval: five questions times two verified models, up to four model calls per
question. Record tools, steps, code checks, latency and actual usage cost; aggregate
cost per question with and without tools and maximum steps. Monetary estimate is
pending catalog verification; the lab's estimate is not a measured project cost.
Run ruff for Python and TypeScript type checking for new tools, recording findings.

Status: working plan; Gabriel authorized planning and starting implementation in chat. Detailed plan approval has not been recorded.

## Foundation: Gabriel's actual portfolio

1. Capture a curated profile in `data/profile.json` from the existing intent, repository evidence, and Gabriel's statements. Attribute BantamGo metrics to Gabriel; preserve deployment discrepancies as evidence notes. Do not invent contact details or benchmark results.
2. Build the TypeScript/Next.js portfolio already selected in `spec.md`: project cards, evidence links, and a keyboard-accessible typed chatbot. Keep résumé/contact links absent until supplied.
3. Implement one server-side answer function using the curated profile and grounding rules. Test unsupported credentials, exaggerated project ownership, missing information, and prompt injection. Use that same function for voice answers.

## Week 7

### Order of work

1. Write `intent/voice.md` and the Week 7 specification. Implement and verify the transcript checker in `voice/check.py` with tests written first in `voice/tests/`.
2. Finish the profile and typed chatbot foundation above. Record profile approval separately from implementation authorization.
3. Implement Python transcription and speech adapters with the OpenRouter SDK under `voice/`. Keep Next.js as the public web server; invoke the Python adapters server-side with bounded inputs and timeouts. Avoid a second public service.
4. Add `POST /api/voice`: validate recording, transcribe, call the shared answer function, synthesize, and return transcript, answer, base64 audio, and separate costs. Reject unknown formats (415), oversized recordings (413), empty transcripts, and non-audio speech responses. Limit recordings to 30 seconds and 10 MB; enforce duration on the server, not just in the browser.
5. Add microphone recording, an audio file fallback, visible transcript, playback controls, and useful error states. If a name looks uncertain, ask the visitor to clarify before answering. Never claim a live transcript passed word-error checks without a human reference.
6. Gabriel records two WAV clips and writes their expected text before transcription. Run each of those and the three course fixtures once per transcription model. Generate the same grounded answer once per speech configuration.
7. Record results and listening observations in `voice/CHECKS.md`; run browser checks and a real microphone turn. Finish hosting decision with measured per-turn cost, then commit/tag/push `week07-submitted` when submission evidence is complete.

### Risks and decisions

- Incorrect names: fixture tests require Gabriel Koomson and CPSC 415 to survive independently of overall WER. Live audio lacks a reference; display the transcript and request clarification when needed.
- Long recordings: enforce duration/size limits, request timeouts, rate limits, and bounded answer length. A minute-long recording is rejected before billed processing.
- Unsupported audio: allowlist formats and report a readable error; do not silently retry paid calls.
- Provider/model availability: verify course model IDs, SDK contracts, and prices before installing adapters or making paid calls.
- Evidence: owner-reported metrics are attributed; repository documentation and actual operational usage may differ.

### Proof

**No-key checks ($0):** transcript edit distance, insertions/deletions/substitutions, required phrases, empty output, case/spacing normalization, and numeric words versus digits. Then mocked adapter errors, grounding request construction, payload limits, server-only keys, and browser recording/file-upload behavior. No model calls in unit-test loops.

**Billed evaluation:** five clips × two transcription models = ten transcription calls; one answer × two speech configurations = two speech calls; plus one real end-to-end turn including the answer-model call. Record audio duration, tokens/characters, latency, bytes, provider usage, and estimated versus actual cost. The lab estimates about $0.002 for own-clip transcription, $0.01 for speech comparisons, and $0.02 for loop work; these are course estimates, not verified current prices or a spending cap. Calculate an estimate from the current catalog before running.

### Completion evidence

Approved intent/spec/plan; curated profile; passing no-key checks; lint results; real recordings and human-authored references; two-model comparison; listening notes; browser assertions; measured turn costs; server-side key handling; submission tag. Human recordings and listening observations cannot be supplied by the agent.

## Progress

- Transcript checker: implemented; 8 no-key tests pass.
- Curated profile, JSON Schema and cross-reference validation: implemented; profile review remains separate.
- Next.js portfolio, typed chat route and shared provider answer function: implemented. Eight TypeScript tests, type checking, production build and local HTTP smoke checks pass.
- Live model evaluation, visual browser QA, voice adapters and recorder: next. API configuration is intentionally empty; no paid calls made.

### Voice implementation progress

Implemented SDK adapters, evaluation CLIs, Node/Python bridge, `/api/voice`, WAV validation, local recorder conversion, upload fallback, playback, transcript display and separate costs. No-key SDK and bridge tests pass, as do type checking and build. Live provider evaluation and human artifacts remain outstanding. Speech costs remain unknown until the generation record exists; a verified catalog-based estimate is still needed for the billed evaluation budget.

### Week 8 implementation progress

- Step 1: public GitHub adapter and six mocked adapter tests implemented.
- Step 2: `tools/loop.ts`, `tools/check.ts`, and 13 scripted-model/checker tests
  implemented. All 32 project tests and TypeScript checking pass. Red/green output
  is recorded in the session and tools/CHECKS.md; no staged approval or commit
  history is implied.
- Step 3: shared chat and voice integration implemented, with mocked integration
  tests proving tool-result delivery, accumulated costs, trace forwarding and safe
  speech on unsupported claims. All 34 tests, type checking and production build pass.
- Next: verify models and run the separately billed evaluation. Document review
  remains pending.

- Step 4: approved ten-question billed evaluation completed; original checks 8/10.
  Reviewed failures, truncated passing answer, and reconciled measured costs in
  tools/CHECKS.md and the saved audit. No deployment model change. Remaining work:
  address output-budget/format limitations, human document review, and submission
  commits/tag/push. Original results retained rather than silently rerun.
