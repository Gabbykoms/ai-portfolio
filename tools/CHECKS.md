# Week 8 checks

## Implementation evidence — November 16, 2026

Step 1: schema and public GitHub adapter.

- Red: `node --import tsx --test tools/tests/recent-commits.test.ts` exited 1
  before implementation: `Cannot find module '../recent-commits'`.
- Green: same command passed all six adapter tests after implementation.
- Regression: `npm test` passed all 19 tests, including the new adapter tests.
- Type checking: `npm run typecheck` passed.
- Python lint: `.venv/bin/ruff check .` reported `All checks passed!`.
  Ruff does not check the TypeScript tool code.
- All HTTP responses in this step were mocked. No live GitHub or model evaluation
  was performed; test cost was $0. Red/green output was shown in the session;
  this is not yet a red/green commit history.

## Misuse cases

Invalid argument shapes, extra properties, wrong types, count bounds and disallowed
repositories are covered by `invalid arguments and unrelated repos never reach the
network`. Provider error and malformed-evidence tests cover the adapter boundary.

Step 2 implements the six cases in `tools/tests/loop.test.ts`:

| Case | Test |
| --- | --- |
| Single-shot delivery | single call delivers evidence with matching ID and sums model cost |
| Bad arguments | bad arguments return an error to the model, which can correct its call |
| Unknown tool | unknown tool and malformed JSON produce errors without executing |
| Endless caller | endless caller stops after four model calls with the program answer |
| Side effect held | side effect is pending and its handler never executes |
| Unsupported claim | unsupported identifier is flagged and replaced with a safe answer |

Additional tests cover matching repository/commit URLs, multiple calls, four tool
executions per reply, unknown costs, handler/provider failures, malformed replies,
and deadlines for both a stalled model and a stalled tool. No real-model traces yet.

Step 2 validation:

- Red: loop tests exited 1 with `Cannot find module '../loop'` before implementation.
- Green: 13 loop/checker tests pass; `npm test` passes all 32 tests.
- `npm run typecheck` passes. An initial test-fixture typing error was corrected.
- No provider calls, no costs, no new dependencies. The red/green sequence is recorded
  in the session, not in separate commits.
- `runToolLoop` uses an injected model client, a four-model-call cap, four tool
  executions per reply, and a 30-second default deadline. Responses containing more
  than 32 tool requests are rejected as malformed before any tool runs.
- Side-effect handlers are always held by this dispatcher; a human confirmation
  execution flow is outside this step. Cancellation is passed to handlers; injected
  handlers must honor the signal to stop their own underlying work.
- Chat and voice integration was completed in step 3 below.

## What the check cannot catch

The identifier check can reject a fabricated commit SHA or URL. It cannot
prove a statement such as “this change doubled performance” merely because a valid
commit is cited. Inspecting the change and benchmark evidence, with human review,
would be needed. Standalone 7–40-character hex strings are conservatively treated as commit IDs,
which can produce false positives. The checker does not validate paraphrased
subjects, personal authorship, or relative-date claims.

## The cost of a tool

Billed evaluation is pending, so per-question cost with/without tools and maximum
observed model steps are not available. Do not substitute the course estimate for
measurements. Keep unknown model costs null.

## Step 3: typed and voice integration

- Added `tests/tools-integration.test.ts` before integration: both tests failed
  because the old single-call answer function did not advertise or process tools.
- `lib/chat.ts` now adapts OpenRouter responses to the shared loop, advertises the
  real recent-commits schema, preserves profile grounding, and treats retrieved
  commit text as untrusted evidence. Provider errors retain existing HTTP error
  behavior; cap and unsupported-claim outcomes return safe program answers.
- `/api/chat` already returns the full shared answer result, including new loop
  metadata. `lib/voice.ts` now forwards trace, steps, stop reason, pending requests,
  claim check and model, and synthesizes only the checked answer.
- Model and GitHub fetchers are independently injectable; GitHub requests never
  receive the model API credential. The overall deadline signal reaches both.
- Green: `npm test` passes 34 tests; `npm run typecheck` and `npm run build` pass.
  Build reported a nonblocking warning about ignoring an unrelated package-lock.json
  outside this repository. `git diff --check` passes.
- All integration provider responses were mocked, including speech. No paid calls
  or live GitHub requests were made. Live model evaluation remains outstanding.

## Step 4 preparation and execution status

- Added `tools/eval.ts`: five fixed questions, two explicit model arguments,
  runtime catalog verification of tool support, separate artifact directory per
  run, per-question code checks, answers/provider responses, traces, steps, costs
  and timings. Appends a ten-row table and the three aggregates after a full run.
- No-key invocation `node --import tsx tools/eval.ts` printed SKIP and exited 0.
- The public OpenRouter catalog advertised tool support for the lab pair and the
  configured app model. USD per million tokens (input/output): MiniMax M3 0.30/1.20;
  MiMo v2.6 Flash 0.14/0.28; GPT-5.4 mini 0.75/4.50. Verify again at execution.
  Source: https://openrouter.ai/api/v1/models
- The initial evaluation keeps production settings, including 350 max output
  tokens. Hidden reasoning may exhaust that allowance on the course models;
  failures must be recorded before tuning, rather than silently changing settings.
- The live execution request was rejected by automatic approval review because it
  required explicit authorization to export the portfolio profile/questions to
  OpenRouter and incur charges. No billed evaluation calls ran. Approval requested.
- The $1 estimate guard is not a provider billing cap; maximum calls are bounded
  to 40 and retries are disabled. Actual costs and results remain unavailable.

After approval, reproduce from the portfolio root:

