import { readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { tokenCostUsd } from "./pricing";
import { sql } from "@/lib/db";
import { store } from "./store";
import type { Run, RunEvent } from "./types";

export type EnrichmentResult = {
  runId: string;
  filePath?: string;
  tokensIn: number;
  tokensOut: number;
  cacheWrite: number;
  cacheRead: number;
  tokenCostUsd: number;
  modelTotals: Record<string, number>;
  matchedEvents: number;
  enriched: boolean;
  reason?: string;
};

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
  /** Claude Code's auto-summary (post-compaction) if present in the JSONL. */
  summary?: string;
  /** Claude Code's auto-generated topic title (added per session as a semantic label). */
  aiTitle?: string;
  /** First human user prompt in the session - useful as a human-readable run name. */
  firstUserPrompt?: string;
};

type Line = {
  type?: string;
  timestamp?: string;
  message?: { model?: string; usage?: Record<string, number>; content?: unknown };
  toolUseResult?: unknown;
  cwd?: string;
  summary?: string;
  aiTitle?: string;
  isMeta?: boolean;
};

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        if (b && typeof b === "object" && "text" in b) {
          const t = (b as { text?: unknown }).text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .join(" ")
      .trim();
  }
  return "";
}

export function defaultProjectsRoot() {
  return path.join(homedir(), ".claude", "projects");
}

export function encodeCwdForClaude(cwd: string) {
  // Windows drive prefix: C:\foo -> C--foo (strips both `:` and the separator).
  // Then any remaining \ or / becomes -.
  return cwd
    .replace(/^([A-Za-z]):[\\/]/, "$1--")
    .replace(/[\\/]/g, "-");
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
  let summary: string | undefined;
  let aiTitle: string | undefined;
  let firstUserPrompt: string | undefined;

  const modelTotals: SessionStats["modelTotals"] = {};

  for (const line of lines) {
    let d: Line;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.type === "summary" && !summary && typeof d.summary === "string") {
      summary = d.summary.trim() || undefined;
    }
    if (d.type === "ai-title" && !aiTitle && typeof d.aiTitle === "string") {
      aiTitle = d.aiTitle.trim() || undefined;
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
    if (d.type === "user") {
      userMsgs++;
      if (!firstUserPrompt && !d.isMeta) {
        const text = extractText(d.message?.content);
        // Skip tool_result-only user messages (no real text) and system reminders.
        if (text && !text.startsWith("<") && !text.startsWith("[Request interrupted")) {
          firstUserPrompt = text;
        }
      }
    }
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
    summary,
    aiTitle,
    firstUserPrompt,
  };
}

function deriveSessionLabel(s: SessionStats): string {
  // Preference order: Claude Code's own ai-title > post-compaction summary >
  // first human prompt > sessionId fallback.
  const raw = (s.aiTitle ?? s.summary ?? s.firstUserPrompt ?? "").trim();
  if (!raw) return `Claude Code session ${s.sessionId.slice(0, 8)}`;
  const oneLine = raw.replace(/\s+/g, " ");
  return oneLine.length > 100 ? oneLine.slice(0, 97) + "..." : oneLine;
}

