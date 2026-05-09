// One-shot importer: reads every JSONL in the local whl-interface project
// dir, parses it, and submits via MCP to a known client/project. Pleasant
// titles come from the same code path as the Stop hook.

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { homedir } from "node:os";

const ENV_LINES = readFileSync(".env.local", "utf8").split(/\r?\n/);
for (const line of ENV_LINES) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq < 0) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}

const KEY = process.argv[2];
const CLIENT_ID = process.argv[3];
const PROJECT_ID = process.argv[4];
const DIR = process.argv[5];
if (!KEY || !CLIENT_ID || !PROJECT_ID || !DIR) {
  console.error("usage: node scripts/import-whl-sessions.mjs <mcpKey> <clientId> <projectId> <encodedDir>");
  console.error("  encodedDir is the directory name under ~/.claude/projects/");
  process.exit(1);
}

const BASE = process.env.AGENCY_BASE ?? "http://localhost:3000";
const MCP = `${BASE}/api/mcp`;
const ACTIVE_GAP_MS = 5 * 60 * 1000;

function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => (b && typeof b === "object" && "text" in b && typeof b.text === "string" ? b.text : ""))
      .join(" ")
      .trim();
  }
  return "";
}

function parseSession(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  let firstTs, lastTs, cwd;
  let userMsgs = 0, assistantMsgs = 0, toolUses = 0, fileEdits = 0;
  let activeMs = 0, prevTs;
  let summary, aiTitle, firstUserPrompt;
  const modelTotals = {};

  for (const line of lines) {
    let d;
    try { d = JSON.parse(line); } catch { continue; }
    if (d.type === "summary" && !summary && typeof d.summary === "string") {
      summary = d.summary.trim() || undefined;
    }
    if (d.type === "ai-title" && !aiTitle && typeof d.aiTitle === "string") {
      aiTitle = d.aiTitle.trim() || undefined;
    }
    if (d.cwd && !cwd) cwd = d.cwd;
    if (d.timestamp) {
      if (!firstTs || d.timestamp < firstTs) firstTs = d.timestamp;
      if (!lastTs || d.timestamp > lastTs) lastTs = d.timestamp;
      const t = Date.parse(d.timestamp);
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
      const bucket = (modelTotals[model] ??= { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, messages: 0 });
      bucket.messages++;
      bucket.inputTokens += Number(u.input_tokens ?? 0);
      bucket.outputTokens += Number(u.output_tokens ?? 0);
      bucket.cacheWriteTokens += Number(u.cache_creation_input_tokens ?? 0);
      bucket.cacheReadTokens += Number(u.cache_read_input_tokens ?? 0);
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block?.type === "tool_use") {
            toolUses++;
            if (block.name === "Edit" || block.name === "Write" || block.name === "NotebookEdit") fileEdits++;
          }
        }
      }
    }
  }
  if (!firstTs || !lastTs) return null;

  // Pricing (Opus 4.x default rates).
  const PRICING = {
    "claude-opus-4-7": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
    "claude-opus-4-7[1m]": { in: 22.5, out: 112.5, cw: 28.125, cr: 2.25 },
    "claude-opus-4-6": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
    "claude-sonnet-4-6": { in: 3, out: 15, cw: 3.75, cr: 0.3 },
    "claude-haiku-4-5": { in: 1, out: 5, cw: 1.25, cr: 0.1 },
  };
  function pricingFor(m) {
    if (PRICING[m]) return PRICING[m];
    if (m?.includes("opus")) return PRICING["claude-opus-4-7"];
    if (m?.includes("sonnet")) return PRICING["claude-sonnet-4-6"];
    if (m?.includes("haiku")) return PRICING["claude-haiku-4-5"];
    return PRICING["claude-opus-4-7"];
  }

  let totalIn = 0, totalOut = 0, totalCw = 0, totalCr = 0, totalCost = 0;
  for (const [model, m] of Object.entries(modelTotals)) {
    totalIn += m.inputTokens;
    totalOut += m.outputTokens;
    totalCw += m.cacheWriteTokens;
    totalCr += m.cacheReadTokens;
    const p = pricingFor(model);
    totalCost += (m.inputTokens * p.in + m.outputTokens * p.out + m.cacheWriteTokens * p.cw + m.cacheReadTokens * p.cr) / 1_000_000;
  }

  const wallSec = Math.round((Date.parse(lastTs) - Date.parse(firstTs)) / 1000);
  const sessionId = path.basename(filePath, ".jsonl");

  // Match the importer's title preference: aiTitle > summary > firstUserPrompt > fallback.
  const rawLabel = (aiTitle ?? summary ?? firstUserPrompt ?? "").trim();
  const oneLine = rawLabel.replace(/\s+/g, " ");
  const title = oneLine.length === 0
    ? `Claude Code session ${sessionId.slice(0, 8)}`
    : oneLine.length > 100 ? oneLine.slice(0, 97) + "..." : oneLine;

  return {
    sessionId,
    cwd,
    title,
    startedAt: firstTs,
    endedAt: lastTs,
    wallSec,
    activeSec: Math.round(activeMs / 1000),
    tokensIn: totalIn + totalCw,
    tokensOut: totalOut,
    tokenCostUsd: Number(totalCost.toFixed(4)),
    model: Object.keys(modelTotals)[0] ?? "claude-opus-4-7",
  };
}

const projectsRoot = path.join(homedir(), ".claude", "projects");
const dir = path.join(projectsRoot, DIR);
const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
console.log(`Found ${files.length} JSONL files in ${dir}`);

let ok = 0, fail = 0, skipped = 0;
for (const f of files) {
  const full = path.join(dir, f);
  let stats;
  try {
    stats = parseSession(full);
  } catch (e) {
    console.error(`  ${f}: parse failed: ${e.message}`);
    fail++;
    continue;
  }
  if (!stats) {
    console.log(`  ${f}: no timestamped events, skipping`);
    skipped++;
    continue;
  }
  if (stats.activeSec < 60) {
    console.log(`  ${f}: < 60s active (${stats.activeSec}s), skipping`);
    skipped++;
    continue;
  }
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "submit_session_data",
      arguments: {
        sessionId: stats.sessionId,
        cwd: stats.cwd,
        title: stats.title,
        startedAt: stats.startedAt,
        endedAt: stats.endedAt,
        wallSec: stats.wallSec,
        activeSec: stats.activeSec,
        tokensIn: stats.tokensIn,
        tokensOut: stats.tokensOut,
        tokenCostUsd: stats.tokenCostUsd,
        model: stats.model,
        clientId: CLIENT_ID,
        projectId: PROJECT_ID,
      },
    },
  };
  const res = await fetch(MCP, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${KEY}`,
    },
    body: JSON.stringify(body),
  });
  const j = await res.json();
  if (j.error || j.result?.isError) {
    console.error(`  ${f}: ${j.error?.message || j.result?.content?.[0]?.text}`);
    fail++;
    continue;
  }
  const run = JSON.parse(j.result.content[0].text).run;
  console.log(`  ✓ ${run.id}  ${run.changeCategory.padEnd(11)} diff=${run.difficultyScore}  active=${Math.round(stats.activeSec/60)}m  ${stats.title.slice(0, 60)}`);
  ok++;
}
console.log(`\nDone. ok=${ok} fail=${fail} skipped=${skipped}`);
