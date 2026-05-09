#!/usr/bin/env node
// Fulcru Stop hook for Claude Code.
//
// Reads the session transcript Claude Code just wrote, summarises it
// (timestamps, active time, tokens, first prompt) and posts a billable run to
// Fulcru via submit_session_data.
//
// Wire it up in ~/.claude/settings.json:
//
//   {
//     "hooks": {
//       "Stop": [{
//         "matcher": "*",
//         "hooks": [{ "type": "command",
//                     "command": "node C:/abs/path/fulcru-stop-hook.mjs" }]
//       }]
//     },
//     "env": {
//       "FULCRU_API_KEY": "fcr_...",
//       "FULCRU_BASE_URL": "https://your-fulcru.example.com"
//     }
//   }
//
// Failure is non-fatal: any error is logged to stderr and exit code stays 0
// so a Fulcru outage never blocks the user's `claude` exit.

import { readFileSync } from "node:fs";

const MIN_ACTIVE_SEC = Number(process.env.FULCRU_MIN_ACTIVE_SEC ?? "60");
const ACTIVE_GAP_MS = 5 * 60 * 1000;

async function main() {
  const apiKey = process.env.FULCRU_API_KEY;
  if (!apiKey) {
    console.error(
      "[fulcru-hook] FULCRU_API_KEY not set; skipping. Generate one at /agency/settings.",
    );
    return;
  }
  const baseUrl = process.env.FULCRU_BASE_URL ?? "http://localhost:3000";

  let payload;
  try {
    const stdin = readFileSync(0, "utf8");
    payload = JSON.parse(stdin || "{}");
  } catch (e) {
    console.error("[fulcru-hook] could not parse stdin:", e?.message);
    return;
  }

  const transcriptPath = payload.transcript_path;
  const sessionId = payload.session_id;
  const hookCwd = payload.cwd;
  if (!transcriptPath || !sessionId) {
    console.error(
      "[fulcru-hook] hook stdin missing transcript_path / session_id; skipping.",
    );
    return;
  }

  let stats;
  try {
    stats = parseTranscript(transcriptPath);
  } catch (e) {
    console.error("[fulcru-hook] failed to read transcript:", e?.message);
    return;
  }
  if (!stats) return;
  if (stats.activeSec < MIN_ACTIVE_SEC) {
    console.error(
      `[fulcru-hook] active=${stats.activeSec}s under threshold ${MIN_ACTIVE_SEC}s, skipping.`,
    );
    return;
  }

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "submit_session_data",
      arguments: {
        sessionId,
        cwd: stats.cwd ?? hookCwd,
        title: stats.title,
        startedAt: stats.startedAt,
        endedAt: stats.endedAt,
        wallSec: stats.wallSec,
        activeSec: stats.activeSec,
        tokensIn: stats.tokensIn,
        tokensOut: stats.tokensOut,
        cacheReadTokens: stats.cacheRead,
        tokenCostUsd: stats.tokenCostUsd,
        model: stats.model,
        toolUses: stats.toolUses,
        fileEdits: stats.fileEdits,
      },
    },
  };

  try {
    const res = await fetch(`${baseUrl}/api/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(
        `[fulcru-hook] HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`,
      );
      return;
    }
    const reply = await res.json();
    if (reply.error) {
      console.error("[fulcru-hook] rpc error:", reply.error.message);
      return;
    }
    if (reply.result?.isError) {
      console.error(
        "[fulcru-hook] tool error:",
        reply.result.content?.[0]?.text,
      );
      return;
    }
    const r = JSON.parse(reply.result.content[0].text);
    const tag = r.resolved?.routedBy ?? "?";
    const billable =
      typeof r.run?.billableUsd === "number"
        ? `$${r.run.billableUsd.toFixed(2)}`
        : "?";
    console.error(
      `[fulcru-hook] logged session ${sessionId.slice(0, 8)} -> ${tag} (${billable})`,
    );
  } catch (e) {
    console.error("[fulcru-hook] post failed:", e?.message);
  }
}

function parseTranscript(filePath) {
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);

  let firstTs;
  let lastTs;
  let cwd;
  let firstUserPrompt;
  let aiTitle;
  let summary;
  let toolUses = 0;
  let fileEdits = 0;
  let activeMs = 0;
  let prevMs;
  let primaryModel;
  let totalIn = 0;
  let totalOut = 0;
  let totalCw = 0;
  let totalCr = 0;

  for (const line of lines) {
    let d;
    try {
      d = JSON.parse(line);
    } catch {
      continue;
    }
    if (typeof d.cwd === "string" && !cwd) cwd = d.cwd;
    if (d.type === "summary" && typeof d.summary === "string" && !summary) {
      summary = d.summary.trim();
    }
    if (
      d.type === "ai-title" &&
      typeof d.aiTitle === "string" &&
      !aiTitle
    ) {
      aiTitle = d.aiTitle.trim();
    }
    const ts = d.timestamp;
    if (typeof ts === "string") {
      if (!firstTs || ts < firstTs) firstTs = ts;
      if (!lastTs || ts > lastTs) lastTs = ts;
      const t = Date.parse(ts);
      if (Number.isFinite(t)) {
        if (prevMs !== undefined) {
          const gap = t - prevMs;
          if (gap > 0 && gap < ACTIVE_GAP_MS) activeMs += gap;
        }
        prevMs = t;
      }
    }
    if (d.type === "user" && !firstUserPrompt && !d.isMeta) {
      const txt = extractText(d.message?.content);
      if (txt && !txt.startsWith("<") && !txt.startsWith("[Request interrupted")) {
        firstUserPrompt = txt;
      }
    }
    if (d.type === "assistant") {
      const msg = d.message ?? {};
      if (typeof msg.model === "string" && !primaryModel) {
        primaryModel = msg.model;
      }
      const u = msg.usage ?? {};
      totalIn += Number(u.input_tokens ?? 0);
      totalOut += Number(u.output_tokens ?? 0);
      totalCw += Number(u.cache_creation_input_tokens ?? 0);
      totalCr += Number(u.cache_read_input_tokens ?? 0);
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block?.type === "tool_use") {
            toolUses++;
            if (
              block.name === "Edit" ||
              block.name === "Write" ||
              block.name === "NotebookEdit"
            ) {
              fileEdits++;
            }
          }
        }
      }
    }
  }

  if (!firstTs || !lastTs) return null;

  const wallSec = Math.max(
    0,
    Math.round((Date.parse(lastTs) - Date.parse(firstTs)) / 1000),
  );
  const activeSec = Math.round(activeMs / 1000);
  const title = (aiTitle || summary || firstUserPrompt || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  return {
    cwd,
    startedAt: firstTs,
    endedAt: lastTs,
    wallSec,
    activeSec,
    title: title || undefined,
    tokensIn: totalIn,
    tokensOut: totalOut,
    cacheWrite: totalCw,
    cacheRead: totalCr,
    tokenCostUsd: 0, // server can recompute later from settings if needed
    toolUses,
    fileEdits,
    model: primaryModel,
  };
}

function extractText(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((b) => {
        if (b && typeof b === "object" && "text" in b) {
          const t = b.text;
          return typeof t === "string" ? t : "";
        }
        return "";
      })
      .join(" ")
      .trim();
  }
  return "";
}

main().catch((e) => {
  console.error("[fulcru-hook] uncaught:", e?.message);
});
