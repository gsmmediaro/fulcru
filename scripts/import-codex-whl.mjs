// Import all Codex sessions for cwd = C:\Users\shado\Desktop\whl\whl-interface
// into Fulcru's STAFF AGENCY SRL client by writing directly to Neon. Mirrors
// importSessionAsRun in lib/agency/session-importer.ts.

import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

// ── Load .env.local ─────────────────────────────────────────────
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

const TARGET_CWD = "C:\\Users\\shado\\Desktop\\whl\\whl-interface";
const USER_ID = "SBSw80tO5R7S8O1jyjHOrHtfm666O85I";  // contact@dictando.ro
const CLIENT_ID = "cli_eh003v9wka";                    // STAFF AGENCY SRL
const SKILL_ID = "skl_1vhtn6isx2";                     // Frontend Engineering
const PROJECT_NAME = "whl-interface";
const ACTIVE_GAP_MS = 5 * 60 * 1000;

const sql = neon(process.env.DATABASE_URL);

// ── Pricing (mirrors lib/agency/pricing.ts) ─────────────────────
const PRICING = {
  "claude-opus-4-7": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
  "claude-opus-4-7[1m]": { in: 22.5, out: 112.5, cw: 28.125, cr: 2.25 },
  "claude-opus-4-6": { in: 15, out: 75, cw: 18.75, cr: 1.5 },
  "claude-sonnet-4-6": { in: 3, out: 15, cw: 3.75, cr: 0.3 },
  "claude-sonnet-4-6[1m]": { in: 6, out: 22.5, cw: 7.5, cr: 0.6 },
  "claude-haiku-4-5": { in: 1, out: 5, cw: 1.25, cr: 0.1 },
  "gpt-5.5": { in: 5, out: 30, cw: 0, cr: 0.5 },
  "gpt-5.4": { in: 2.5, out: 15, cw: 0, cr: 0.25 },
  "gpt-5.4-mini": { in: 0.75, out: 4.5, cw: 0, cr: 0.075 },
  "gpt-5.3-codex": { in: 2.5, out: 15, cw: 0, cr: 0.25 },
  "gpt-5.2": { in: 1.25, out: 10, cw: 0, cr: 0.125 },
  "gpt-5": { in: 1.25, out: 10, cw: 0, cr: 0.125 },
};

function priceFor(model) {
  if (!model) return PRICING["claude-opus-4-7"];
  if (PRICING[model]) return PRICING[model];
  const base = model.replace(/\[.*\]$/, "").replace(/-\d{8}$/, "");
  if (PRICING[base]) return PRICING[base];
  if (model.includes("opus")) return model.includes("[1m]") ? PRICING["claude-opus-4-7[1m]"] : PRICING["claude-opus-4-7"];
  if (model.includes("sonnet")) return model.includes("[1m]") ? PRICING["claude-sonnet-4-6[1m]"] : PRICING["claude-sonnet-4-6"];
  if (model.includes("haiku")) return PRICING["claude-haiku-4-5"];
  if (model.includes("gpt-5.5")) return PRICING["gpt-5.5"];
  if (model.includes("gpt-5.4-mini")) return PRICING["gpt-5.4-mini"];
  if (model.includes("gpt-5.4") || model.includes("gpt-5.3-codex")) return PRICING["gpt-5.4"];
  if (model.includes("gpt-5.2") || model.includes("gpt-5")) return PRICING["gpt-5.2"];
  return PRICING["claude-opus-4-7"];
}

function tokenCostUsd(model, usage) {
  const p = priceFor(model);
  return (
    ((usage.input_tokens ?? 0) * p.in +
      (usage.output_tokens ?? 0) * p.out +
      (usage.cache_creation_input_tokens ?? 0) * p.cw +
      (usage.cache_read_input_tokens ?? 0) * p.cr) /
    1_000_000
  );
}

// ── Codex parser (mirrors lib/agency/codex-session-importer.ts) ─
function walk(dir) {
  const out = [];
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full));
    else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

