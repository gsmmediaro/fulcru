// Import Claude Code sessions whose cwd is C:\Users\shado\Desktop\whl
// (the parent dir of whl-interface). The user did some whl-interface work
// from the parent dir, including the P&L horizontal-tabs session on May 9.

import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq < 0) continue;
  const k = t.slice(0, eq).trim();
  let v = t.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const USER_ID = "SBSw80tO5R7S8O1jyjHOrHtfm666O85I";
const CLIENT_ID = "cli_eh003v9wka";   // STAFF AGENCY SRL
const SKILL_ID = "skl_1vhtn6isx2";    // Frontend Engineering
const PROJECT_NAME = "WHL Interface";
const ACTIVE_GAP_MS = 5 * 60 * 1000;
const TARGET_DIR = "C--Users-shado-Desktop-whl";  // exact match (no nested dirs)

const sql = neon(process.env.DATABASE_URL);

const PRICING = {
  "claude-opus-4-7": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
  "claude-opus-4-7[1m]": { in: 22.5, out: 112.5, cw: 28.125, cr: 2.25 },
  "claude-opus-4-6": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
  "claude-sonnet-4-6": { in: 3, out: 15, cw: 3.75, cr: 0.3 },
  "claude-sonnet-4-6[1m]": { in: 6, out: 22.5, cw: 7.5, cr: 0.6 },
  "claude-haiku-4-5": { in: 1, out: 5, cw: 1.25, cr: 0.1 },
};
function priceFor(m) {
  if (PRICING[m]) return PRICING[m];
  if (m?.includes("opus")) return PRICING["claude-opus-4-7"];
  if (m?.includes("sonnet")) return PRICING["claude-sonnet-4-6"];
  if (m?.includes("haiku")) return PRICING["claude-haiku-4-5"];
  return PRICING["claude-opus-4-7"];
}
function tokenCost(m, u) {
  const p = priceFor(m);
  return (Number(u.input_tokens ?? 0) * p.in + Number(u.output_tokens ?? 0) * p.out +
          Number(u.cache_creation_input_tokens ?? 0) * p.cw + Number(u.cache_read_input_tokens ?? 0) * p.cr) / 1_000_000;
}

function extractText(c) {
  if (typeof c === "string") return c.trim();
  if (!Array.isArray(c)) return "";
  return c.map((b) => (b && typeof b === "object" && typeof b.text === "string" ? b.text : "")).join(" ").replace(/\s+/g, " ").trim();
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
    let d; try { d = JSON.parse(line); } catch { continue; }
    if (d.type === "summary" && !summary && typeof d.summary === "string") summary = d.summary.trim() || undefined;
    if (d.type === "ai-title" && !aiTitle && typeof d.aiTitle === "string") aiTitle = d.aiTitle.trim() || undefined;
    if (d.cwd && !cwd) cwd = d.cwd;
    if (d.timestamp) {
      if (!firstTs || d.timestamp < firstTs) firstTs = d.timestamp;
      if (!lastTs || d.timestamp > lastTs) lastTs = d.timestamp;
      const t = Date.parse(d.timestamp);
      if (prevTs !== undefined) { const gap = t - prevTs; if (gap > 0 && gap < ACTIVE_GAP_MS) activeMs += gap; }
      prevTs = t;
    }
    if (d.type === "user") {
      userMsgs++;
      if (!firstUserPrompt && !d.isMeta) {
        const text = extractText(d.message?.content);
        if (text && !text.startsWith("<") && !text.startsWith("[Request interrupted")) firstUserPrompt = text;
      }
    }
    if (d.type === "assistant") {
      assistantMsgs++;
      const msg = d.message ?? {};
      const model = msg.model ?? "unknown";
      const u = msg.usage ?? {};
      const b = (modelTotals[model] ??= { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 });
      b.inputTokens += Number(u.input_tokens ?? 0);
      b.outputTokens += Number(u.output_tokens ?? 0);
      b.cacheWriteTokens += Number(u.cache_creation_input_tokens ?? 0);
      b.cacheReadTokens += Number(u.cache_read_input_tokens ?? 0);
      if (Array.isArray(msg.content)) for (const block of msg.content) {
        if (block?.type === "tool_use") { toolUses++; if (["Edit","Write","NotebookEdit"].includes(block.name)) fileEdits++; }
      }
    }
  }
  if (!firstTs || !lastTs) return null;
  let totalIn = 0, totalOut = 0, totalCw = 0, totalCr = 0, totalCost = 0, mainModel;
  for (const [m, mt] of Object.entries(modelTotals)) {
    if (!mainModel) mainModel = m;
    totalIn += mt.inputTokens; totalOut += mt.outputTokens;
    totalCw += mt.cacheWriteTokens; totalCr += mt.cacheReadTokens;
    totalCost += tokenCost(m, { input_tokens: mt.inputTokens, output_tokens: mt.outputTokens, cache_creation_input_tokens: mt.cacheWriteTokens, cache_read_input_tokens: mt.cacheReadTokens });
  }
  const wallSec = Math.round((Date.parse(lastTs) - Date.parse(firstTs)) / 1000);
  const sessionId = path.basename(filePath, ".jsonl");
  const rawLabel = (aiTitle ?? summary ?? firstUserPrompt ?? "").trim().replace(/\s+/g, " ");
  const title = !rawLabel ? `Claude Code session ${sessionId.slice(0, 8)}`
    : rawLabel.length > 100 ? rawLabel.slice(0, 97) + "..." : rawLabel;
  return {
    sessionId, cwd, title, startedAt: firstTs, endedAt: lastTs,
    wallSec, activeSec: Math.round(activeMs / 1000),
    userMsgs, assistantMsgs, toolUses, fileEdits,
    tokensIn: totalIn + totalCw, tokensOut: totalOut, cacheRead: totalCr,
    tokenCostUsd: Number(totalCost.toFixed(4)),
    model: mainModel ?? "claude-opus-4-7",
  };
}

