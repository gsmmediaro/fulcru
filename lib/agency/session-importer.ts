import { readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { tokenCostUsd } from "./pricing";
import { api, getStore } from "./store";
import type { Run, RunEvent } from "./types";

const ACTIVE_GAP_MS = 5 * 60 * 1000;

export type SessionStats = {
  sessionId: string;
  filePath: string;
  cwd?: string;
  startedAt: string;
  endedAt: string;
  wallSec: number;
  activeSec: number;
  userMsgs: number;
  assistantMsgs: number;
  toolUses: number;
  fileEdits: number;
  modelTotals: Record<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      cacheWriteTokens: number;
      cacheReadTokens: number;
      messages: number;
    }
  >;
  tokensIn: number;
  tokensOut: number;
  cacheWrite: number;
  cacheRead: number;
  tokenCostUsd: number;
};

type Line = {
  type?: string;
  timestamp?: string;
  message?: { model?: string; usage?: Record<string, number>; content?: unknown };
  toolUseResult?: unknown;
  cwd?: string;
};

export function defaultProjectsRoot() {
  return path.join(homedir(), ".claude", "projects");
}

export function encodeCwdForClaude(cwd: string) {
  return cwd
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):\//, "$1--")
    .replace(/[\/]/g, "-")
    .replace(/^-+/, "")
    .replace(/^([A-Za-z])--/, "$1--");
}

export function findSessionJsonl(opts: {
  sessionId?: string;
  cwd?: string;
  projectsRoot?: string;
}): string {
  const root = opts.projectsRoot ?? defaultProjectsRoot();
  const candidates: string[] = [];

  const projectDirs = readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(root, d.name));

  if (opts.cwd) {
    const enc = encodeCwdForClaude(opts.cwd);
    const matched = projectDirs.find((p) => path.basename(p) === enc);
    if (matched) candidates.push(matched);
  }
  if (candidates.length === 0) candidates.push(...projectDirs);

  let best: { p: string; mtime: number } | undefined;
  for (const dir of candidates) {
    const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
    for (const f of files) {
      if (opts.sessionId && !f.startsWith(opts.sessionId)) continue;
      const full = path.join(dir, f);
      const m = statSync(full).mtimeMs;
      if (!best || m > best.mtime) best = { p: full, mtime: m };
    }
    if (opts.sessionId && best) break;
  }

  if (!best) throw new Error("No session JSONL found");
  return best.p;
}

export function parseSession(filePath: string): SessionStats {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  let firstTs: string | undefined;
  let lastTs: string | undefined;
  let cwd: string | undefined;
  let userMsgs = 0;
  let assistantMsgs = 0;
  let toolUses = 0;
  let fileEdits = 0;
  let activeMs = 0;
  let prevTs: number | undefined;

  const modelTotals: SessionStats["modelTotals"] = {};

  for (const line of lines) {
    let d: Line;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.cwd && !cwd) cwd = d.cwd;
    const ts = d.timestamp;
    if (ts) {
      if (!firstTs || ts < firstTs) firstTs = ts;
      if (!lastTs || ts > lastTs) lastTs = ts;
      const t = Date.parse(ts);
      if (prevTs !== undefined) {
        const gap = t - prevTs;
        if (gap > 0 && gap < ACTIVE_GAP_MS) activeMs += gap;
      }
      prevTs = t;
    }
    if (d.type === "user") userMsgs++;
    if (d.type === "assistant") {
      assistantMsgs++;
      const msg = d.message ?? {};
      const model = msg.model ?? "unknown";
      const u = msg.usage ?? {};
      const bucket = (modelTotals[model] ??= {
        inputTokens: 0,
        outputTokens: 0,
        cacheWriteTokens: 0,
        cacheReadTokens: 0,
        messages: 0,
      });
      bucket.messages++;
      bucket.inputTokens += Number(u.input_tokens ?? 0);
      bucket.outputTokens += Number(u.output_tokens ?? 0);
      bucket.cacheWriteTokens += Number(u.cache_creation_input_tokens ?? 0);
      bucket.cacheReadTokens += Number(u.cache_read_input_tokens ?? 0);
      if (Array.isArray(msg.content)) {
        for (const block of msg.content as Array<{ type?: string; name?: string }>) {
          if (block?.type === "tool_use") {
            toolUses++;
            if (block.name === "Edit" || block.name === "Write" || block.name === "NotebookEdit") {
              fileEdits++;
            }
          }
        }
      }
    }
  }

  if (!firstTs || !lastTs) {
    throw new Error("Session JSONL has no timestamped events");
  }

  let totalIn = 0,
    totalOut = 0,
    totalCw = 0,
    totalCr = 0,
    totalCost = 0;
  for (const [model, m] of Object.entries(modelTotals)) {
    totalIn += m.inputTokens;
    totalOut += m.outputTokens;
    totalCw += m.cacheWriteTokens;
    totalCr += m.cacheReadTokens;
    totalCost += tokenCostUsd(model, {
      input_tokens: m.inputTokens,
      output_tokens: m.outputTokens,
      cache_creation_input_tokens: m.cacheWriteTokens,
      cache_read_input_tokens: m.cacheReadTokens,
    });
  }

  const wallSec = Math.round((Date.parse(lastTs) - Date.parse(firstTs)) / 1000);
  return {
    sessionId: path.basename(filePath, ".jsonl"),
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
    modelTotals,
    tokensIn: totalIn,
    tokensOut: totalOut,
    cacheWrite: totalCw,
    cacheRead: totalCr,
    tokenCostUsd: Number(totalCost.toFixed(4)),
  };
}

