# Cortex - My Personal Assistant

This is my personal, AI-assisted assistant setup. It holds multiple agents, plus
shared memory and scoped context for different use-cases.

## Entry point & routing

The repository root `AGENTS.md` is the **router**: it selects which agent handles
a request (default: `cortex`), then loads that agent's instructions and memory.

Harness binding:

- **Cross-harness** — tools that read `AGENTS.md` (Codex, Cursor, Gemini CLI,
  etc.) use it directly. `AGENTS.md` is the source of truth everywhere.
- **Claude Code** — reads `CLAUDE.md` only, so each directory with an `AGENTS.md`
  also has a `CLAUDE.md` containing a single `@AGENTS.md` import that pulls it
  in. Never edit the `CLAUDE.md` pointers; edit `AGENTS.md`.

## Structure

### Agents

The [agents](./agents/) directory holds multiple agents, each with different
strengths and instructions. The main agent is `cortex` — the goto when nothing
else is specified.

Each agent lives in `agents/<name>/`:

- `AGENTS.md` — the agent's main instructions (identity, behavior, guidelines,
  restrictions). Treated as `CLAUDE.md`/`AGENTS.md` by the harness. Formerly
  `SOUL.md`.
- `CLAUDE.md` — `@AGENTS.md` pointer for Claude Code (see above).
- `memory/` — agent-scoped long-term memory. Read eagerly on session start.
- `context/` — agent-scoped, topic-specific knowledge. Read lazily, only when a
  request needs it.
- `skills/` — agent-scoped skills (see the agent instructions for discovery).

### Memory model

Two tiers, loaded differently to keep session-start context lean. The
authoritative rules live in the root `AGENTS.md`; summary:

- **Memory** (`agents/<name>/memory/`, `shared-memory/`) — read eagerly every
  session. Kept concise: one fact/topic per file, terse bullets, minimal
  front-matter, pruned not appended.
- **Context** (`agents/<name>/context/`) — read lazily. The agent consults the
  directory's `INDEX.md` to decide which files a request needs, then reads only
  those and follows their `[[backlinks]]`.
- **Shared memory** (`shared-memory/`) — memory readable by every agent, for
  knowledge that should outlive a single agent's scope.

Every memory and context directory has an `INDEX.md` — a small lookup table
(File | Title | Tags | Summary) kept in sync with its files. Full format and
maintenance rules are in the root `AGENTS.md`.

### Original files

The [original-files](./original-files/) directory holds all ingested source
files used by any agent. These are **immutable** — never edited or deleted.
Every ingestion is logged in
[original-files-index.md](./original-files-index.md) with date/time, ingesting
agent, and purpose.

## File format

Memory and context files use markdown with front-matter:

- `title` — title of the file
- `created` — creation date/time (ISO `YYYY-MM-DD`)
- `updated` — last-updated date/time (ISO `YYYY-MM-DD`)
- `tags` — list of tags related to the content
- `sources` — optional list of source files the content was ingested/synthesized
  from

Templates live in [`templates/`](./templates/). File names are kebab-case slugs
(`meeting-cadence.md`, not `Meeting Cadence.md`). Relate entries with
`[[backlinks]]` to other files' slugs.
