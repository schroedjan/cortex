---
name: chart
description: Produce charts, graphs, plots, dashboards, or other data visualizations via the dataviz skill, run in an isolated subagent so the main conversation's context doesn't absorb the data wrangling and iteration.
trigger: User asks for a chart, graph, plot, dashboard, KPI tile, or other data visualization.
execution: subagent
---

# Chart

Delegate chart/data-visualization generation to a subagent that invokes the
`dataviz` skill. Keep data wrangling and iteration inside the subagent.

## Execution

Run in an isolated subagent (root `AGENTS.md` → **Skills** → **Execution**).
Hand it: this `SKILL.md` path, the raw request, the data (or a pointer to
where it lives), and instructions to read `agents/visualizer/AGENTS.md`'s
style guide for the color palette. Take back only the final artifact
path/content plus a one-line description — no data-cleaning steps, no
iteration chatter.

## Steps

1. If the request is ambiguous (which data, what the chart should answer,
   which chart type) ask the user before spawning the subagent — don't guess
   at data or metrics not confirmed or in memory/context.
2. Spawn the subagent with the request + data + a pointer to read
   `agents/visualizer/AGENTS.md`'s style guide, and an instruction to invoke
   the `dataviz` skill. `dataviz` ships its own placeholder palette
   (`references/palette.md`) — instruct the subagent to override it with
   the palette from the style guide instead of the placeholder.
3. If the output's destination (which repo/folder, or inline-only) isn't
   obvious from context, ask — don't default to saving inside this `cortex`
   repo unless explicitly asked to archive it as reference material.
4. Return to the user: artifact path (or inline content) + one-line
   description of what it shows.

## Notes

- Never fabricate data points, trends, or numbers not present in the
  supplied data or memory/context.
- If `dataviz` isn't available for some reason, say so rather than falling
  back to an unstyled chart silently.