```bash
node --env-file=.env.local --import tsx tools/eval.ts minimax/minimax-m3 xiaomi/mimo-v2.6-flash
```

This loads the existing server key without printing it. Successful provider
responses are saved for audit; authorization headers and raw HTTP error bodies
are not saved. An exception leaves cost unknown rather than assuming it was free.

## Billed evaluation: 2026-11-17T05:01:39.991Z

Artifacts: [evals/2026-11-17T05-01-39-991Z](./evals/2026-11-17T05-01-39-991Z/summary.json). Same production prompt and 350-token setting for both models; no automatic retries.

| Model | Question | Tools called | Steps | Verdict | USD | Seconds |
| --- | --- | --- | --- | --- | --- | --- |
| minimax/minimax-m3 | recent | none recorded | 2 | FAIL | unknown | 7.94 |
| minimax/minimax-m3 | missing | recent_commits | 2 | FAIL | 0.00072101 | 4.08 |
| minimax/minimax-m3 | profile | none recorded | 1 | PASS | 0.00045840 | 1.25 |
| minimax/minimax-m3 | invent | recent_commits | 2 | PASS | 0.00156636 | 2.50 |
| minimax/minimax-m3 | two | recent_commits, recent_commits | 2 | PASS | 0.00107544 | 4.96 |
| xiaomi/mimo-v2.6-flash | recent | recent_commits | 2 | PASS | 0.00067746 | 2.61 |
| xiaomi/mimo-v2.6-flash | missing | recent_commits | 2 | PASS | 0.00029344 | 1.54 |
| xiaomi/mimo-v2.6-flash | profile | none recorded | 1 | PASS | 0.00001260 | 4.33 |
| xiaomi/mimo-v2.6-flash | invent | recent_commits | 2 | PASS | 0.00046578 | 2.48 |
| xiaomi/mimo-v2.6-flash | two | recent_commits, recent_commits | 2 | PASS | 0.00045808 | 19.75 |

Mean USD/question with tools: 0.0007510794285714285. Without tools: 0.000235498. Maximum steps: 2.

Code checks are limited heuristics, not a semantic correctness guarantee. Failed rows and successful provider responses are retained in the artifacts.

## Review of the approved live run

Gabriel explicitly approved the profile/question transfer and billed evaluation.
The run completed ten questions on the lab model pair, with no retries.
Original automated scores: MiniMax M3 3/5; MiMo v2.6 Flash 5/5 (8/10 overall).
These scores do not establish complete correctness:

- MiniMax recent: tool call succeeded, but the final response spent all 350 output
  tokens on reasoning, had finish_reason=length, and contained no final answer.
  The app rejected it. Both calls reported usage. The first report lost its trace
  and marked cost unknown because the shared answer function threw; audit.json
  reconciles the known charge and tool request from saved provider responses.
  The tool-result payload for this failed question was not captured by the initial
  runner. Future runs now retain request messages too, without request headers.
- MiniMax missing: returned the legitimate `not_found` error and refused to invent
  repository activity. The original word checker expected `not found` with a space,
  so this was a lexical false negative. Original FAIL retained; no paid rerun.
- MiMo recent: passed identifier checks but used Markdown bullets and ended with a
  truncated sentence. The code checks missed these format/completeness failures.
- MiniMax comparison: says “about five and a half months” between May 8 and October
  23; the checker does not verify date arithmetic or other semantic claims.

The evidence supports increasing/testing output budgets before choosing a model;
it does not justify switching the deployment model yet. CHAT_MODEL is unchanged.
The six misuse tests remain scripted evidence; the live run encountered a genuine
not-found response and output exhaustion, but did not exercise all misuse cases.

### Reconciled costs (supersede the initial aggregate above)

Source: [audit.json](./evals/2026-11-17T05-01-39-991Z/audit.json).
Includes the billed MiniMax failure; unknown and zero are not interchangeable.

| Model | Question | Tools requested | Steps | Original verdict | USD | Seconds |
| --- | --- | --- | --- | --- | --- | --- |
| minimax/minimax-m3 | invent | recent_commits | 2 | PASS | 0.001566360 | 2.50 |
| minimax/minimax-m3 | missing | recent_commits | 2 | FAIL | 0.000721008 | 4.08 |
| minimax/minimax-m3 | profile | none | 1 | PASS | 0.000458400 | 1.25 |
| minimax/minimax-m3 | recent | recent_commits | 2 | FAIL | 0.002133930 | 7.94 |
| minimax/minimax-m3 | two | recent_commits, recent_commits | 2 | PASS | 0.001075440 | 4.96 |
| xiaomi/mimo-v2.6-flash | invent | recent_commits | 2 | PASS | 0.000465776 | 2.48 |
| xiaomi/mimo-v2.6-flash | missing | recent_commits | 2 | PASS | 0.000293436 | 1.54 |
| xiaomi/mimo-v2.6-flash | profile | none | 1 | PASS | 0.000012596 | 4.33 |
| xiaomi/mimo-v2.6-flash | recent | recent_commits | 2 | PASS | 0.000677460 | 2.61 |
| xiaomi/mimo-v2.6-flash | two | recent_commits, recent_commits | 2 | PASS | 0.000458076 | 19.75 |

Total: $0.007862482. Mean question with tools: $0.000923936. Mean without tools: $0.000235498. Maximum steps: 2.

These are observed provider usage charges, including caching/provider routing,
not estimates from headline prices. Tool questions averaged more than profile-only
questions in this small run; hosting per-turn cost must include all chat calls,
plus transcription/speech for voice. They are not matched causal benchmarks.
