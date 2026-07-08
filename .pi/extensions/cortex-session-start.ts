/**
 * pi equivalent of .claude/hooks/session-start.sh — injects cortex's identity
 * + eager memory tier as hidden context on session_start, so the router's
 * "load memory eagerly" rule in AGENTS.md doesn't depend on the model
 * remembering to run `read` calls for it.
 *
 * pi has no built-in sub-agent concept (see README "No sub-agents"), so
 * unlike the Claude Code hook there's no subagent case to skip here.
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// Resolve the repo root from this file's own location rather than ctx.cwd —
// pi may be invoked from a subdirectory of the repo, ctx.cwd isn't guaranteed
// to be the project root. This file lives at <root>/.pi/extensions/<this>.ts.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function readIfExists(p: string): string | null {
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function buildBootstrap(): string {
  const parts: string[] = [
    "## Cortex session bootstrap (auto-injected by session_start extension)",
    "",
    "Default active agent: cortex. Adopt agents/cortex/AGENTS.md (below) as",
    "primary instructions, layered on the root AGENTS.md router. Shared and",
    "cortex memory (below) is the eager tier — treat it as already loaded, no",
    "need to re-read these files with `read`.",
    "",
  ];

  const agentsFile = readIfExists(path.join(ROOT, "agents/cortex/AGENTS.md"));
  if (agentsFile) parts.push("### agents/cortex/AGENTS.md", agentsFile, "");

  for (const dir of ["shared-memory", "agents/cortex/memory"]) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    for (const name of fs.readdirSync(full).filter((f) => f.endsWith(".md")).sort()) {
      const content = readIfExists(path.join(full, name));
      if (content) parts.push(`### ${dir}/${name}`, content, "");
    }
  }

  return parts.join("\n");
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async (event, _ctx) => {
    // "reload" is just extensions hot-reloading mid-conversation (/reload),
    // not a real session boundary — skip to avoid re-injecting into an
    // already-bootstrapped, ongoing session.
    if (event.reason === "reload") return;

    pi.sendMessage(
      { customType: "cortex-bootstrap", content: buildBootstrap(), display: false },
      { deliverAs: "nextTurn" },
    );
  });
}