const CATEGORY_PATTERNS = [
  ["bugfix", /\b(bug|fix|fixes|fixing|broken|crash|regress|regression|issue|hotfix|patch|repair|defect|error|errored|throws|throwing|fail|failing|failure|stack trace|exception|undefined|null pointer|nullref|race|deadlock|stale|leak|memory leak|off[- ]by[- ]one)\b/i],
  ["performance", /\b(perf|performance|slow|slower|fast|faster|speed up|optimi[sz]e|optimi[sz]ation|latency|throughput|cache|caching|throttle|debounce|memo|memoize|n\+1|index(ing)?( strategy)?|hot path|profiling|benchmark)\b/i],
  ["test", /\b(test|tests|testing|e2e|unit test|integration test|spec|specs|jest|vitest|mocha|playwright|cypress|coverage|snapshot|mock|stub|fixture)\b/i],
  ["docs", /\b(doc|docs|documentation|readme|changelog|release notes|comments?|jsdoc|tsdoc|guide|tutorial)\b/i],
  ["infra", /\b(deploy|deployment|ci|cd|ci\/cd|github actions|workflow|docker|dockerfile|kubernetes|k8s|terraform|infra|infrastructure|migration|migrations?|env|environment variable|secret|nginx|cloudflare|vercel|fly\.io|railway|aws|gcp|azure|monitoring|alerting|telemetry|datadog|sentry)\b/i],
  ["refactor", /\b(refactor|refactoring|restructure|restructuring|rename|renaming|cleanup|clean up|tidy|simplify|simplification|extract|inline|consolidat|deduplicat|reorgani[sz]e|reorgani[sz]ation|split (file|function|component)|merge (file|function|component)|reduce duplication|dry up)\b/i],
  ["research", /\b(research|investigate|investigation|explore|exploration|spike|prototype|prototyping|evaluate|comparison|compare options|trade[- ]offs?|feasibility|architecture (diagram|review)|design doc|adr)\b/i],
];
function classify(p) { const t = (p ?? "").trim(); if (!t) return "feature"; for (const [c, re] of CATEGORY_PATTERNS) if (re.test(t)) return c; return "feature"; }

function pct(sorted, v) {
  const n = sorted.length; if (!n) return 0.5;
  let lo = 0, hi = n;
  while (lo < hi) { const m = (lo + hi) >>> 1; if (sorted[m] < v) lo = m + 1; else hi = m; }
  let eq = 0; while (lo + eq < n && sorted[lo + eq] === v) eq++;
  return (lo + eq / 2) / n;
}
function diff(inputs, h) {
  const a = (arr) => [...arr].filter(Number.isFinite).sort((x, y) => x - y);
  const t = pct(a(h.totalTokens), inputs.totalTokens);
  const ac = pct(a(h.activeSec), inputs.activeSec);
  const e = pct(a(h.eventCount), inputs.eventCount);
  return Number(Math.max(0, Math.min(1, 0.4 * t + 0.4 * ac + 0.2 * e)).toFixed(3));
}
function genId(p) { return `${p}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`; }

const dir = path.join(homedir(), ".claude", "projects", TARGET_DIR);
const files = readdirSync(dir).filter((f) => f.endsWith(".jsonl")).map((f) => path.join(dir, f));
console.log(`${files.length} JSONLs in ${TARGET_DIR}`);

