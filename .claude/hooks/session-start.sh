#!/usr/bin/env bash
# SessionStart hook: injects cortex's identity + eager memory tier as context,
# so the router's "load memory eagerly" rule in AGENTS.md doesn't depend on the
# model remembering to run Read calls for it.
set -euo pipefail

input="$(cat)"
agent_id="$(jq -r '.agent_id // empty' <<<"$input")"
agent_type="$(jq -r '.agent_type // empty' <<<"$input")"

# Subagents get their own task prompt from the orchestrator; they don't need
# (and shouldn't be steered by) cortex's identity/memory bootstrap.
if [[ -n "$agent_id" || -n "$agent_type" ]]; then
  exit 0
fi

root="${CLAUDE_PROJECT_DIR}"

echo "## Cortex session bootstrap (auto-injected by SessionStart hook)"
echo
echo "Default active agent: cortex. Adopt agents/cortex/AGENTS.md (below) as"
echo "primary instructions, layered on the root AGENTS.md router. Shared and"
echo "cortex memory (below) is the eager tier — treat it as already loaded,"
echo "no need to re-read these files with Read."
echo

echo "### agents/cortex/AGENTS.md"
cat "$root/agents/cortex/AGENTS.md"
echo

for f in "$root"/shared-memory/*.md; do
  [[ -f "$f" ]] || continue
  echo "### shared-memory/$(basename "$f")"
  cat "$f"
  echo
done

for f in "$root"/agents/cortex/memory/*.md; do
  [[ -f "$f" ]] || continue
  echo "### agents/cortex/memory/$(basename "$f")"
  cat "$f"
  echo
done

exit 0