export async function enrichRunFromSession(
  userId: string,
  input: {
    runId: string;
    cwd?: string;
    sinceIso?: string;
    untilIso?: string;
    filePath?: string;
  },
): Promise<EnrichmentResult> {
  const run = await store.getRun(userId, input.runId);
  if (!run) {
    return {
      runId: input.runId,
      tokensIn: 0,
      tokensOut: 0,
      cacheWrite: 0,
      cacheRead: 0,
      tokenCostUsd: 0,
      modelTotals: {},
      matchedEvents: 0,
      enriched: false,
      reason: "Run not found",
    };
  }

  const cwd = input.cwd ?? run.cwd;
  let filePath = input.filePath;
  if (!filePath) {
    if (!cwd) {
      return {
        runId: run.id,
        tokensIn: 0,
        tokensOut: 0,
        cacheWrite: 0,
        cacheRead: 0,
        tokenCostUsd: 0,
        modelTotals: {},
        matchedEvents: 0,
        enriched: false,
        reason: "No cwd available - pass cwd to enrich token cost",
      };
    }
    try {
      filePath = findSessionJsonl({ cwd });
    } catch (e) {
      return {
        runId: run.id,
        tokensIn: 0,
        tokensOut: 0,
        cacheWrite: 0,
        cacheRead: 0,
        tokenCostUsd: 0,
        modelTotals: {},
        matchedEvents: 0,
        enriched: false,
        reason: e instanceof Error ? e.message : String(e),
      };
    }
  }

  const since = input.sinceIso ?? run.startedAt;
  const until = input.untilIso ?? run.endedAt;
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  let totalIn = 0,
    totalOut = 0,
    totalCw = 0,
    totalCr = 0;
  const modelMsgs: Record<string, number> = {};
  let matched = 0;
  let totalCost = 0;

  for (const line of lines) {
    let d: Line;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (d.type !== "assistant") continue;
    const ts = d.timestamp;
    if (!ts) continue;
    if (since && ts < since) continue;
    if (until && ts > until) continue;
    matched++;
    const msg = d.message ?? {};
    const model = msg.model ?? "unknown";
    const u = msg.usage ?? {};
    const inT = Number(u.input_tokens ?? 0);
    const outT = Number(u.output_tokens ?? 0);
    const cwT = Number(u.cache_creation_input_tokens ?? 0);
    const crT = Number(u.cache_read_input_tokens ?? 0);
    totalIn += inT;
    totalOut += outT;
    totalCw += cwT;
    totalCr += crT;
    modelMsgs[model] = (modelMsgs[model] ?? 0) + 1;
    totalCost += tokenCostUsd(model, {
      input_tokens: inT,
      output_tokens: outT,
      cache_creation_input_tokens: cwT,
      cache_read_input_tokens: crT,
    });
  }

  const tokensIn = totalIn + totalCw;
  const tokensOut = totalOut;
  const cacheHits = totalCr;
  const costUsd = Number(totalCost.toFixed(4));
  let billableUsd = run.billableUsd;
  if (run.status === "shipped") {
    const runtimeHours = run.runtimeSec / 3600;
    billableUsd =
      run.pricingMode === "baseline"
        ? Number((run.baselineHours * run.rateUsd).toFixed(2))
        : Number((runtimeHours * run.rateUsd + costUsd).toFixed(2));
  }
  await sql`
    UPDATE run
    SET tokens_in = ${tokensIn},
        tokens_out = ${tokensOut},
        cache_hits = ${cacheHits},
        cost_usd = ${costUsd},
        billable_usd = ${billableUsd},
        cwd = COALESCE(cwd, ${cwd ?? null})
    WHERE user_id = ${userId} AND id = ${run.id}
  `;

  return {
    runId: run.id,
    filePath,
    tokensIn: totalIn,
    tokensOut: totalOut,
    cacheWrite: totalCw,
    cacheRead: totalCr,
    tokenCostUsd: costUsd,
    modelTotals: modelMsgs,
    matchedEvents: matched,
    enriched: true,
  };
}

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now()
    .toString(36)
    .slice(-4)}`;
}

export async function importSessionAsRun(
  userId: string,
  input: {
    stats: SessionStats;
    clientId: string;
    projectId: string;
    skillId: string;
    agentName?: string;
    prompt?: string;
    hourlyRate?: number;
    pricingMode?: "time_plus_tokens" | "baseline";
  },
): Promise<{ run: Run; events: RunEvent[] }> {
  const s = input.stats;
  const [client, project, skill] = await Promise.all([
    store.getClient(userId, input.clientId),
    store.getProject(userId, input.projectId),
    store.getSkill(userId, input.skillId),
  ]);
  if (!client || !project || !skill) {
    throw new Error("Unknown client / project / skill");
  }

  // Re-import: drop any prior run referencing this sessionId
  const sessionTag = `session:${s.sessionId}`;
  await sql`
    DELETE FROM run
    WHERE user_id = ${userId}
      AND notes LIKE ${`%${sessionTag}%`}
  `;

  const runId = genId("run");
  const agentName =
    input.agentName ?? Object.keys(s.modelTotals)[0] ?? "claude-opus-4-7";
  const rateUsd = input.hourlyRate ?? client.hourlyRate * skill.rateModifier;
  const tokensIn = s.tokensIn + s.cacheWrite;
  const tokensOut = s.tokensOut;
  const cacheHits = s.cacheRead;
  const costUsd = s.tokenCostUsd;
  const activeHours = s.activeSec / 3600;
  const mode = input.pricingMode ?? "time_plus_tokens";
  let billable: number;
  let baselineHours: number;
  if (mode === "time_plus_tokens") {
    billable = activeHours * rateUsd + costUsd;
    baselineHours = Number(activeHours.toFixed(3));
  } else {
    billable = skill.baselineHours * rateUsd;
    baselineHours = skill.baselineHours;
  }
  billable = Number(billable.toFixed(2));
  const notes = `${sessionTag} cwd:${s.cwd ?? "?"} model:${Object.keys(s.modelTotals).join(",")}`;

  await sql`
    INSERT INTO run (
      id, user_id, client_id, project_id, skill_id, agent_name, status,
      prompt, cwd, pricing_mode,
      started_at, ended_at, runtime_sec, active_sec,
      tokens_in, tokens_out, cache_hits, cost_usd,
      baseline_hours, rate_usd, billable_usd, notes
    )
    VALUES (
      ${runId}, ${userId}, ${client.id}, ${project.id}, ${skill.id},
      ${agentName}, 'shipped',
      ${input.prompt ?? deriveSessionLabel(s)},
      ${s.cwd ?? null}, ${mode},
      ${s.startedAt}, ${s.endedAt}, ${s.wallSec}, ${s.activeSec},
      ${tokensIn}, ${tokensOut}, ${cacheHits}, ${costUsd},
      ${baselineHours}, ${rateUsd}, ${billable}, ${notes}
    )
  `;

  const t0 = Date.parse(s.startedAt);
  const events: Array<{
    id: string;
    ts: string;
    kind: RunEvent["kind"];
    label: string;
    detail: string | null;
  }> = [
    {
      id: genId("evt"),
      ts: new Date(t0).toISOString(),
      kind: "milestone",
      label: `Session started · ${s.sessionId.slice(0, 8)}`,
      detail: s.cwd ?? null,
    },
    {
      id: genId("evt"),
      ts: new Date(t0 + Math.round(s.wallSec * 0.25) * 1000).toISOString(),
      kind: "tool_call",
      label: `${s.toolUses} tool calls · ${s.fileEdits} file edits`,
      detail: Object.entries(s.modelTotals)
        .map(([m, x]) => `${m}: ${x.messages} msgs`)
        .join(" · "),
    },
    {
      id: genId("evt"),
      ts: new Date(t0 + Math.round(s.wallSec * 0.5) * 1000).toISOString(),
      kind: "decision",
      label: "Token throughput",
      detail: `${(s.tokensIn / 1000).toFixed(0)}k in · ${(s.tokensOut / 1000).toFixed(0)}k out · ${(s.cacheRead / 1_000_000).toFixed(2)}M cached reads`,
    },
    {
      id: genId("evt"),
      ts: new Date(t0 + s.wallSec * 1000).toISOString(),
      kind: "milestone",
      label: `Session ended · $${costUsd.toFixed(2)} compute · $${billable.toFixed(2)} billable`,
      detail: null,
    },
  ];
  for (const e of events) {
    await sql`
      INSERT INTO run_event (id, user_id, run_id, ts, kind, label, detail)
      VALUES (${e.id}, ${userId}, ${runId}, ${e.ts}, ${e.kind}, ${e.label}, ${e.detail})
    `;
  }

  const run = await store.getRun(userId, runId);
  if (!run) throw new Error("Failed to create run");
  const evRows = await store.listRunEvents(userId, runId);
  return { run, events: evRows };
}