const [project] = await sql`SELECT id FROM project WHERE user_id=${USER_ID} AND client_id=${CLIENT_ID} AND name=${PROJECT_NAME} LIMIT 1`;
if (!project) { console.error("Project not found"); process.exit(1); }
const projectId = project.id;
const [client] = await sql`SELECT hourly_rate FROM client WHERE id=${CLIENT_ID}`;
const [skill] = await sql`SELECT rate_modifier FROM skill WHERE id=${SKILL_ID}`;
const rateUsd = Number(client.hourly_rate) * Number(skill.rate_modifier);

const histRows = await sql`SELECT tokens_in + tokens_out AS total_tokens, active_sec FROM run WHERE user_id=${USER_ID}`;
const history = {
  totalTokens: histRows.map((r) => Number(r.total_tokens)),
  activeSec: histRows.map((r) => Number(r.active_sec)),
  eventCount: histRows.map(() => 4),
};

let ok = 0, skipped = 0;
for (const f of files) {
  const s = parseSession(f);
  if (!s) { console.log(`  skip ${path.basename(f)}: no timestamps`); skipped++; continue; }
  if (s.activeSec < 60) { console.log(`  skip ${s.sessionId.slice(0,8)}: active=${s.activeSec}s under 60s`); skipped++; continue; }
  // Skip sessions whose first prompt is meta (clear, mcp setup)
  if (!s.title || s.title.startsWith("/clear") || /Claude Code session [a-f0-9]/.test(s.title)) {
    console.log(`  skip ${s.sessionId.slice(0,8)}: meta/empty (${s.title.slice(0,40)})`);
    skipped++;
    continue;
  }
  const tag = `session:${s.sessionId}`;
  await sql`DELETE FROM run WHERE user_id=${USER_ID} AND notes LIKE ${`%${tag}%`}`;
  const runId = genId("run");
  const tokensIn = s.tokensIn, tokensOut = s.tokensOut, cacheHits = s.cacheRead, cost = s.tokenCostUsd;
  const activeHours = s.activeSec / 3600;
  const billable = Number((activeHours * 1.5 * rateUsd).toFixed(2));  // recomputeBillable will re-multiply by effort
  const baselineHours = Number(activeHours.toFixed(3));
  const cat = classify(s.title);
  const dscore = diff({ totalTokens: tokensIn + tokensOut, activeSec: s.activeSec, eventCount: 4 }, history);
  const notes = `${tag} cwd:${s.cwd ?? "?"} model:${s.model}`;

  await sql`
    INSERT INTO run (
      id, user_id, client_id, project_id, skill_id, agent_name, status,
      prompt, cwd, pricing_mode,
      started_at, ended_at, runtime_sec, active_sec,
      tokens_in, tokens_out, cache_hits, cost_usd,
      baseline_hours, rate_usd, billable_usd, notes, unsorted,
      difficulty_score, change_category, kind
    )
    VALUES (
      ${runId}, ${USER_ID}, ${CLIENT_ID}, ${projectId}, ${SKILL_ID},
      ${"Claude Code"}, 'shipped', ${s.title}, ${s.cwd}, 'time_only',
      ${s.startedAt}, ${s.endedAt}, ${s.wallSec}, ${s.activeSec},
      ${tokensIn}, ${tokensOut}, ${cacheHits}, ${cost},
      ${baselineHours}, ${rateUsd}, ${billable}, ${notes}, false,
      ${dscore}, ${cat}, 'mcp'
    )
  `;
  const t0 = Date.parse(s.startedAt);
  const evs = [
    { ts: t0, kind: "milestone", label: `Session started · ${s.sessionId.slice(0, 8)}`, detail: s.cwd ?? null },
    { ts: t0 + Math.round(s.wallSec * 0.25) * 1000, kind: "tool_call", label: `${s.toolUses} tool calls · ${s.fileEdits} file edits`, detail: null },
    { ts: t0 + Math.round(s.wallSec * 0.6) * 1000, kind: "thought", label: `${s.userMsgs} user · ${s.assistantMsgs} assistant`, detail: null },
    { ts: Date.parse(s.endedAt), kind: "milestone", label: `Session ended · active ${Math.round(s.activeSec/60)} min`, detail: null },
  ];
  for (const e of evs) {
    await sql`INSERT INTO run_event (id, user_id, run_id, ts, kind, label, detail) VALUES (${genId("evt")}, ${USER_ID}, ${runId}, ${new Date(e.ts).toISOString()}, ${e.kind}, ${e.label}, ${e.detail})`;
  }
  console.log(`  ✓ ${runId}  ${cat.padEnd(10)} active=${Math.round(s.activeSec/60)}m  $${billable}  ${s.title.slice(0,60)}`);
  ok++;
}
console.log(`\nDone. inserted=${ok} skipped=${skipped}`);
