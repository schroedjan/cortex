#!/usr/bin/env bash
# UserPromptSubmit hook: detects requests that match the visualizer row in the
# root AGENTS.md routing table and injects an explicit switch directive, so
# mid-session routing doesn't depend on the model noticing the match itself.
# Keep the keyword list in sync with that table's "Use when" column and with
# the triggers in agents/visualizer/skills/{diagram,chart}/SKILL.md.
set -euo pipefail

input="$(cat)"
agent_id="$(jq -r '.agent_id // empty' <<<"$input")"
agent_type="$(jq -r '.agent_type // empty' <<<"$input")"

if [[ -n "$agent_id" || -n "$agent_type" ]]; then
  exit 0
fi

prompt="$(jq -r '.user_prompt // empty' <<<"$input")"

if grep -qiE 'diagram|flowchart|service map|infrastructure map|architecture (map|overview)|\bchart\b|\bgraph\b|\bplot\b|dashboard|\bkpi\b|visuali[sz]|dataviz|excalidraw' <<<"$prompt"; then
  root="${CLAUDE_PROJECT_DIR}"
  visualizer_instructions="$(cat "$root/agents/visualizer/AGENTS.md")"
  ctx="Visualizer-scoped request detected (keyword match on the root AGENTS.md routing table). Switch active agent to visualizer: adopt agents/visualizer/AGENTS.md (below) layered on the root router, and announce the switch before proceeding.

### agents/visualizer/AGENTS.md
$visualizer_instructions"
  jq -n --arg ctx "$ctx" '{hookSpecificOutput:{hookEventName:"UserPromptSubmit",additionalContext:$ctx}}'
fi

exit 0
