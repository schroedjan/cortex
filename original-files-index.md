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
