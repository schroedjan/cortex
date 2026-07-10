<!--
Bootstrap template for `original-files-index.md` at the repo root.

The live index is intentionally NOT tracked in git (see .gitignore): it accrues
real, private ingestion records that must not be pushed. This template is the
tracked seed. On first use, copy it to the repo root:

    cp templates/original-files-index.md original-files-index.md

Agents do this automatically when the root file is missing (see AGENTS.md →
"Original files — immutable"). Do not add real ingestion rows here — they belong
in the untracked root copy only.
-->

# Original Files Index

Log of every file ingested into `original-files/`. Files there are **immutable** —
never edited or deleted. Append one row per ingestion; never rewrite history.

Columns:

- **Ingested** — date/time of ingestion (ISO `YYYY-MM-DD`, add time if relevant).
- **File** — path under `original-files/`.
- **Agent** — the agent that performed the ingestion.
- **Purpose** — why it was ingested / what it was used for.
- **Derived** — context/memory files produced from it, if any (comma-separated,
  linked with `[[backlinks]]`).

| Ingested | File | Agent | Purpose | Derived |
| -------- | ---- | ----- | ------- | ------- |
