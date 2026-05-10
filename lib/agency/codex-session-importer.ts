import { readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { tokenCostUsd } from "./pricing";
import type { SessionStats } from "./session-importer";

const ACTIVE_GAP_MS = 5 * 60 * 1000;

type CodexLine = {
  timestamp?: string;
  type?: string;
  payload?: Record<string, unknown>;
};

type TokenUsage = {
  input_tokens?: number;
  cached_input_tokens?: number;
  output_tokens?: number;
  reasoning_output_tokens?: number;
};

type CodexSessionListItem = {
  sessionId: string;
  filePath: string;
  cwd?: string;
  title?: string;
  sizeBytes: number;
  modifiedAt: string;
};

export function defaultCodexSessionsRoot() {
  return path.join(homedir(), ".codex", "sessions");
}

function walkJsonlFiles(dir: string): string[] {
  const out: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJsonlFiles(full));
    } else if (entry.isFile() && entry.name.endsWith(".jsonl")) {
      out.push(full);
    }
  }
  return out;
}

function extractSessionId(filePath: string) {
  const base = path.basename(filePath, ".jsonl");
  const match = base.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i,
  );
  return match?.[1] ?? base;
}

function readCodexIndex(): Map<string, string> {
  const indexPath = path.join(homedir(), ".codex", "session_index.jsonl");
  const map = new Map<string, string>();
  let raw: string;
  try {
    raw = readFileSync(indexPath, "utf-8");
  } catch {
    return map;
  }
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line) as { id?: unknown; thread_name?: unknown };
      if (typeof data.id === "string" && typeof data.thread_name === "string") {
        map.set(data.id, data.thread_name);
      }
    } catch {
      // Ignore malformed index rows.
    }
  }
  return map;
}

function readMeta(filePath: string): { sessionId: string; cwd?: string; model?: string } {
  const raw = readFileSync(filePath, "utf-8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const d = JSON.parse(line) as CodexLine;
      if (d.type === "session_meta" && d.payload) {
        return {
          sessionId:
            typeof d.payload.id === "string" ? d.payload.id : extractSessionId(filePath),
          cwd: typeof d.payload.cwd === "string" ? d.payload.cwd : undefined,
          model:
            typeof d.payload.model === "string"
              ? d.payload.model
              : undefined,
        };
      }
      if (d.type === "turn_context" && d.payload) {
        return {
          sessionId: extractSessionId(filePath),
          cwd: typeof d.payload.cwd === "string" ? d.payload.cwd : undefined,
          model:
            typeof d.payload.model === "string"
              ? d.payload.model
              : undefined,
        };
      }
    } catch {
      // Keep scanning.
    }
  }
  return { sessionId: extractSessionId(filePath) };
}

function fulcruSelfCwd(): string {
  return process.env.FULCRU_SELF_CWD ?? process.cwd();
}

function isFulcruSelfCwd(cwd: string | undefined): boolean {
  if (!cwd) return false;
  return normalizePath(cwd) === normalizePath(fulcruSelfCwd());
}

export function listCodexSessions(opts: {
  cwd?: string;
  sessionsRoot?: string;
}): CodexSessionListItem[] {
  const root = opts.sessionsRoot ?? defaultCodexSessionsRoot();
  const titleById = readCodexIndex();
  const files = walkJsonlFiles(root);
  return files
    .map((filePath) => {
      const st = statSync(filePath);
      const meta = readMeta(filePath);
      return {
        sessionId: meta.sessionId,
        filePath,
        cwd: meta.cwd,
        title: titleById.get(meta.sessionId),
        sizeBytes: st.size,
        modifiedAt: new Date(st.mtimeMs).toISOString(),
      };
    })
    .filter((s) => !opts.cwd || cwdMatchesProject(s.cwd, opts.cwd))
    .filter((s) => !isFulcruSelfCwd(s.cwd))
    .sort((a, b) => (a.modifiedAt < b.modifiedAt ? 1 : -1));
}

/**
 * Match a session's cwd against a target project directory.
 * Returns true when the session was started inside the target dir or any
 * subdirectory of it (e.g. nested folders, in-tree git worktrees, etc.).
 * Sibling worktrees living outside the target dir are NOT matched here -
 * the importer surfaces them by basename hint when the user asks for
 * "all sessions for project X".
 */
function cwdMatchesProject(
  sessionCwd: string | undefined,
  targetCwd: string,
): boolean {
  if (!sessionCwd) return false;
  const a = normalizePath(sessionCwd);
  const b = normalizePath(targetCwd);
  if (a === b) return true;
  const sep = path.sep;
  return a.startsWith(b.endsWith(sep) ? b : b + sep);
}

export function findCodexSessionJsonl(opts: {
  sessionId?: string;
  cwd?: string;
  sessionsRoot?: string;
}): string {
  const sessions = listCodexSessions({
    cwd: opts.cwd,
    sessionsRoot: opts.sessionsRoot,
  });
  const found = opts.sessionId
    ? sessions.find(
        (s) =>
          s.sessionId === opts.sessionId ||
          path.basename(s.filePath, ".jsonl").includes(opts.sessionId!),
      )
    : sessions[0];
  if (!found) throw new Error("No Codex session JSONL found");
  return found.filePath;
}

