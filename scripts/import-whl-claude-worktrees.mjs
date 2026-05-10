// Import the 3 Claude Code whl-interface worktree sessions into Fulcru.
// Worktree paths look like:
//   ~/.claude/projects/C--Users-shado-Desktop-whl-whl-interface--claude-worktrees-<slug>/<sessionId>.jsonl
// They share the parent project's billing (STAFF AGENCY SRL / WHL Interface).

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
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}

const USER_ID = "SBSw80tO5R7S8O1jyjHOrHtfm666O85I";
const CLIENT_ID = "cli_eh003v9wka";   // STAFF AGENCY SRL
const SKILL_ID = "skl_1vhtn6isx2";    // Frontend Engineering
const PROJECT_NAME = "WHL Interface";  // existing project (matches user UI)
const ACTIVE_GAP_MS = 5 * 60 * 1000;

const sql = neon(process.env.DATABASE_URL);

const PRICING = {
  "claude-opus-4-7": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
  "claude-opus-4-7[1m]": { in: 22.5, out: 112.5, cw: 28.125, cr: 2.25 },
  "claude-opus-4-6": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
  "claude-sonnet-4-6": { in: 3, out: 15, cw: 3.75, cr: 0.3 },
  "claude-sonnet-4-6[1m]": { in: 6, out: 22.5, cw: 7.5, cr: 0.6 },
  "claude-haiku-4-5": { in: 1, out: 5, cw: 1.25, cr: 0.1 },
};

function priceFor(model) {
  if (PRICING[model]) return PRICING[model];
  if (model?.includes("opus")) return PRICING["claude-opus-4-7"];
  if (model?.includes("sonnet")) return PRICING["claude-sonnet-4-6"];
  if (model?.includes("haiku")) return PRICING["claude-haiku-4-5"];
  return PRICING["claude-opus-4-7"];
}

function tokenCost(model, u) {
  const p = priceFor(model);
  return (
    (Number(u.input_tokens ?? 0) * p.in +
      Number(u.output_tokens ?? 0) * p.out +
      Number(u.cache_creation_input_tokens ?? 0) * p.cw +
      Number(u.cache_read_input_tokens ?? 0) * p.cr) /
    1_000_000
  );
}