export function importSessionAsRun(input: {
  stats: SessionStats;
  clientId: string;
  projectId: string;
  skillId: string;
  agentName?: string;
  prompt?: string;
  hourlyRate?: number;
  pricingMode?: "time_plus_tokens" | "baseline";
}): { run: Run; events: RunEvent[] } {
  const s = input.stats;
  const store = getStore();
  const client = store.clients.find((c) => c.id === input.clientId);
  const skill = store.skills.find((sk) => sk.id === input.skillId);
  if (!client || !skill) throw new Error("Unknown client or skill");

  const existing = store.runs.find(
    (r) => r.notes && r.notes.includes(`session:${s.sessionId}`),
  );
  if (existing) {
    store.runs = store.runs.filter((r) => r.id !== existing.id);
    store.events = store.events.filter((e) => e.runId !== existing.id);
  }

  const run = api.startRun({
    clientId: input.clientId,
    projectId: input.projectId,
    skillId: input.skillId,
    agentName: input.agentName ?? Object.keys(s.modelTotals)[0] ?? "claude-opus-4-7",
    prompt: input.prompt ?? `Imported Claude Code session ${s.sessionId.slice(0, 8)}`,
  });

  run.startedAt = s.startedAt;
  run.endedAt = s.endedAt;
  run.runtimeSec = s.wallSec;
  run.activeSec = s.activeSec;
  run.tokensIn = s.tokensIn + s.cacheWrite;
  run.tokensOut = s.tokensOut;
  run.cacheHits = s.cacheRead;
  run.costUsd = s.tokenCostUsd;
  run.notes = `session:${s.sessionId} cwd:${s.cwd ?? "?"} model:${Object.keys(s.modelTotals).join(",")}`;

  const rateUsd = input.hourlyRate ?? client.hourlyRate * skill.rateModifier;
  run.rateUsd = rateUsd;

  const activeHours = s.activeSec / 3600;
  const mode = input.pricingMode ?? "time_plus_tokens";
  let billable: number;
  if (mode === "time_plus_tokens") {
    billable = activeHours * rateUsd + s.tokenCostUsd;
    run.baselineHours = Number(activeHours.toFixed(3));
  } else {
    billable = skill.baselineHours * rateUsd;
    run.baselineHours = skill.baselineHours;
  }
  run.billableUsd = Number(billable.toFixed(2));
  run.status = "shipped";

  const t0 = Date.parse(s.startedAt);
  const evt = (offsetSec: number, kind: RunEvent["kind"], label: string, detail?: string) => {
    store.events.push({
      id: `evt_${run.id}_${kind}_${offsetSec}`,
      runId: run.id,
      ts: new Date(t0 + offsetSec * 1000).toISOString(),
      kind,
      label,
      detail,
    });
  };

  evt(0, "milestone", `Session started · ${s.sessionId.slice(0, 8)}`, s.cwd);
  evt(
    Math.round(s.wallSec * 0.25),
    "tool_call",
    `${s.toolUses} tool calls · ${s.fileEdits} file edits`,
    Object.entries(s.modelTotals)
      .map(([m, x]) => `${m}: ${x.messages} msgs`)
      .join(" · "),
  );
  evt(
    Math.round(s.wallSec * 0.5),
    "decision",
    "Token throughput",
    `${(s.tokensIn / 1000).toFixed(0)}k in · ${(s.tokensOut / 1000).toFixed(0)}k out · ${(s.cacheRead / 1_000_000).toFixed(2)}M cached reads`,
  );
  evt(
    s.wallSec,
    "milestone",
    `Session ended · $${run.costUsd.toFixed(2)} compute · $${run.billableUsd.toFixed(2)} billable`,
  );

  return {
    run,
    events: store.events.filter((e) => e.runId === run.id),
  };
}
