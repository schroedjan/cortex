# Cortex — Agent Router

Multi-agent personal assistant. This root file is the **router**: it selects the
agent and defines shared memory/skill rules. Detailed file formats live in
`templates/` and are read at write-time, not here.

## How routing works

Agents live in `agents/<name>/` with behavior in `agents/<name>/AGENTS.md`. Most
harnesses only auto-load the root file, so at session start:

1. Pick the target agent (see **Agent selection**).
2. Read `agents/<name>/AGENTS.md` and adopt it as your primary instructions,
   layered on this router.
3. Load memory eagerly, leave context lazy (see **Memory model**).
4. Announce the active agent in one line, then proceed.

## Agent selection

**Default: `cortex`** when no agent is named and nothing matches a specialist.

| Agent        | Use when                                                          |
| ------------ | ---------------------------------------------------------------- |
| `cortex`     | Default. General assistance, coordination, anything unspecified. |
| `visualizer` | Diagrams, charts, visual/architectural output.                   |

Cross-domain requests: stay `cortex`, delegate the sub-task to the specialist's
instructions, return. Discover other agents by reading their `AGENTS.md` first line.

## Memory model

Two tiers, loaded differently to keep the session lean.

**Memory — eager.** `agents/<name>/memory/` (agent-scoped) + `shared-memory/`
(all agents). On session start read each tier's `INDEX.md`, then the file bodies
(all while small; once a tier grows, load only what the request needs plus any
`always-load` entries). Keep memory tiny: one topic per file, terse bullets,
prune don't append. If an entry grows, move detail to a `context/` file and leave
a one-line `[[backlink]]`.

**Context — lazy.** `agents/<name>/context/`. Never read on session start. When a
request needs background: read `context/INDEX.md` only, pick matching entries,
read those in full, follow their `[[backlinks]]`.

**Original files — immutable.** `original-files/` holds ingested sources; never
edit, delete, or read on session start. Log each ingestion in
`original-files-index.md`.

## Index files

Every memory and context directory has an `INDEX.md`: a table
`File | Title | Tags | Summary`, one row per file. It is the eager overview
(memory) and the lazy lookup (context). Keep it in sync — add/update/remove the
row in the same action as any file create/rename/delete/scope-change. On
conflict, the files win; rebuild rows from front-matter. Mark rare must-always-
load memory with an `always-load` tag.

## File format

Memory/context files: markdown + front-matter (`title`, `created`, `updated`,
`tags`, optional `sources`). Timestamps are ISO `YYYY-MM-DD HH:mm` using the
current environment date/time. File names are kebab-case slugs. Start from
`templates/memory.md` or `templates/context.md`. Link related files with
`[[slug]]`, resolved by matching the slug in the memory/context directories.

## Skills

Agent-scoped procedures in `agents/<name>/skills/<skill>/SKILL.md`
(front-matter: `name`, `description`, `trigger`, optional `execution`). Each
agent's `AGENTS.md` lists its skills; read that list on session start, read the
full `SKILL.md` only when a trigger matches.

**Execution.** If a skill sets `execution: subagent`, run it in an isolated
subagent: hand it the `SKILL.md` path + raw input, take back only its final
artifact (bulky intermediates stay in the subagent). Respect a skill's read-only
declaration. No subagent capability → run inline. Unset/`inline` → run inline.

## Paths

All paths are relative to the repository root, regardless of working directory.