function extractText(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((b) => (b && typeof b === "object" && typeof b.text === "string" ? b.text : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseClaudeSession(filePath) {
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
      const bucket = (modelTotals[model] ??= {
        inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0,
      });
      bucket.inputTokens += Number(u.input_tokens ?? 0);
      bucket.outputTokens += Number(u.output_tokens ?? 0);
      bucket.cacheWriteTokens += Number(u.cache_creation_input_tokens ?? 0);
      bucket.cacheReadTokens += Number(u.cache_read_input_tokens ?? 0);
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block?.type === "tool_use") {
            toolUses++;
            if (["Edit", "Write", "NotebookEdit"].includes(block.name)) fileEdits++;
          }
        }
      }
    }
  }
  if (!firstTs || !lastTs) return null;

  let totalIn = 0, totalOut = 0, totalCw = 0, totalCr = 0, totalCost = 0;
  let mainModel;
  for (const [model, m] of Object.entries(modelTotals)) {
    if (!mainModel) mainModel = model;
    totalIn += m.inputTokens;
    totalOut += m.outputTokens;
    totalCw += m.cacheWriteTokens;
    totalCr += m.cacheReadTokens;
    totalCost += tokenCost(model, {
      input_tokens: m.inputTokens,
      output_tokens: m.outputTokens,
      cache_creation_input_tokens: m.cacheWriteTokens,
      cache_read_input_tokens: m.cacheReadTokens,
    });
  }

  const wallSec = Math.round((Date.parse(lastTs) - Date.parse(firstTs)) / 1000);
  const sessionId = path.basename(filePath, ".jsonl");
  const rawLabel = (aiTitle ?? summary ?? firstUserPrompt ?? "").trim().replace(/\s+/g, " ");
  const title = rawLabel.length === 0
    ? `Claude Code session ${sessionId.slice(0, 8)}`
    : rawLabel.length > 100 ? rawLabel.slice(0, 97) + "..." : rawLabel;

  return {
    sessionId,
    cwd,
    title,
    startedAt: firstTs,
    endedAt: lastTs,
    wallSec,
    activeSec: Math.round(activeMs / 1000),
    userMsgs,
    assistantMsgs,
    toolUses,
    fileEdits,
    tokensIn: totalIn + totalCw,  // matches importSessionAsRun convention
    tokensOut: totalOut,
    cacheRead: totalCr,
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
function classify(prompt) {
  const t = (prompt ?? "").trim();
  if (!t) return "feature";
  for (const [cat, re] of CATEGORY_PATTERNS) if (re.test(t)) return cat;
  return "feature";
}

function percentile(sorted, value) {
  const n = sorted.length;
  if (n === 0) return 0.5;
  let lo = 0, hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  const below = lo;
  let equal = 0;
  while (below + equal < n && sorted[below + equal] === value) equal++;
  return (below + equal / 2) / n;
}

function difficulty(inputs, history) {
  const a = (arr) => [...arr].filter(Number.isFinite).sort((x, y) => x - y);
  const tP = percentile(a(history.totalTokens), inputs.totalTokens);
  const aP = percentile(a(history.activeSec), inputs.activeSec);
  const eP = percentile(a(history.eventCount), inputs.eventCount);
  return Number(Math.max(0, Math.min(1, 0.4 * tP + 0.4 * aP + 0.2 * eP)).toFixed(3));
}

function genId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

const projectsRoot = path.join(homedir(), ".claude", "projects");
const dirs = readdirSync(projectsRoot, { withFileTypes: true })
  .filter((e) => e.isDirectory() && e.name.startsWith("C--Users-shado-Desktop-whl-whl-interface--claude-worktrees-"))
  .map((e) => path.join(projectsRoot, e.name));

console.log(`Found ${dirs.length} worktree dirs`);
const files = [];
for (const d of dirs) {
  for (const f of readdirSync(d)) {
    if (f.endsWith(".jsonl")) files.push(path.join(d, f));
  }
}
console.log(`${files.length} JSONL files`);

const [project] = await sql`
  SELECT id FROM project
  WHERE user_id = ${USER_ID} AND client_id = ${CLIENT_ID} AND name = ${PROJECT_NAME}
  LIMIT 1
`;
if (!project) {
  console.error(`Project '${PROJECT_NAME}' not found for client ${CLIENT_ID}`);
  process.exit(1);
}
const projectId = project.id;

const [client] = await sql`SELECT hourly_rate FROM client WHERE id = ${CLIENT_ID}`;
const [skill] = await sql`SELECT baseline_hours, rate_modifier FROM skill WHERE id = ${SKILL_ID}`;
const rateUsd = Number(client.hourly_rate) * Number(skill.rate_modifier);

const histRows = await sql`
  SELECT tokens_in + tokens_out AS total_tokens, active_sec
  FROM run WHERE user_id = ${USER_ID}
`;
const history = {
  totalTokens: histRows.map((r) => Number(r.total_tokens)),
  activeSec: histRows.map((r) => Number(r.active_sec)),
  eventCount: histRows.map(() => 4),
};

let ok = 0, skipped = 0;
for (const f of files) {
  const s = parseClaudeSession(f);
  if (!s) { console.log(`  skip ${path.basename(f)}: no timestamps`); skipped++; continue; }
  if (s.activeSec < 60) {
    console.log(`  skip ${s.sessionId.slice(0, 8)}: active=${s.activeSec}s under 60s`);
    skipped++;
    continue;
  }

  const sessionTag = `session:${s.sessionId}`;
  await sql`
    DELETE FROM run WHERE user_id = ${USER_ID} AND notes LIKE ${`%${sessionTag}%`}
  `;
  const runId = genId("run");
  const tokensIn = s.tokensIn;
  const tokensOut = s.tokensOut;
  const cacheHits = s.cacheRead;
  const costUsd = s.tokenCostUsd;
  const activeHours = s.activeSec / 3600;
  // Same time_only formula as recomputeBillable; recomputeBillable will
  // re-multiply by effortMultiplier on the next dashboard refresh anyway.
  const billable = Number((activeHours * 1.5 * rateUsd).toFixed(2));
  const baselineHours = Number(activeHours.toFixed(3));
  const promptForRun = s.title;
  const changeCategory = classify(promptForRun);
  const difficultyScore = difficulty(
    { totalTokens: tokensIn + tokensOut, activeSec: s.activeSec, eventCount: 4 },
    history,
  );
  const notes = `${sessionTag} cwd:${s.cwd ?? "?"} model:${s.model}`;

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
      ${runId}, ${USER_ID},
      ${CLIENT_ID}, ${projectId}, ${SKILL_ID},
      ${"Claude Code"}, 'shipped',
      ${promptForRun},
      ${s.cwd ?? "C:\\Users\\shado\\Desktop\\whl\\whl-interface"},
      ${"time_only"},
      ${s.startedAt}, ${s.endedAt}, ${s.wallSec}, ${s.activeSec},
      ${tokensIn}, ${tokensOut}, ${cacheHits}, ${costUsd},
      ${baselineHours}, ${rateUsd}, ${billable}, ${notes},
      false,
      ${difficultyScore}, ${changeCategory}, ${"mcp"}
    )
  `;

  const t0 = Date.parse(s.startedAt);
  const evs = [
    { ts: t0, kind: "milestone", label: `Session started · ${s.sessionId.slice(0, 8)}`, detail: s.cwd ?? null },
    { ts: t0 + Math.round(s.wallSec * 0.25) * 1000, kind: "tool_call", label: `${s.toolUses} tool calls · ${s.fileEdits} file edits`, detail: null },
    { ts: t0 + Math.round(s.wallSec * 0.6) * 1000, kind: "thought", label: `${s.userMsgs} user · ${s.assistantMsgs} assistant`, detail: null },
    { ts: Date.parse(s.endedAt), kind: "milestone", label: `Session ended · active ${Math.round(s.activeSec / 60)} min`, detail: null },
  ];
  for (const e of evs) {
    await sql`
      INSERT INTO run_event (id, user_id, run_id, ts, kind, label, detail)
      VALUES (${genId("evt")}, ${USER_ID}, ${runId}, ${new Date(e.ts).toISOString()}, ${e.kind}, ${e.label}, ${e.detail})
    `;
  }
  console.log(`  ✓ ${runId}  ${changeCategory.padEnd(10)} active=${Math.round(s.activeSec/60)}m  $${billable}  ${promptForRun.slice(0, 60)}`);
  ok++;
}

console.log(`\nDone. inserted=${ok} skipped=${skipped}`);
