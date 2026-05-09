// Backfill change_category and difficulty_score for runs that predate the
// scoring column. Mirrors the JS heuristic from lib/agency/scoring.ts.
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

const envText = readFileSync(".env.local", "utf8");
for (const line of envText.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = trimmed.indexOf("=");
  if (eq < 0) continue;
  const k = trimmed.slice(0, eq).trim();
  let v = trimmed.slice(eq + 1).trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  if (!process.env[k]) process.env[k] = v;
}

const sql = neon(process.env.DATABASE_URL);

const PATTERNS = [
  ["bugfix", /\b(bug|fix|fixes|fixing|broken|crash|crashes|regress|regression|issue|hotfix|patch|repair|defect|error|errored|throws|throwing|fail|failing|failure|stack trace|exception|undefined|null pointer|nullref|race|deadlock|stale|leak|memory leak|off[- ]by[- ]one)\b/i],
  ["performance", /\b(perf|performance|slow|slower|fast|faster|speed up|optimi[sz]e|optimi[sz]ation|latency|throughput|cache|caching|throttle|debounce|memo|memoize|n\+1|index(ing)?( strategy)?|hot path|profiling|benchmark)\b/i],
  ["test", /\b(test|tests|testing|e2e|unit test|integration test|spec|specs|jest|vitest|mocha|playwright|cypress|coverage|snapshot|mock|stub|fixture)\b/i],
  ["docs", /\b(doc|docs|documentation|readme|changelog|release notes|comments?|jsdoc|tsdoc|guide|tutorial)\b/i],
  ["infra", /\b(deploy|deployment|ci|cd|ci\/cd|github actions|workflow|docker|dockerfile|kubernetes|k8s|terraform|infra|infrastructure|migration|migrations?|env|environment variable|secret|nginx|cloudflare|vercel|fly\.io|railway|aws|gcp|azure|monitoring|alerting|telemetry|datadog|sentry)\b/i],
  ["refactor", /\b(refactor|refactoring|restructure|restructuring|rename|renaming|cleanup|clean up|tidy|simplify|simplification|extract|inline|consolidat|deduplicat|reorgani[sz]e|reorgani[sz]ation|split (file|function|component)|merge (file|function|component)|reduce duplication|dry up)\b/i],
  ["research", /\b(research|investigate|investigation|explore|exploration|spike|prototype|prototyping|evaluate|comparison|compare options|trade[- ]offs?|feasibility|architecture (diagram|review)|design doc|adr)\b/i],
];
const FEATURE_HINTS = /\b(add|adding|implement|implementing|create|creating|build|building|introduce|introducing|new (feature|page|route|endpoint|component|widget|screen|flow|integration)|support for|enable|wire up|hook up|integrate|redesign)\b/i;

function classify(prompt) {
  const t = (prompt ?? "").trim();
  if (!t) return "feature";
  for (const [cat, rx] of PATTERNS) {
    if (rx.test(t)) return cat;
  }
  if (FEATURE_HINTS.test(t)) return "feature";
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

function asc(arr) {
  return [...arr].filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
}

function difficulty(inputs, history) {
  const tokensSorted = asc(history.totalTokens);
  const activeSorted = asc(history.activeSec);
  const eventsSorted = asc(history.eventCount);
  const tokensP = percentileRank(tokensSorted, inputs.totalTokens);
  const activeP = percentileRank(activeSorted, inputs.activeSec);
  const eventsP = percentileRank(eventsSorted, inputs.eventCount);
  const score = Math.max(0, Math.min(1, 0.4 * tokensP + 0.4 * activeP + 0.2 * eventsP));
  return Number(score.toFixed(3));
}

const userId = process.argv[2];
if (!userId) {
  console.error("usage: node scripts/backfill-categories.mjs <userId>");
  process.exit(1);
}

const all = await sql`
  SELECT id, prompt,
         COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0) AS total_tokens,
         COALESCE(active_sec, 0) AS active_sec,
         COALESCE((SELECT COUNT(*) FROM run_event e WHERE e.run_id = r.id), 0) AS event_count,
         change_category, difficulty_score
  FROM run r
  WHERE user_id = ${userId} AND ended_at IS NOT NULL
  ORDER BY ended_at DESC
`;
const history = {
  totalTokens: all.map((r) => Number(r.total_tokens)),
  activeSec: all.map((r) => Number(r.active_sec)),
  eventCount: all.map((r) => Number(r.event_count)),
};

const targets = all.filter((r) => !r.change_category || r.difficulty_score === null);
console.log(`Backfilling ${targets.length} runs (out of ${all.length} total).`);

let updated = 0;
for (const r of targets) {
  const cat = r.change_category ?? classify(r.prompt);
  const score = r.difficulty_score === null
    ? difficulty(
        {
          totalTokens: Number(r.total_tokens),
          activeSec: Number(r.active_sec),
          eventCount: Number(r.event_count),
        },
        history,
      )
    : Number(r.difficulty_score);
  await sql`
    UPDATE run
    SET change_category = ${cat},
        difficulty_score = ${score}
    WHERE id = ${r.id}
  `;
  console.log(`  ${r.id}  ${cat.padEnd(12)}  diff=${score}  ${(r.prompt ?? "").slice(0, 70)}`);
  updated++;
}
console.log(`\nDone. ${updated} runs updated.`);
