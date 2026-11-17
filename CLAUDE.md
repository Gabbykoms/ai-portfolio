# Working rules

- Week 8: chatbot tools live in tools/. Use intent, spec, plan, and tests; Gabriel selected recent_commits and authorized implementation.
- Validate every tool request in code; return tool errors as results. Bound the loop to four model calls. Side effects require human confirmation and must otherwise remain pending.
- Tool tests use scripted models and mocked GitHub responses without keys. Keep billed evaluation separate; skip it when OPENROUTER_API_KEY is unset.

- Build Gabriel's actual portfolio using the existing intent and specification.
- Week 7: the spoken interface lives in voice/. Stages assigned: intent, spec, plan, tests. Commit to main.
- Transcription and speech calls are billed. One transcription per clip per evaluation model, one speech call per answer/configuration, never a model call inside a loop of tests.
- Fixture clips are WAV; expected.json is written by Gabriel before the model hears it. Do not fabricate recordings, approvals, listening notes, or measured results.
- The spoken answer follows the same refuse-to-fabricate rule as typed answers.
- Attribute owner-reported résumé metrics. Preserve the distinction between personal contributions and team accomplishments.
- Name dependencies and their purpose in spec.md before installing them.
- Keep keys server-side and out of tracked files and logs.
