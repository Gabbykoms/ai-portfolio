# Gabriel Koomson's portfolio

Next.js/TypeScript portfolio with a server-side, profile-grounded typed chatbot. Week 7's voice checker is implemented; audio adapters and microphone integration are the next stage.

## Run locally

```sh
npm ci
cp .env.example .env.local
# Set OPENROUTER_API_KEY and a verified CHAT_MODEL in .env.local.
npm run dev
```

Open http://127.0.0.1:3000. The project pages work without credentials; chat returns an unavailable message until configured. Never put a key in a NEXT_PUBLIC variable. Chat uses OpenRouter's chat-completions endpoint, incurs provider charges when configured, and makes no automatic retries.

## Checks

```sh
npm test
npm run typecheck
npm run build
python3 -m unittest discover -s voice/tests -v
```

`data/profile.json` contains the source profile; `data/profile.schema.json` defines its structure. `lib/profile.ts` also checks cross-references. Owner-reported résumé metrics are attributed, and unresolved deployment discrepancies are recorded. Contact and résumé URLs remain unset.

`lib/chat.ts` is the shared answer function for typed chat and the future voice route. Its tests use mocked provider responses: they verify request boundaries and failure handling, not real model truthfulness. `eval/questions.json` is the unrun adversarial evaluation set. Model comparison and profile review remain outstanding.

The limiter is per process (20 requests/minute), suitable for local development; shared production limiting and hosting review are required before deployment. The app does not persist questions, but they are sent with the profile to the configured provider. Voice, billed evaluations, human listening checks, and the submission tag are not complete.

API contract reference: https://openrouter.ai/docs/api/reference/overview
Framework setup: https://nextjs.org/docs/app/getting-started/installation

## Voice setup

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
npm run dev
```

The server needs both Node and Python; this implementation is not compatible with edge-only hosting. Record a short question, stop, then choose **Send recording**. The browser converts audio to PCM WAV; the server validates the actual duration before transcription. File upload is also available. Audio decoding support depends on your browser. Direct server uploads must be WAV, at most 30 seconds and 10 MB.

Voice costs are shown separately. When the speech generation bill is not yet available, its cost and the total remain unknown. Generation IDs are retained in the response/CLI sidecar for later lookup. No estimate is invented.

From the repository root, with OPENROUTER_API_KEY in your terminal environment:

```sh
.venv/bin/python -m voice.transcribe --set voice/clips/expected.json --out voice/transcripts-whisper.json
.venv/bin/python -m voice.transcribe --set voice/clips/expected.json --model elevenlabs/scribe-v2 --out voice/transcripts-scribe.json
.venv/bin/python -m voice.speak 'Your grounded answer here.' --out voice/answer-default.mp3
.venv/bin/python -m voice.speak 'Your grounded answer here.' --model elevenlabs/eleven-v4-turbo --voice george --out voice/answer-comparison.mp3
```

These commands are billed. Check current model availability and prices before running. CLI scripts do not read `.env.local` automatically. Write your own `voice/clips/expected.json` before any transcription: a JSON array of objects with `file`, `text`, and `must_contain`. Record two 5–10 second WAV clips in your own voice, one supported question and one the profile cannot answer. Do not use generated recordings as your personal recordings. Save listening observations yourself in CHECKS.md. Existing evaluation outputs are never overwritten by the CLI.

The live transcript has no human reference: no WER or guaranteed name correctness is claimed. Review it and re-record or ask by text if it is wrong. Local voice limits are ten requests per minute and two concurrent turns per process; shared production limits remain a hosting task.

Run `.venv/bin/python -m unittest discover -s voice/tests -v` for Python tests (the SDK contract test requires the virtual environment). Run `.venv/bin/ruff check .` for linting. Browser checks use `npm run build && npm run test:browser`, launch an isolated production server on port 3107, and mock provider responses. Chromium uses a synthetic microphone; these tests do not replace personal recordings or billed evaluation.
