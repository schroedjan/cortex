/**
 * pi equivalent of .claude/hooks/user-prompt-submit.sh — detects requests
 * that match the visualizer row in the root AGENTS.md routing table and
 * injects an explicit switch directive, so mid-session routing doesn't
 * depend on the model noticing the match itself.
 *
 * Keep the keyword list in sync with that table's "Use when" column, with
 * .claude/hooks/user-prompt-submit.sh, and with the triggers in
 * agents/visualizer/skills/{diagram,chart}/SKILL.md.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const VISUALIZER_TRIGGER =
  /diagram|flowchart|service map|infrastructure map|architecture (map|overview)|\bchart\b|\bgraph\b|\bplot\b|dashboard|\bkpi\b|visuali[sz]|dataviz|excalidraw/i;

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event, _ctx) => {
    if (!VISUALIZER_TRIGGER.test(event.prompt)) return;

    let visualizerInstructions: string;
    try {
      visualizerInstructions = fs.readFileSync(
        path.join(ROOT, "agents/visualizer/AGENTS.md"),
        "utf8",
      );
    } catch {
      return;
    }

    const content =
      "Visualizer-scoped request detected (keyword match on the root AGENTS.md " +
      "routing table). Switch active agent to visualizer: adopt " +
      "agents/visualizer/AGENTS.md (below) layered on the root router, and " +
      "announce the switch before proceeding.\n\n" +
      "### agents/visualizer/AGENTS.md\n" +
      visualizerInstructions;

    return {
      message: { customType: "cortex-route-visualizer", content, display: false },
    };
  });
}