export function parseCodexSession(filePath: string): SessionStats {
  const titleById = readCodexIndex();
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  let sessionId = extractSessionId(filePath);
  let cwd: string | undefined;
  let model = "codex-session";
  let firstTs: string | undefined;
  let lastTs: string | undefined;
  let prevTs: number | undefined;
  let activeMs = 0;
  let userMsgs = 0;
  let assistantMsgs = 0;
  let toolUses = 0;
  let fileEdits = 0;
  let firstUserPrompt: string | undefined;
  let lastUsage: TokenUsage | undefined;

  for (const line of lines) {
    let d: CodexLine;
    try {
      d = JSON.parse(line) as CodexLine;
    } catch {
      continue;
    }

    if (d.timestamp) {
      if (!firstTs || d.timestamp < firstTs) firstTs = d.timestamp;
      if (!lastTs || d.timestamp > lastTs) lastTs = d.timestamp;
      const t = Date.parse(d.timestamp);
      if (Number.isFinite(t) && prevTs !== undefined) {
        const gap = t - prevTs;
        if (gap > 0 && gap < ACTIVE_GAP_MS) activeMs += gap;
      }
      if (Number.isFinite(t)) prevTs = t;
    }

    const payload = d.payload;
    if (!payload) continue;

    if (d.type === "session_meta") {
      if (typeof payload.id === "string") sessionId = payload.id;
      if (typeof payload.cwd === "string" && !cwd) cwd = payload.cwd;
    }

    if (d.type === "turn_context") {
      if (typeof payload.cwd === "string" && !cwd) cwd = payload.cwd;
      if (typeof payload.model === "string") model = payload.model;
    }

    if (payload.type === "user_message") {
      userMsgs++;
      if (!firstUserPrompt && typeof payload.message === "string") {
        firstUserPrompt = payload.message.trim() || undefined;
      }
    }

    if (payload.type === "message") {
      if (payload.role === "user") userMsgs++;
      if (payload.role === "assistant") assistantMsgs++;
      if (!firstUserPrompt && payload.role === "user") {
        const text = extractResponseText(payload.content);
        if (text && !text.startsWith("# AGENTS.md instructions")) {
          firstUserPrompt = text;
        }
      }
    }

    if (payload.type === "agent_message") assistantMsgs++;

    if (payload.type === "function_call") {
      toolUses++;
      const name = typeof payload.name === "string" ? payload.name : "";
      const args = typeof payload.arguments === "string" ? payload.arguments : "";
      if (
        name === "apply_patch" ||
        args.includes("apply_patch") ||
        /\b(Set-Content|Add-Content|Out-File|New-Item|Move-Item|Remove-Item)\b/i.test(args)
      ) {
        fileEdits++;
      }
    }

    if (payload.type === "token_count") {
      const info = payload.info as
        | { total_token_usage?: TokenUsage; last_token_usage?: TokenUsage }
        | null
        | undefined;
      if (info?.total_token_usage) lastUsage = info.total_token_usage;
    }
  }

  if (!firstTs || !lastTs) {
    throw new Error("Codex session JSONL has no timestamped events");
  }

  const inputTotal = Number(lastUsage?.input_tokens ?? 0);
  const cachedInput = Number(lastUsage?.cached_input_tokens ?? 0);
  const tokensIn = Math.max(0, inputTotal - cachedInput);
  const tokensOut =
    Number(lastUsage?.output_tokens ?? 0) +
    Number(lastUsage?.reasoning_output_tokens ?? 0);
  const cacheRead = cachedInput;
  const tokenCost = tokenCostUsd(model, {
    input_tokens: tokensIn,
    output_tokens: tokensOut,
    cache_read_input_tokens: cacheRead,
  });

  const wallSec = Math.max(
    0,
    Math.round((Date.parse(lastTs) - Date.parse(firstTs)) / 1000),
  );
  const title = titleById.get(sessionId);

  return {
    sessionId,
    filePath,
    cwd,
    startedAt: firstTs,
    endedAt: lastTs,
    wallSec,
    activeSec: Math.round(activeMs / 1000),
    userMsgs,
    assistantMsgs,
    toolUses,
    fileEdits,
    modelTotals: {
      [model]: {
        inputTokens: tokensIn,
        outputTokens: tokensOut,
        cacheWriteTokens: 0,
        cacheReadTokens: cacheRead,
        messages: assistantMsgs,
      },
    },
    tokensIn,
    tokensOut,
    cacheWrite: 0,
    cacheRead,
    tokenCostUsd: Number(tokenCost.toFixed(4)),
    aiTitle: title,
    firstUserPrompt,
  };
}

function extractResponseText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return "";
      const text = (part as { text?: unknown }).text;
      return typeof text === "string" ? text : "";
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function samePath(a: string | undefined, b: string) {
  if (!a) return false;
  return normalizePath(a) === normalizePath(b);
}

function normalizePath(p: string) {
  return path.resolve(p).toLowerCase();
}
