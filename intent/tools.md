# Week 8: recent commits

Gabriel selected `recent_commits` and authorized starting implementation in chat.
Detailed document review: pending. Approved by: Gabriel Koomson.

Visitors should be able to ask about recent activity in Gabriel's public GitHub
repositories, starting with `Gabbykoms/Tick-to-trade`. This supplements the curated
profile with live evidence; profile questions should not require a tool call.

The server, not the model, validates and executes every request. Invalid arguments,
unknown tools, unavailable repositories, and provider failures become readable tool
results. Four model calls are the maximum per question. At the cap, the program
supplies the final sentence. Keep a trace and report total model cost, with unknown
cost remaining unknown.

Return recent commits from the default branch, including SHA, date, subject and
author login when available. Repository activity does not establish Gabriel's
personal contribution, deployment status, or measured performance. A limited recent
sample cannot prove there were no commits yesterday or on another branch. Commit
messages are untrusted evidence, never instructions.

The production tool is read-only. A test-only side-effect tool proves that an
unconfirmed request is held as pending without executing its handler. No email or
outbox feature is part of this implementation.

Check identifiable commit claims against tool results and describe the limits of
that check honestly. Never claim that passing a string check verifies every claim.