function readCodexIndex() {
  const indexPath = path.join(homedir(), ".codex", "session_index.jsonl");
  const map = new Map();
  let raw;
  try { raw = readFileSync(indexPath, "utf-8"); } catch { return map; }
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      if (typeof data.id === "string" && typeof data.thread_name === "string") {
        map.set(data.id, data.thread_name);
      }
    } catch {}
  }
  return map;
}

function extractSessionId(filePath) {
  const base = path.basename(filePath, ".jsonl");
  const m = base.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i);
  return m?.[1] ?? base;
}

function extractText(content) {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((p) => (p && typeof p === "object" && typeof p.text === "string" ? p.text : ""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseCodexSession(filePath) {
  const titleById = readCodexIndex();
  const raw = readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  let sessionId = extractSessionId(filePath);
  let cwd, model = "codex-session";
  let firstTs, lastTs, prevTs, activeMs = 0;
  let userMsgs = 0, assistantMsgs = 0, toolUses = 0, fileEdits = 0;
  let firstUserPrompt, lastUsage;

  for (const line of lines) {
    let d;
    try { d = JSON.parse(line); } catch { continue; }
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
        const text = extractText(payload.content);
        if (text && !text.startsWith("# AGENTS.md instructions")) firstUserPrompt = text;
      }
    }
    if (payload.type === "agent_message") assistantMsgs++;
    if (payload.type === "function_call") {
      toolUses++;
      const name = typeof payload.name === "string" ? payload.name : "";
      const args = typeof payload.arguments === "string" ? payload.arguments : "";
      if (name === "apply_patch" || args.includes("apply_patch") ||
          /\b(Set-Content|Add-Content|Out-File|New-Item|Move-Item|Remove-Item)\b/i.test(args)) {
        fileEdits++;
      }
    }
    if (payload.type === "token_count") {
      const info = payload.info;
      if (info?.total_token_usage) lastUsage = info.total_token_usage;
    }
  }

  if (!firstTs || !lastTs) return null;

  const inputTotal = Number(lastUsage?.input_tokens ?? 0);
  const cachedInput = Number(lastUsage?.cached_input_tokens ?? 0);
  const tokensIn = Math.max(0, inputTotal - cachedInput);
  const tokensOut = Number(lastUsage?.output_tokens ?? 0) + Number(lastUsage?.reasoning_output_tokens ?? 0);
  const cacheRead = cachedInput;
  const tokenCost = tokenCostUsd(model, {
    input_tokens: tokensIn,
    output_tokens: tokensOut,
    cache_read_input_tokens: cacheRead,
  });

  const wallSec = Math.max(0, Math.round((Date.parse(lastTs) - Date.parse(firstTs)) / 1000));
  const aiTitle = titleById.get(sessionId);

  return {
    sessionId, filePath, cwd, model,
    startedAt: firstTs, endedAt: lastTs,
    wallSec, activeSec: Math.round(activeMs / 1000),
    userMsgs, assistantMsgs, toolUses, fileEdits,
    tokensIn, tokensOut, cacheWrite: 0, cacheRead,
    tokenCostUsd: Number(tokenCost.toFixed(4)),
    aiTitle, firstUserPrompt,
  };
}

// ── Difficulty + classify (mirrors scoring.ts) ──────────────────
const CATEGORY_PATTERNS = [
  ["bugfix", /\b(bug|fix|fixes|fixing|broken|crash|crashes|regress|regression|issue|hotfix|patch|repair|defect|error|errored|throws|throwing|fail|failing|failure|stack trace|exception|undefined|null pointer|nullref|race|deadlock|stale|leak|memory leak|off[- ]by[- ]one)\b/i],
  ["performance", /\b(perf|performance|slow|slower|fast|faster|speed up|optimi[sz]e|optimi[sz]ation|latency|throughput|cache|caching|throttle|debounce|memo|memoize|n\+1|index(ing)?( strategy)?|hot path|profiling|benchmark)\b/i],
  ["test", /\b(test|tests|testing|e2e|unit test|integration test|spec|specs|jest|vitest|mocha|playwright|cypress|coverage|snapshot|mock|stub|fixture)\b/i],
  ["docs", /\b(doc|docs|documentation|readme|changelog|release notes|comments?|jsdoc|tsdoc|guide|tutorial)\b/i],
  ["infra", /\b(deploy|deployment|ci|cd|ci\/cd|github actions|workflow|docker|dockerfile|kubernetes|k8s|terraform|infra|infrastructure|migration|migrations?|env|environment variable|secret|nginx|cloudflare|vercel|fly\.io|railway|aws|gcp|azure|monitoring|alerting|telemetry|datadog|sentry)\b/i],
  ["refactor", /\b(refactor|refactoring|restructure|restructuring|rename|renaming|cleanup|clean up|tidy|simplify|simplification|extract|inline|consolidat|deduplicat|reorgani[sz]e|reorgani[sz]ation|split (file|function|component)|merge (file|function|component)|reduce duplication|dry up)\b/i],
  ["research", /\b(research|investigate|investigation|explore|exploration|spike|prototype|prototyping|evaluate|comparison|compare options|trade[- ]offs?|feasibility|architecture (diagram|review)|design doc|adr)\b/i],
];

function classifyChangeCategory(prompt) {
  const t = (prompt ?? "").trim();
  if (!t) return "feature";
  for (const [cat, re] of CATEGORY_PATTERNS) if (re.test(t)) return cat;
  return "feature";
}

function percentileRank(sorted, value) {
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

function computeDifficulty(inputs, history) {
  const a = (arr) => [...arr].filter(Number.isFinite).sort((x, y) => x - y);
  const tP = percentileRank(a(history.totalTokens), inputs.totalTokens);
  const aP = percentileRank(a(history.activeSec), inputs.activeSec);
  const eP = percentileRank(a(history.eventCount), inputs.eventCount);
  const score = Math.max(0, Math.min(1, 0.4 * tP + 0.4 * aP + 0.2 * eP));
  return Number(score.toFixed(3));
}

function deriveSessionLabel(s) {
  const raw = (s.aiTitle ?? s.firstUserPrompt ?? "").trim().replace(/\s+/g, " ");
  const sid = (s.sessionId || "").slice(0, 8);
  if (!raw) return `Codex session ${sid}`;
  return raw.length > 100 ? raw.slice(0, 97) + "..." : raw;
}

function genId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

// ── Main ────────────────────────────────────────────────────────
async function main() {
  // Find or create the whl-interface project under STAFF AGENCY SRL.
  const existing = await sql`
    SELECT id FROM project
    WHERE user_id = ${USER_ID}
      AND client_id = ${CLIENT_ID}
      AND lower(name) = lower(${PROJECT_NAME})
    LIMIT 1
  `;
  let projectId;
  if (existing.length > 0) {
    projectId = existing[0].id;
    console.log(`Using existing project ${projectId} (${PROJECT_NAME})`);
  } else {
    projectId = genId("prj");
    await sql`
      INSERT INTO project (id, user_id, client_id, name)
      VALUES (${projectId}, ${USER_ID}, ${CLIENT_ID}, ${PROJECT_NAME})
    `;
    console.log(`Created project ${projectId} (${PROJECT_NAME}) under STAFF AGENCY SRL`);
  }

  // Lookup client + skill for pricing.
  const [client] = await sql`SELECT hourly_rate FROM client WHERE id = ${CLIENT_ID}`;
  const [skill] = await sql`SELECT baseline_hours, rate_modifier FROM skill WHERE id = ${SKILL_ID}`;
  const rateUsd = Number(client.hourly_rate) * Number(skill.rate_modifier);
  console.log(`rate = $${rateUsd}/h, baseline_hours = ${skill.baseline_hours}`);

  // Pull difficulty history from prior runs of this user.
  const histRows = await sql`
    SELECT tokens_in + tokens_out AS total_tokens, active_sec
    FROM run WHERE user_id = ${USER_ID}
  `;
  const history = {
    totalTokens: histRows.map((r) => Number(r.total_tokens)),
    activeSec: histRows.map((r) => Number(r.active_sec)),
    eventCount: histRows.map(() => 4),
  };

  // Walk Codex sessions, filter by cwd.
  const root = path.join(homedir(), ".codex", "sessions");
  const files = walk(root);
  const targetNorm = path.resolve(TARGET_CWD).toLowerCase();
  const matched = [];
  for (const f of files) {
    const stats = parseCodexSession(f);
    if (!stats || !stats.cwd) continue;
    if (path.resolve(stats.cwd).toLowerCase() === targetNorm) matched.push(stats);
  }
  console.log(`${matched.length} Codex sessions match cwd=${TARGET_CWD}`);

  let ok = 0, skipped = 0;
  for (const s of matched) {
    if (s.activeSec < 60) {
      console.log(`  skip ${s.sessionId.slice(0, 8)} active=${s.activeSec}s under 60s`);
      skipped++;
      continue;
    }
    const sessionTag = `session:${s.sessionId}`;
    await sql`
      DELETE FROM run
      WHERE user_id = ${USER_ID}
        AND notes LIKE ${`%${sessionTag}%`}
    `;
    const runId = genId("run");
    const tokensIn = s.tokensIn + s.cacheWrite;
    const tokensOut = s.tokensOut;
    const cacheHits = s.cacheRead;
    const costUsd = s.tokenCostUsd;
    const activeHours = s.activeSec / 3600;
    const billable = Number((activeHours * rateUsd + costUsd).toFixed(2));
    const baselineHours = Number(activeHours.toFixed(3));
    const promptForRun = deriveSessionLabel(s);
    const changeCategory = classifyChangeCategory(promptForRun);
    const difficultyScore = computeDifficulty(
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
        ${"codex"}, 'shipped',
        ${promptForRun},
        ${s.cwd}, ${"time_plus_tokens"},
        ${s.startedAt}, ${s.endedAt}, ${s.wallSec}, ${s.activeSec},
        ${tokensIn}, ${tokensOut}, ${cacheHits}, ${costUsd},
        ${baselineHours}, ${rateUsd}, ${billable}, ${notes},
        false,
        ${difficultyScore}, ${changeCategory}, ${"mcp"}
      )
    `;

    // Synthetic events (same shape as importSessionAsRun).
    const t0 = Date.parse(s.startedAt);
    const evs = [
      { ts: t0,                                kind: "milestone", label: `Session started · ${s.sessionId.slice(0, 8)}`,                  detail: s.cwd ?? null },
      { ts: t0 + Math.round(s.wallSec * 0.25) * 1000, kind: "tool_call", label: `${s.toolUses} tool calls · ${s.fileEdits} file edits`,    detail: null },
      { ts: t0 + Math.round(s.wallSec * 0.6) * 1000,  kind: "thought",   label: `${s.userMsgs} user · ${s.assistantMsgs} assistant`,        detail: null },
      { ts: Date.parse(s.endedAt),             kind: "milestone", label: `Session ended · active ${Math.round(s.activeSec / 60)} min`,    detail: null },
    ];
    for (const e of evs) {
      const id = genId("evt");
      const ts = new Date(e.ts).toISOString();
      await sql`
        INSERT INTO run_event (id, user_id, run_id, ts, kind, label, detail)
        VALUES (${id}, ${USER_ID}, ${runId}, ${ts}, ${e.kind}, ${e.label}, ${e.detail})
      `;
    }

    console.log(
      `  ✓ ${runId}  ${changeCategory.padEnd(11)} diff=${difficultyScore}  active=${Math.round(s.activeSec / 60)}m  $${billable}  ${promptForRun.slice(0, 60)}`,
    );
    ok++;
  }
  console.log(`\nDone. inserted=${ok} skipped=${skipped}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
