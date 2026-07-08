/**
 * opencode equivalent of .claude/hooks/session-start.sh / pi's
 * cortex-session-start.ts — injects cortex's identity + eager memory tier
 * into the system prompt, so the router's "load memory eagerly" rule in
 * AGENTS.md doesn't depend on the model remembering to read for it.
 *
 * opencode has no session_start-style hook that mutates output; the closest
 * available primitive is "experimental.chat.system.transform", which fires
 * per chat request. A per-sessionID Set dedupes so the multi-KB bootstrap
 * is appended once per session rather than on every turn.
 */
import type { Plugin } from "@opencode-ai/plugin";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// This file lives at <root>/.opencode/plugins/<this>.ts.
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
    "## Cortex session bootstrap (auto-injected by cortex-session-bootstrap plugin)",
    "",
    "Default active agent: cortex. Adopt agents/cortex/AGENTS.md (below) as",
    "primary instructions, layered on the root AGENTS.md router. Shared and",
    "cortex memory (below) is the eager tier — treat it as already loaded, no",
    "need to re-read these files.",
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

const bootstrappedSessions = new Set<string>();

export const CortexSessionBootstrap: Plugin = async () => {
  return {
    "experimental.chat.system.transform": async (input, output) => {
      if (bootstrappedSessions.has(input.sessionID)) return;
      bootstrappedSessions.add(input.sessionID);
      output.system.push(buildBootstrap());
    },
  };
};
