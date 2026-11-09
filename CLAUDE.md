# Working rules

- Build Gabriel's actual portfolio using the existing intent and specification.
- Week 7: the spoken interface lives in voice/. Stages assigned: intent, spec, plan, tests. Commit to main.
- Transcription and speech calls are billed. One transcription per clip per evaluation model, one speech call per answer/configuration, never a model call inside a loop of tests.
- Fixture clips are WAV; expected.json is written by Gabriel before the model hears it. Do not fabricate recordings, approvals, listening notes, or measured results.
- The spoken answer follows the same refuse-to-fabricate rule as typed answers.
- Attribute owner-reported résumé metrics. Preserve the distinction between personal contributions and team accomplishments.
- Name dependencies and their purpose in spec.md before installing them.
- Keep keys server-side and out of tracked files and logs.
