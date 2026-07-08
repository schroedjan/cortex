---
name: meeting-minutes
description: Turn raw meeting notes, a transcript, or a recording summary into structured minutes — attendees, decisions, action items, open questions.
trigger: User asks for meeting minutes, to summarize a meeting, or to write up notes from a call/transcript.
execution: subagent
---

# Meeting Minutes

Produce clean, structured minutes from raw meeting input.

## Execution

Run in an isolated subagent (see **Skills → Execution mode** in the root
`AGENTS.md`). The raw transcript/notes and all extraction happen inside the
subagent; return **only** the final minutes markdown. Do not pass the raw input
back into the main context.

## Constraints

- **Read-only.** This skill never writes to `memory/`, `context/`,
  `shared-memory/`, or `original-files/`, and never updates any index. Its sole
  purpose is to summarize and compact. Persisting, ingesting, or saving anything
  is the user's decision, made separately after the minutes are returned.
- Return the minutes as text only. Do not create or edit files.

## Steps

1. Identify the input: pasted notes, a transcript, or a file (read it, do not
   move or copy it).
2. Extract, in this order:
   - **Meta** — title, date (ISO `YYYY-MM-DD`), attendees.
   - **Decisions** — what was decided, one line each.
   - **Action items** — owner, task, due date. Flag any without an owner.
   - **Open questions** — unresolved items needing follow-up.
   - **Notes** — other relevant discussion, terse.
3. Output using the format below and stop. Do not persist or suggest saving —
   what happens with the minutes is the user's decision.

## Output format

```markdown
# <Meeting title> — <YYYY-MM-DD>

**Attendees:** <names>

## Decisions
- <decision>

## Action items
- [ ] <owner> — <task> (due <YYYY-MM-DD>)

## Open questions
- <question>

## Notes
- <note>
```

## Notes

- Never invent attendees, decisions, or dates. If something is unclear, list it
  under Open questions rather than guessing.
- Keep every line terse.
